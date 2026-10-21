# 13 — Protocolos extras e integrações

## Swift API / OpenStack Keystone

- Build: `--features swift`.
- Rota: `/v1/{account}/{container}/{object}`.
- `account` = tenant (`AUTH_<project_id>`); `container` = bucket S3; `object` =
  key S3.
- Auth: `X-Auth-Token` validado pelo middleware Keystone; isolamento por tenant.
- Reaproveita o storage layer S3; não é um backend Swift separado.

Superfícies Swift implementadas no crate `rustfs-protocols`:
containers, objects, ACL, bulk delete/extract, DLO/SLO, static web, TempURL,
versioning, quotas, CORS, expiração e metadata update.

Configuração Keystone:

```bash
RUSTFS_KEYSTONE_ENABLE=true
RUSTFS_KEYSTONE_AUTH_URL=https://keystone.example.com
RUSTFS_KEYSTONE_VERSION=v3
RUSTFS_KEYSTONE_ADMIN_USER=admin
RUSTFS_KEYSTONE_ADMIN_PASSWORD=...
RUSTFS_KEYSTONE_ADMIN_PROJECT=service
RUSTFS_KEYSTONE_ADMIN_DOMAIN=Default
RUSTFS_KEYSTONE_VERIFY_SSL=true
RUSTFS_KEYSTONE_ENABLE_CACHE=true
RUSTFS_KEYSTONE_CACHE_SIZE=10000
RUSTFS_KEYSTONE_CACHE_TTL=300
RUSTFS_KEYSTONE_TENANT_PREFIX=true
RUSTFS_KEYSTONE_IMPLICIT_TENANTS=true
RUSTFS_KEYSTONE_TIMEOUT=30
```

Keystone usa URL literal (sem allowlist de egress). O Swift herda as políticas
S3 do tenant.

## SFTP

Build: `--features sftp`. Listener default `0.0.0.0:2222`.

```bash
RUSTFS_SFTP_ENABLE=true
RUSTFS_SFTP_ADDRESS=0.0.0.0:2222
RUSTFS_SFTP_HOST_KEY_DIR=/etc/rustfs/sftp-keys
```

### Modelo de path

```
/reports/2026/q1.pdf
bucket: reports
key:    2026/q1.pdf
```

O root é a lista de buckets. Não se cria arquivo no root; criar/remover diretório
de primeiro nível cria/remove bucket. Root listing limita a 10.000 buckets
(`root READDIR truncated`).

### Host keys

- Aceita Ed25519, ECDSA, RSA; chaves com passphrase não são decodificadas.
- Ordem de oferta: Ed25519, ECDSA, RSA.
- Arquivos vazios ou >1 MiB são ignorados.
- Unix: todo arquivo regular no diretório precisa de permissões sem group/other
  (`0600`, `0400`, `0700`). Um README world-readable derruba o startup.
- Windows: sem checagem de bits; restrinja ACL NTFS.
- Hot reload: `RUSTFS_SFTP_HOST_KEY_RELOAD_ENABLE=true`, intervalo mínimo 5s
  (default 30). Falha mantém chaves anteriores.

### Autenticação e autorização

SFTP usa access key/secret RustFS e o avaliador IAM/bucket policy. Mapeamento:

| Ação SFTP | Permissão S3 |
|---|---|
| Listar root | `s3:ListAllMyBuckets` |
| Listar bucket | `s3:ListBucket` |
| Download/stat | `s3:GetObject` |
| Upload | `s3:PutObject` |
| Delete | `s3:DeleteObject` |
| Rename | Get origem + Put destino + Delete origem |
| Criar/remover bucket | `s3:CreateBucket`/`s3:DeleteBucket` (+List) |
| Cleanup de upload | `s3:AbortMultipartUpload` |

`aws:SecureTransport` é true quando o control channel usa TLS. Source-IP usa o
peer do control channel.

### Limitações

- Upload deve ser stream sequencial desde offset 0; sem resume/append/edição
  in-place.
- `SETSTAT`/`FSETSTAT` são aceitos e ignorados em read-write.
- Symlinks não são suportados.
- Rename = copy + delete; não atômico e lento para arquivos grandes.
- Part size default 16 MiB; máximo de 10.000 partes → 156.25 GiB por arquivo no
  default. Aumente `RUSTFS_SFTP_PART_SIZE` para arquivos maiores.
- Idle SSH 600s; keepalive 15s (fecha após 3 sem resposta); watchdog de 30 min
  no nível SFTP.

Variáveis: `RUSTFS_SFTP_READ_ONLY`, `_BANNER`, `_HANDLES_PER_SESSION` (8–1024,
default 64), `_BACKEND_OP_TIMEOUT_SECS` (5–600), `_READ_CACHE_WINDOW_BYTES`
(4 MiB), `_READ_CACHE_TOTAL_MEM_BYTES` (256 MiB).

## FTPS

- Build default (`ftps`).
- Listener `0.0.0.0:8022`; TLS habilitado por default.
- `STOR` bufferiza no máximo 16 MiB por upload ativo.
- Arquivos <16 MiB usam `PutObject`; ≥16 MiB usam multipart sequencial.
- Part size fixo + 10.000 partes → máximo 156.25 GiB por upload.
- Sem resume/append com offset não-zero.
- Cada escrita exige `s3:PutObject`; cancelamento tenta
  `s3:AbortMultipartUpload` com as permissões do usuário.
- `aws:SecureTransport` é true quando control channel usa TLS e o listener exige
  TLS nos data channels; com TLS opcional, reporta false conservadoramente.
- Listing respeita `s3:prefix`, `s3:delimiter`, `s3:max-keys` reais.

```bash
RUSTFS_FTPS_ENABLE=true
RUSTFS_FTPS_ADDRESS=0.0.0.0:8022
RUSTFS_FTPS_TLS_ENABLED=true
RUSTFS_FTPS_CERTS_DIR=/etc/rustfs/ftps
RUSTFS_FTPS_CA_FILE=/etc/rustfs/ftps/ca.crt
RUSTFS_FTPS_PASSIVE_PORTS=40000-50000
RUSTFS_FTPS_EXTERNAL_IP=203.0.113.10
```

## WebDAV

- Build default (`webdav`).
- Listener default `0.0.0.0:8080`.
- Body máximo default 5 GiB; timeout 300s; 1024 conexões.
- Auth IAM S3; mesmas policies.
- TLS configurável por `RUSTFS_WEBDAV_TLS_ENABLED`, `_CERTS_DIR`, `_CA_FILE`.

```bash
RUSTFS_WEBDAV_ENABLE=true
RUSTFS_WEBDAV_ADDRESS=0.0.0.0:8080
RUSTFS_WEBDAV_MAX_BODY_SIZE=5368709120
RUSTFS_WEBDAV_REQUEST_TIMEOUT=300
RUSTFS_WEBDAV_MAX_CONNECTIONS=1024
```

## FTP

- Listener default `0.0.0.0:8021`.
- Sem TLS; use apenas em rede isolada.
- Config: `RUSTFS_FTP_ENABLE`, `_ADDRESS`, `_PASSIVE_PORTS`, `_EXTERNAL_IP`.

## S3 Tables / Iceberg REST Catalog

Status: **preview/controlado**; não é paridade com AWS S3 Tables.

- Endpoint canônico: `/iceberg/v1`; alias `/_iceberg/v1`.
- Data plane são objetos S3 normais; warehouse é um bucket habilitado.
- **PyIceberg** e **DuckDB** têm cobertura automatizada; Spark e Trino são
  harness manual/live; Snowflake e perfis vendor são referência.
- API: namespaces, tables (create/register/load/commit/rename/drop), refs,
  views, metadata-location, commit CAS, idempotência, recuperação de commit.
- **Atomicidade é single-table**; multi-table transactions não são claim.
- Credenciais vended: opt-in via `X-Iceberg-Access-Delegation:
  vended-credentials`; escopo por prefixo do warehouse, TTL curto, `no-store`.
- Política de tabela é aplicada no data plane; acesso direto a objetos não
  bypassa.
- `admin:ClaimTableLocation` autoriza reivindicar prefixos; não concede S3.
- Manutenção: metadata retention, snapshot expiration, orphan cleanup,
  compaction (parcial), scheduler/worker opt-in.
- Lifecycle comum é **desabilitado** para table buckets.
- Backup/restore durável é preview/controlado; não copia data files.
- Warehouse index: fallback limitado a 4.096 objetos; acima disso exige
  backfill.

Config relacionada:
`RUSTFS_TABLE_CATALOG_*`, `RUSTFS_TABLE_MAINTENANCE_SCHEDULER_*`.

Manutenção (standalone):
- Scheduler é opt-in: `RUSTFS_TABLE_MAINTENANCE_SCHEDULER_ENABLED=false`,
  `..._BUCKETS` (1–32 buckets com catálogo ativo) e `..._INTERVAL_SECONDS`
  (`300`, faixa `30..86400`). Ele só **enfileira** jobs; não executa worker,
  não expira snapshots nem compacta.
- Planejamento read-only:
  `POST /iceberg/v1/{warehouse}/namespaces/{ns}/tables/{table}/maintenance/metadata`.
- Status: `GET .../maintenance/scheduler`; worker explícito:
  `POST .../maintenance/worker/run` com `worker-id` e, opcionalmente,
  `expected-job-id` + `expected-attempt`.
- Admissão automática não reseta retry, não recupera lease expirado e não limpa
  quarentena; trate esses estados explicitamente. Intervalo igual em todos os nós.

## Snowball auto-extract

Aceita uploads MinIO-compatible com `x-amz-meta-snowball-auto-extract`.

| Variável | Default | Máximo |
|---|---:|---:|
| `RUSTFS_SNOWBALL_MAX_ENTRY_BYTES` | 1 GiB | 1 TiB |
| `RUSTFS_SNOWBALL_MAX_UNPACKED_BYTES` | 10 GiB | 10 TiB |
| `RUSTFS_SNOWBALL_EXTRACT_MAX_INFLIGHT` | — | 1–16 |

Small members (≤128 KiB) podem commitar 16 por vez quando ignore-errors está
ligado e não há quota; caso contrário, serial. Path traversal e limites de PAX
são validados.

## HTTP/3

- Build: `cargo build -p rustfs --features http3`.
- `RUSTFS_HTTP3_ENABLE=true` + `RUSTFS_TLS_PATH`.
- UDP na mesma porta do listener S3.
- TLS 1.3, ALPN `h3`, sem early data/connection migration.
- Console e internode continuam TCP.
- `RUSTFS_API_MAX_CONNECTIONS` conta cada transporte separadamente.

## Virtual hosting e website

- `RUSTFS_SERVER_DOMAINS` habilita `bucket.s3.example.com`.
- `RUSTFS_WEBSITE_DOMAINS` habilita website anônimo (`photos.website...`).
- Domínios não podem sobrepor; DNS wildcard + certificado cobrindo buckets.
- Website só GET/HEAD; S3 API continua no hostname S3.

## Multi-tenancy

- IAM + bucket policies + Keystone tenants + quotas.
- Não há ACL por objeto; isolamento vem de policies, prefixos e quotas.
- SFTP/FTPS/WebDAV herdam o mesmo avaliador IAM.

## Fonte

`crates/protocols/src/swift/`;
`docs/operations/sftp.md`;
`docs/operations/ftps.md`;
`docs/operations/snowball-auto-extract.md`;
`docs/architecture/s3-tables-support-matrix.md`;
`docs/operations/s3-tables-maintenance-scheduler.md`;
`docs/operations/reverse-proxy.md` (HTTP/3);
`docs/operations/static-website-hosting.md`.
