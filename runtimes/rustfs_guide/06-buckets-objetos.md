# 06 — Buckets, objetos, versioning, lock, lifecycle e quotas

## Buckets

- Namespace plano; nomes seguem S3 (DNS-compatible quando usado em
  virtual-host).
- Bucket é a unidade de policy, quota, versioning, Object Lock, lifecycle,
  replicação, notificação e encryption default.
- Metadata do bucket fica em `.rustfs.sys/buckets/<bucket>/.metadata.bin`
  (formato compatível com MinIO; campos RustFS extras são ignorados por leitores
  MinIO).
- Criação/remoção concorrente tem admissão própria; não presuma que um delete
  concorrente com PUT é linearizável fora do contrato S3.

## Objetos e keys

- Key é caminho relativo sob o bucket, com no máximo 255 bytes por segmento.
- Segmentos vazios (`a//b`), `.` e `..` são rejeitados com `400 InvalidArgument`.
- Key terminando em `/` é **directory marker**; em bucket versionado é armazenado
  como versão `null` e um PUT posterior sobrescreve, em vez de criar histórico.
- Metadados de usuário (`x-amz-meta-*`) são preservados; o listing com
  `metadata=true` (extensão MinIO) devolve nomes sem o prefixo HTTP.
- Objetos pequenos podem ser inline; o limite é por shard, não por objeto.

## Multipart upload

| Item | Regra |
|---|---|
| Partes | 1..10.000 |
| Tamanho | 5 MiB..5 GiB por parte (última pode ser menor) |
| Objeto final | até 5 TiB |
| Complete | revalida metadata e quorum; parte enviada ≠ objeto confirmado |
| Abort | libera partes; recomende lifecycle `AbortIncompleteMultipartUpload` |
| Checksums | suportados por parte e no complete |
| Cópia | `UploadPartCopy` suportado com limites S3 |

Replicação e tiering escolhem o transporte pela **forma** do objeto (ETag com
sufixo `-N` = multipart), não pelo tamanho. Não há re-chunk no destino.

## Versioning

- `PutBucketVersioning` com `Enabled` / `Suspended`.
- Versões têm `VersionId` opaco; delete cria delete marker.
- `RUSTFS_API_OBJECT_MAX_VERSIONS` limita versões por objeto (default ilimitado).
- Directory markers em bucket versionado usam a versão `null`.
- Objetos cifrados novos expõem ETag fingerprint; versões antigas podem não
  expor ETag em listing.
- Versionamento é pré-requisito para Object Lock e para replicação com fidelidade
  de versões.
- **Undo atômico** (extensão RustFS): `x-rustfs-expected-current-version-id`
  em `CopyObject` do mesmo objeto a partir de versão histórica, ou em `DELETE`
  version-specific do delete marker. Só aplica se a versão ainda for a current;
  caso contrário `412 PreconditionFailed`, sem criar versão. Header vazio/malformado
  → `400 InvalidArgument`; operação incompatível → `400 InvalidRequest`.
  Não contorna Object Lock, policy nem replicação.

## Object Lock (WORM)

- Requer bucket versionado e habilitação **na criação** (não pode ser alterada
  depois).
- Modos: `GOVERNANCE` e `COMPLIANCE`; retenção por data; legal hold independente.
- `COMPLIANCE` não pode ser encurtado nem removido antes do vencimento, nem pelo
  root.
- `GOVERNANCE` pode ser contornado com permissão `s3:BypassGovernanceRetention`.
- Delete de versão retida falha; delete marker pode ser criado conforme política.
- Replicação propaga modo, `RetainUntilDate` e legal hold; targets precisam
  suportar as APIs correspondentes.
- Objetos retidos continuam legíveis; a proteção é contra delete/overwrite.
- Contenção de lock pode causar timeouts de aquisição; diagnostique com
  `RUSTFS_OBJECT_LOCK_DIAG_ENABLE` e os eventos de lock.

## Lifecycle / ILM

Estrutura S3 `PutBucketLifecycleConfiguration` com regras por prefixo/tag/tamanho.

Regras específicas do RustFS:
- Cada regra suporta **no máximo um `Transition` e um
  `NoncurrentVersionTransition`**. Arrays com múltiplas entradas são rejeitados
  com `InvalidArgument`, inclusive em regras desabilitadas.
- **Não há chaining de tiers**: uma versão faz uma transição inicial; depois de
  `complete`, não transita para outro tier.
- `Expiration.Days` e `Expiration.Date` são mutuamente exclusivos.
- Se expiração e transição são elegíveis, **expiração vence**.
- `NewerNoncurrentVersions` é independente para expiração e transição.
- Transição com contagem positiva pode ser adiada para o scanner, que avalia o
  grupo completo de versões.
- Cleanup de cópia local restaurada exige transição completa e replicação
  pendente resolvida; headers de restore sozinhos não autorizam cleanup.
- Lifecycle de bucket de tabela (S3 Tables) é desabilitado; manutenção é feita
  pelo catálogo.
- Regras de `AbortIncompleteMultipartUpload` são recomendadas para limpar partes
  órfãs.

Ações suportadas: expiração de current/noncurrent, delete marker expiration,
transition para tier remoto, abort de multipart. Objetos transicionados são
lidos por read-through e restaurados sob demanda.

## Quotas

- Apenas quota **HARD** é suportada (`QUOTA_TYPE_HARD`).
- Armazenada em `quota.json` na metadata do bucket.
- API: `/rustfs/admin/v3/quota/{bucket}`.
- Excesso retorna `XRustfsQuotaExceeded`.
- Protocolos de reserva:
  - **v1**: snapshot de usage do scanner; escrita exige usage autoritativo ou
    degradado; sem ambos, falha fechada com `503` retryable.
  - **v2**: ledger de allocator + 16 shard ledgers; opt-in; requer frota
    inteira atualizada.
- O default de uma quota nova continua v1; migração em massa:
  `POST /rustfs/admin/v3/quota-migration` (`admin:SetBucketQuota`).
- Em quota durável, usage do scanner é **relatório**, não admissão.
- Escrita de quota exige quóruns de namespace, metadata, ledger e fences; um nó
  fora não bloqueia se os quóruns existirem.
- `RUSTFS_SCANNER_ENABLED=false` deixa usage desatualizado e pode bloquear
  quotas legadas.

## Static website hosting

```bash
RUSTFS_WEBSITE_DOMAINS=website.example.com
```

- Bucket `photos` é servido em `photos.website.example.com`.
- Exige DNS wildcard e certificado cobrindo os hosts dos buckets.
- O domínio de website **não pode sobrepor** `RUSTFS_SERVER_DOMAINS`; startup
  rejeita sobreposição.
- Website aceita apenas `GET`/`HEAD`; requests são anônimos.
- Conceda `s3:GetObject` na bucket policy para index, error e páginas.
- `PutBucketWebsite`: `IndexDocument` é obrigatório salvo
  `RedirectAllRequestsTo`.
- `/` resolve para o index; sem barra final, redireciona quando há index.
- 403/404 usam o error document configurado; regras de routing são avaliadas na
  ordem.
- `x-amz-website-redirect-location` só age no endpoint de website.
- Documento de erro privado não é exposto como fallback.
- Atrás de TLS/proxy, defina `Protocol` explicitamente nas regras de redirect.

## Default encryption

- `PutBucketEncryption` define SSE default para escritas sem header.
- Algoritmos: `AES256` (SSE-S3) e `aws:kms` (SSE-KMS).
- `KMSMasterKeyID` só é válido com `aws:kms`.
- SSE-C explícito **suprime** o default do bucket, inclusive em PUT, POST e
  copy.
- SSE-S3 explícito em bucket default KMS não herda o key id.
- Config inválida é rejeitada, não armazenada.

## Tags, public access e notificações

- Bucket/object tagging suportado; tags participam de lifecycle, policy e
  replicação.
- Public Access Block suportado (put/get/delete).
- Event notifications configuradas por bucket (`PutBucketNotificationConfiguration`);
  destinos e eventos em `10-ilm-notificacoes.md`.
- Bucket logging e ownership controls não são completos — ver `05-s3-api.md`.

## Checklist de bucket de produção

- [ ] Versioning habilitado quando há necessidade de recuperação/auditoria.
- [ ] Object Lock habilitado na criação se WORM for requisito.
- [ ] Bucket policy + Public Access Block revisados.
- [ ] Default encryption definido (SSE-S3 ou SSE-KMS).
- [ ] Lifecycle para expiração, noncurrent e abort de multipart.
- [ ] Quota HARD se houver tenant/cobrança; protocolo v2 se exigir precisão sob
      falha de nó.
- [ ] Replicação configurada e `replication-check` executado com confirmação.
- [ ] Notificações com fila local e allowlist de egress.
- [ ] Website domains separados dos domínios S3.

## Fonte

`docs/architecture/s3-compatibility-matrix.md`;
`docs/operations/tier-ilm-debugging.md`;
`docs/operations/durable-quota-reservation-v2.md`;
`docs/operations/static-website-hosting.md`;
`docs/operations/object-lock-contention.md`;
`crates/config/src/constants/quota.rs`.
