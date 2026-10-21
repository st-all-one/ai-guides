# 08 — Criptografia, SSE e KMS

## Modos de SSE

| Modo | Header | Chave | Uso |
|---|---|---|---|
| SSE-S3 | `x-amz-server-side-encryption: AES256` | Master key local ou KMS service key | Criptografia gerenciada pelo servidor |
| SSE-KMS | `x-amz-server-side-encryption: aws:kms` (+ key id opcional) | KMS backend | Chave gerenciada externamente |
| SSE-C | headers `x-amz-server-side-encryption-customer-*` | Cliente envia a chave por request | Cliente é dono da chave |
| Default do bucket | `PutBucketEncryption` | SSE-S3 ou SSE-KMS | Aplica a escritas sem header |

Regras:
- SSE-C explícito **suprime** o default do bucket (PUT, POST, COPY).
- SSE-S3 explícito em bucket default KMS **não** herda key id.
- `KMSMasterKeyID` só é válido em regra `aws:kms`.
- Config inválida é rejeitada na gravação, não "corrigida" silenciosamente.
- SSE-C exige TLS quando `RUSTFS_SSE_C_REQUIRE_TLS=true`; copy-source SSE-C
  também conta.
- O contexto de criptografia KMS inclui a localização do objeto; um contexto do
  cliente não pode substituir a entrada de bucket/localização.

## Sem KMS: SSE-S3 com master key local

```bash
RUSTFS_SSE_S3_MASTER_KEY='<base64 de 32 bytes>'
```

- Data keys são wrapped com AES-256-GCM por essa chave, no nó que serve a
  escrita.
- A chave é todo o boundary de confidencialidade: vive no ambiente de cada nó,
  sem ACL, audit ou policy.
- **Não há rotação**: trocar o valor torna ilegíveis todos os objetos escritos
  com o valor antigo. Migrar para KMS exige reescrever os objetos
  (CopyObject), não apenas reconfigurar.
- Não atende SSE-KMS: `aws:kms` sem KMS retorna `400 InvalidRequest` (nunca
  configurado) ou `503` (configurado e parado).

## Backends KMS

| Backend | Tag | Material | Rotação | Uso |
|---|---|---|---|---|
| Local | `Local` | Arquivos em `key_dir`, cifrados pela master key local | Recusada | Dev/teste |
| Static | `Static` | Fornecido fora da banda; não persistido | Recusada | Dev/teste |
| Vault KV2 | `VaultKV2` (alias `Vault`) | Base64 plaintext no Vault KV2 | Sim, versionada | Quando ACL do Vault é o boundary |
| Vault Transit | `VaultTransit` | KEK nunca sai do Vault | Delegada ao Transit | Quando material não pode ser legível pela API de storage |
| AWS KMS | `AWS` (alias `AwsKms`) | Material nunca sai do AWS KMS | `RotateKeyOnDemand` / auto-rotation | Deployments AWS-native |

### Configuração

```bash
RUSTFS_KMS_ENABLE=true
RUSTFS_KMS_BACKEND=VaultTransit
RUSTFS_KMS_VAULT_ADDRESS=https://vault.example.com
RUSTFS_KMS_VAULT_TOKEN_FILE=/run/secrets/vault-token
RUSTFS_KMS_VAULT_MOUNT_PATH=transit
RUSTFS_KMS_DEFAULT_KEY_ID=rustfs-default
```

Vault também suporta AppRole e Kubernetes auth:

```bash
RUSTFS_KMS_VAULT_APPROLE_ROLE_ID=...
RUSTFS_KMS_VAULT_APPROLE_SECRET_ID_FILE=...
# ou
RUSTFS_KMS_VAULT_KUBERNETES_ROLE=rustfs
RUSTFS_KMS_VAULT_KUBERNETES_JWT_PATH=/var/run/secrets/kubernetes.io/serviceaccount/token
```

TLS do Vault:

| Setting | Env |
|---|---|
| CA bundle | `RUSTFS_KMS_VAULT_CA_CERT` |
| Client cert | `RUSTFS_KMS_VAULT_CLIENT_CERT` |
| Client key | `RUSTFS_KMS_VAULT_CLIENT_KEY` |
| Skip verify | `RUSTFS_KMS_VAULT_SKIP_TLS_VERIFY` (gated por dev defaults) |

### Vault KV2

- RustFS usa o Vault apenas como **storage seguro**: a master key é gerada pelo
  RustFS e gravada como Base64 no KV2.
- O backend **não** chama o Transit; `mount_path` é legado/ignorado no KV2.
- Quem pode `read` o path do KV2 pode recuperar a master key e decifrar tudo.
  Se isso não é aceitável, use Transit.
- Policy mínima:

```hcl
path "secret/data/rustfs/kms/keys/*" {
  capabilities = ["create", "read", "update"]
}
path "secret/metadata/rustfs/kms/keys/*" {
  capabilities = ["list", "read", "delete"]
}
```

`delete` só é necessário para deleção física; deixe
`RUSTFS_KMS_ALLOW_IMMEDIATE_DELETION=false` para tornar a capability
inalcançável.

### AWS KMS

- Key material e operações ficam no AWS KMS.
- `Decrypt` com chave `Disabled`/`PendingDeletion` é **recusado** pelo AWS:
  objetos ficam ilegíveis até reabilitar.
- Não há delete físico; `ScheduleKeyDeletion` (7–30 dias).
- Cancelar deletion deixa a chave `Disabled`; reabilite explicitamente.
- Nomes/aliases são gerenciados pelo AWS; RustFS não cria aliases.
- Use auto-rotation do AWS; **não** agende rotação pelo endpoint RustFS (há quota
  de rotações on-demand).

## Admin API de KMS

Prefixo: `/rustfs/admin/v3/kms/*` (alguns aliases legados).

| Endpoint | Ação IAM | Risco |
|---|---|---|
| `POST /kms/configure`, `/reconfigure` | `kms:Configure` | alto |
| `POST /kms/start`, `/stop`, `/reload` | `kms:ServiceControl` | alto |
| `GET /kms/status`, `/service-status`, `/config` | `kms:ServiceControl`/`Configure` | sensível |
| `POST /kms/clear-cache` | `kms:ClearCache` | alto |
| `POST /kms/keys`, aliases `create-key` | `kms:Configure` | alto |
| `GET /kms/keys`, `/kms/keys/{id}` | `kms:ListKeys`/`DescribeKey` | sensível |
| `POST /kms/keys/rotate`, `/rekey` | `kms:RotateKey`/`Rekey` | alto |
| `POST /kms/keys/enable`, `/disable`, `/delete`, `/cancel-deletion` | lifecycle | alto |
| `POST /kms/generate-data-key` | `kms:GenerateDataKey` | alto; nunca exiba o plaintext |
| `GET/POST /kms/backup`, `/restore`, `/restore/dry-run`, `/restore/abort` | `kms:Backup`/`Restore` | alto |

- Nomes de chave em Local/Vault: um único segmento, sem `/`, `\`, NUL, `.` ou
  `..`. AWS aceita ARNs/aliases.
- `force_immediate` exige `confirm_key_id` e
  `RUSTFS_KMS_ALLOW_IMMEDIATE_DELETION=true`.
- `POST /kms/restore` exige `confirm_backup_id` e `confirm_conflict_policy`;
  `abort` exige `confirm_target_key_dir`.

## Enforcement por key e DR

- `RUSTFS_KMS_ENFORCE_SSE_KEY_POLICY=false` por default. Com `true`, leitura
  SSE-KMS exige `kms:Decrypt` e escrita exige `kms:GenerateDataKey` na **key
  resolvida** (header ou default do bucket), avaliados contra a identidade.
- SSE-S3/SSE-C e trabalho interno (replicação, lifecycle, heal, scanner) são
  isentos. Multipart autoriza na criação; CopyObject checa origem e destino.
- Requisição anônima de objeto SSE-KMS é negada. Bucket público + SSE-KMS é
  incompatível com enforcement; sirva público em SSE-S3/plaintext.
- Ative primeiro as policies (`KMSKeyUser` ou cópia narrow), depois um nó, depois
  a frota. `AccessDenied` após ativar indica grant faltando na key do audit.

Backup/DR:
- Só o backend **Local** produz bundle completo via
  `POST /rustfs/admin/v3/kms/backup`; restore usa
  `/restore/dry-run`, `/restore`, `/restore/abort` e exige `confirm_*`.
- Static/Vault/AWS: o material não é exportável; restaure o backend no mecanismo
  nativo (Vault snapshot/AWS) e rode o preflight do RustFS antes de publicar.
- Drills: `cargo run -p rustfs-kms --example kms_dr_drill`; a aceitação é
  decifrar objetos históricos após o restore, não apenas recuperar arquivos.
- Em restore, coloque o diretório danificado em quarentena; não apague. O
  commit marker torna a operação roll-forward/rollback, nunca meio-termo.
- RPO = idade do último bundle; RTO = quarentena + preflight + restore +
  verificação. Registre e arquive `evidence.json`.

## Rotação

| Backend | Quem rotaciona | Agendamento |
|---|---|---|
| Local / Static | Ninguém; endpoint recusa | Migre para backend rotativo |
| Vault KV2 | RustFS (version record imutável + pointer CAS) | **Um** scheduler externo chamando o endpoint |
| Vault Transit | Vault (`auto_rotate_period`) | Não dirija também pelo RustFS |
| AWS KMS | AWS (auto-rotation / on-demand) | Use auto-rotation; endpoint só para incidentes |

Prontidão de rotação:

| Setting | Efeito |
|---|---|
| `RUSTFS_KMS_ROTATION_MAX_AGE_SECS` | Reporta `rotation_due` por idade; sem default de compliance |
| `RUSTFS_KMS_ROTATION_MAX_WRAPS` | Reporta `rotation_due` por wraps; default 1.000.000 |

`rotation_due` é **relatório**, não ação automática.

Bulk rekey (`POST /kms/keys/rekey`, `/status`, `/cancel`, `kms:Rekey`) só
re-embrulha envelopes; não reescreve corpos, ETag ou partes. É um job por
processo, sem dry-run/pause, com contadores locais; Vault KV2/Transit suportam,
Local/Static/AWS retornam `501`. Mantenha versões antigas decifráveis até o fim
e trate cancelamento como terminal (re-run varre o que falta).

KV2 mantém versões históricas em `{prefix}/{key_id}/versions/{N}` (create-only,
CAS 0). A rotação só move o ponteiro depois de persistir a versão. Destruição
requer preconditions; leia o `impact` report antes.

## Envelope de DEK e ETags

- Objetos usam DEK por objeto, wrapped pela master key/KEK.
- Envelope JSON versionado; campos desconhecidos são ignorados e contados.
- `master_key_version` é opcional; envelopes antigos resolvem para a versão
  baseline ou atual.
- Escritas cifradas novas usam **ETag fingerprint** (32 hex), estável para o
  objeto armazenado. Multipart mantém o formato digest-partcount.
- `ListObjects*` pode omitir ETag de objetos cifrados antigos/sem marker de
  formato; use `HeadObject` autenticado.
- Replicação de origem cifrada não compara ETag de destino (o target re-cifra ou
  o ETag não é MD5); falhas de transformação podem não ser detectadas em
  managed-SSE.
- SSE-C passthrough mantém o ciphertext e exige evidência do target.

## Falhas e mapeamento S3

| Condição | Status |
|---|---|
| Chave inexistente | `400 KMS.NotFoundException` |
| Chave desabilitada / context mismatch / algoritmo inválido | `400` |
| Grant negado | `403 AccessDenied` |
| Backend indisponível / transitório | `503` |
| Capability ausente do backend | `501 NotImplemented` |
| KMS configurado mas parado | `503` |
| KMS nunca configurado | `400 InvalidRequest` |

Nunca há fallback silencioso para plaintext.

## MinIO e migração

- Build padrão falha fechado em SSE-S3/KMS/C do MinIO; listagem e HEAD funcionam,
  GET retorna `InvalidObjectState`.
- `rio-v2` lê SSE-S3/KMS do MinIO com `RUSTFS_SSE_S3_MASTER_KEY` igual à chave
  estática do MinIO, e SSE-C com a chave do cliente.
- KES/KMS plugin/MinKMS do MinIO não são suportados por nenhum build.
- Direção reversa (MinIO lendo SSE RustFS) não é suportada.
- Configure KMS **antes** de migrar; configurar `Static` com o material do MinIO
  não torna objetos legíveis.

## Compliance

- RustFS **não** é FIPS 140-3 validado.
- TLS usa `rustls` + `aws-lc-rs` (não a variante FIPS); data path usa RustCrypto
  AES-256-GCM/ChaCha20-Poly1305; KDF Argon2id/PBKDF2.
- `rustfs-crypto` tem feature `fips`, mas ela muda o ID/KDF (PBKDF2 em vez de
  Argon2id), não torna o processo FIPS-validado.
- Para custódia de chave validada, a rota realista é Vault Transit sobre
  HSM/seal validado; o data path continua não validado.

## Checklist

- [ ] KMS configurado e saudável antes de aceitar SSE-KMS.
- [ ] Backend de produção: Vault Transit ou AWS KMS; Local/Static só dev.
- [ ] `RUSTFS_KMS_DEFAULT_KEY_ID` definido.
- [ ] Rotação com **um** owner (RustFS ou Vault/AWS, não ambos).
- [ ] Backup/restore KMS testado (dry-run + restore real em lab).
- [ ] TLS no Vault; sem `skip_verify`.
- [ ] Policies por key (`KMSKeyUser` para workloads, `KMSAuditor` para revisão).
- [ ] Alertas em `rustfs_kms_backend_circuit_open`,
      `rustfs_kms_probe_failures_total`, `rustfs_kms_pending_deletion_keys`.
- [ ] Revisar impacto de ETag fingerprint em clientes/listings.

## Fonte

`docs/operations/kms-backend-security.md`;
`docs/operations/kms-admin-contract.md`;
`docs/operations/kms-cryptographic-compliance.md`;
`docs/operations/kms-per-key-authorization.md`;
`docs/operations/kms-observability-runbook.md`;
`docs/operations/kms-disaster-recovery-drill.md`;
`docs/architecture/kms-bulk-rekey-contract.md`;
`docs/operations/encrypted-etags.md`;
`docs/operations/vault-kms-authentication.md`;
`docs/architecture/minio-file-format-compat.md`.
