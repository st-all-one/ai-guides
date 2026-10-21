# 15 — Cheatsheet

## Fórmulas

```text
N = K + M
K = N - M                       # data shards / read quorum
write quorum = K                # +1 se K == M
delete marker = N/2 + 1
capacidade útil ≈ raw × K / N
inline default = min(256 KiB / K, 128 KiB)   # versionado: /8
```

Paridade default: `N=1→0`, `2–3→1`, `4–5→2`, `6–7→3`, `≥8→4`.

## Topologia

```bash
# single-node, 4 drives
RUSTFS_VOLUMES='/data/vol{1...4}'

# 4 nós, 4 drives cada
rustfs server http://node{1...4}:9000/data{1...4}

# 2 pools (todo argumento precisa de ellipsis)
rustfs server \
  http://node{1...4}:9000/data{1...4} \
  http://node{5...8}:9000/data{1...4}

# fixar set width (só antes do primeiro start)
RUSTFS_ERASURE_SET_DRIVE_COUNT=16
```

Regras: ≥2 endpoints por pool; single-drive não expande; layout imutável; expanda
appendando pool + rebalance.

## Comandos

```bash
# binário
rustfs --version
rustfs server
rustfs info
rustfs info --json
rustfs info config
rustfs tls --path /etc/rustfs/tls
rustfs diagnose /var/log/rustfs
rustfs inspect --help

# build
cargo build --release -p rustfs
cargo build --release -p rustfs --features full
cargo build --release -p rustfs --features swift,sftp,http3

# Docker
docker run -d --name rustfs -p 9000:9000 -p 9001:9001 \
  -v "$PWD/data:/data" -v "$PWD/logs:/logs" rustfs/rustfs:latest

# compose
docker compose -f docker-compose-simple.yml up -d

# Helm
helm install rustfs rustfs/rustfs -n rustfs --create-namespace \
  --set secret.rustfs.access_key=... \
  --set secret.rustfs.secret_key=... \
  --set replicaCount=4 --set drivesPerNode=4
```

## `mc`

```bash
mc alias set local http://127.0.0.1:9000 rustfsadmin rustfsadmin
mc mb local/demo
mc cp file.bin local/demo/
mc ls --recursive local/demo
mc stat local/demo/file.bin
mc rm --recursive --force local/demo

mc version enable local/demo
mc retention set --default GOVERNANCE 30d local/demo
mc legalhold set local/demo/file.bin
mc ilm rule add local/demo --expire-days 30
mc ilm rule add local/demo --transition-days 30 --transition-tier warm
mc event add local/demo arn:rustfs:sqs::primary:webhook \
  --event put,delete --prefix logs/

mc admin info local
mc admin config get local scanner
mc admin config set local scanner speed=slow
mc admin replicate add site-a site-b
mc admin replicate status site-a
mc replicate status local/demo
```

## `rc`

```bash
rc alias set local http://127.0.0.1:9000 <ak> <sk>
rc ping local
rc ready local --timeout 2
rc admin info cluster local
rc admin info disk local --offline
rc admin pool list local
rc admin pool status local 0 --by-id
rc admin rebalance start local
rc admin rebalance status local
rc admin rebalance stop local
rc admin decommission start local '/data/pool1/disk{1...4}'
rc admin decommission status local 1 --by-id
rc admin decommission cancel local 1 --by-id
rc admin decommission clear local 1 --by-id
rc admin heal start local --scan-mode deep
rc admin heal status local --client-token <TOKEN>
rc admin heal stop local --client-token <TOKEN>
```

## Environment defaults (recorte)

| Variável | Default |
|---|---|
| `RUSTFS_ADDRESS` | `:9000` |
| `RUSTFS_CONSOLE_ENABLE` | `true` |
| `RUSTFS_CONSOLE_ADDRESS` | `:9001` |
| `RUSTFS_REGION` | `us-east-1` |
| `RUSTFS_ACCESS_KEY` / `SECRET_KEY` | `rustfsadmin` / `rustfsadmin` |
| `RUSTFS_DURABILITY_MODE` | `strict` |
| `RUSTFS_UNSUPPORTED_FS_POLICY` | `warn` |
| `RUSTFS_STORAGE_CLASS_RRS` | `EC:1` |
| `RUSTFS_API_MAX_CONNECTIONS` | `0` |
| `RUSTFS_API_RATE_LIMIT_ENABLE` | `false` |
| `RUSTFS_API_RATE_LIMIT_RPM` | `0` |
| `RUSTFS_API_OBJECT_MAX_VERSIONS` | `usize::MAX` |
| `RUSTFS_COMPRESS_ENABLE` | `false` |
| `RUSTFS_HTTP1_HEADER_READ_TIMEOUT` | `75` |
| `RUSTFS_HTTP_REQUEST_BODY_READ_TIMEOUT` | `300` |
| `RUSTFS_RUNTIME_WORKER_THREADS` | `16` |
| `RUSTFS_RUNTIME_MAX_BLOCKING_THREADS` | `1024` |
| `RUSTFS_OBJECT_IO_BUFFER_SIZE` | `128 KiB` |
| `RUSTFS_OBJECT_DUPLEX_BUFFER_SIZE` | `4 MiB` |
| `RUSTFS_ERASURE_ENCODE_MAX_INFLIGHT_BYTES` | `32 MiB` |
| `RUSTFS_SCANNER_ENABLED` | `true` |
| `RUSTFS_HEAL_ENABLED` | `true` |
| `RUSTFS_SCANNER_SPEED` | `default` |
| `RUSTFS_SCANNER_BITROT_CYCLE_SECS` | `2592000` |
| `RUSTFS_DELETE_RECOVERY_TIMEOUT_SECS` | `900` |
| `RUSTFS_ADMIN_PEER_PROBE_TIMEOUT_SECS` | `10` |
| `RUSTFS_IO_URING_READ_ENABLE` | `false` |
| `RUSTFS_CLEANUP_ISOLATE_ENABLE` | `false` |
| `RUSTFS_POOL_META_V3_WRITE` | `false` |
| `RUSTFS_KMS_ENFORCE_SSE_KEY_POLICY` | `false` |
| `RUSTFS_HEAL_MAX_CONCURRENT_HEALS` | `4` |
| `RUSTFS_KMS_ENABLE` | `false` |
| `RUSTFS_KMS_BACKEND` | `local` |
| `RUSTFS_SSE_C_REQUIRE_TLS` | — |
| `RUSTFS_NOTIFY_ENABLE` | `false` |
| `RUSTFS_AUDIT_ENABLE` | `false` |
| `RUSTFS_OBS_ENDPOINT` | vazio |
| `RUSTFS_OBS_LOGGER_LEVEL` | `error` |
| `RUSTFS_TLS_RELOAD_INTERVAL` | `30` |
| `RUSTFS_SFTP_ADDRESS` | `0.0.0.0:2222` |
| `RUSTFS_WEBDAV_ADDRESS` | `0.0.0.0:8080` |
| `RUSTFS_FTPS_ADDRESS` | `0.0.0.0:8022` |
| `RUSTFS_FTP_ADDRESS` | `0.0.0.0:8021` |

## Endpoints

| Endpoint | Uso |
|---|---|
| `GET /health`, `/health/live` | Liveness |
| `GET /health/ready` | Read quorum + IAM + locks |
| `GET /minio/health/cluster` | Write quorum + pool metadata |
| `GET /rustfs/admin/v3/realtime` | Métricas ao vivo |
| `GET /rustfs/admin/v3/scanner/status` | Scanner/bitrot/backlog |
| `GET /rustfs/admin/v3/pools/list` | Topologia |
| `GET /rustfs/admin/v3/pools/status` | Saúde por pool |
| `POST /rustfs/admin/v3/rebalance/start` | Rebalance |
| `POST /rustfs/admin/v3/pools/decommission` | Decommission |
| `POST /rustfs/admin/v3/heal/` | Admin heal |
| `GET /rustfs/admin/v4/heal/replacement-recovery` | Drive replacement |
| `GET /rustfs/admin/v4/cluster/snapshot` | Snapshot |
| `GET /rustfs/admin/v3/quota-stats/{bucket}` | Uso/quota |
| `GET /rustfs/admin/v3/integrity/readiness` | Suporte a shard integrity |
| `GET /rustfs/admin/v3/export-bucket-metadata` | Backup/diagnóstico de metadata |
| `POST /rustfs/admin/v3/recover-orphaned-bucket/{bucket}` | Bucket removido fora do S3 |
| `GET /rustfs/admin/v3/tls/certificate-state` | Estado da publicação TLS |
| `POST /rustfs/admin/v3/tls/certificate` | Publicar cert/key |
| `POST /rustfs/admin/v3/kms/backup` | Bundle KMS Local |
| `GET/POST /rustfs/admin/v3/tier` | Tiers |
| `POST /rustfs/admin/v3/ilm/transition/run` | Transição manual |
| `/rustfs/admin/v3/kms/*` | KMS |
| `/rustfs/admin/v3/site-replication/*` | Site replication |
| `/rustfs/admin/v3/oidc/*` | OIDC bootstrap |
| `GET /bucket?replication-check` | Valida target (mutante) |
| `/iceberg/v1` | S3 Tables (preview) |

Alias MinIO: troque `/rustfs/admin` por `/minio/admin`.

## S3 limites

| Item | Valor |
|---|---|
| PUT único | 5 GiB |
| Objeto multipart | 5 TiB |
| Partes | 10.000 |
| Parte mínima | 5 MiB (última isenta) |
| Parte máxima | 5 GiB |
| Checksums | CRC32/32C/64NVME, SHA1/256/512, MD5, XXHASH3/64/128 |

## Variáveis de segurança obrigatórias em produção

```bash
RUSTFS_ACCESS_KEY_FILE=/run/secrets/rustfs-access
RUSTFS_SECRET_KEY_FILE=/run/secrets/rustfs-secret
RUSTFS_RPC_SECRET='<segredo-forte>'          # sem variante _FILE
RUSTFS_IAM_MASTER_KEY='<segredo-forte>'      # sem variante _FILE
RUSTFS_TLS_PATH=/etc/rustfs/tls
RUSTFS_UNSUPPORTED_FS_POLICY=fail
RUSTFS_DURABILITY_MODE=strict
```

## Sintomas → primeiro comando

| Sintoma | Comando |
|---|---|
| S3 503 | `curl -s host:9000/health/ready \| jq .details` |
| Escrita falhando | `curl -i host:9000/minio/health/cluster` |
| Topologia suspeita | `rc admin pool list local` |
| Drive lento/timeout | `rc admin info disk local` |
| Heal parado | `rc admin heal status local` |
| Replicação falhando | `mc replicate status local/bucket` |
| Tier preso | `GET /rustfs/admin/v3/ilm/expiry/status` |
| KMS | `GET /rustfs/admin/v3/kms/status` |
| Proxy | bypass `:9000`; compare headers/body |
| SFTP | `rustfs --version`; perms de host key |
| Config efetiva | `rustfs info --json` |
