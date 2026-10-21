# 03 — Configuração

## Dois planos de configuração

| Plano | Mecanismo | Exemplos |
|---|---|---|
| Processo/startup | CLI + variáveis `RUSTFS_*` | volumes, endereço, credenciais, TLS, KMS, OTLP, limites HTTP |
| Cluster/runtime persistido | Admin API / `mc admin config` | scanner, heal, ILM, tiers, notificações, audit, targets |

O plano persistido é armazenado no meta-bucket e sobrevive a restart; o plano de
processo precisa ser idêntico em todos os nós.

## Precedência

1. Flag de CLI explícita (ex.: `--address`).
2. Variável de ambiente `RUSTFS_*`.
3. Default compilado.

Compatibilidade MinIO: algumas chaves `MINIO_*` são mapeadas para `RUSTFS_*`
quando a variável canônica não existe (`VOLUMES`, `ERASURE_SET_DRIVE_COUNT`,
classes de storage). Se ambas existirem, `RUSTFS_*` vence e o conflito é logado.

## Núcleo

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_VOLUMES` | — (obrigatória) | Endpoints/pools separados por espaço; aceita ellipsis |
| `RUSTFS_ADDRESS` | `:9000` | Bind do S3/Admin |
| `RUSTFS_CONSOLE_ENABLE` | `true` | Liga o console |
| `RUSTFS_CONSOLE_ADDRESS` | `:9001` | Bind do console |
| `RUSTFS_SERVER_DOMAINS` | — | Domínios para virtual-hosted-style (`s3.example.com`) |
| `RUSTFS_WEBSITE_DOMAINS` | — | Domínios de static website; não podem sobrepor `SERVER_DOMAINS` |
| `RUSTFS_ACCESS_KEY` / `_FILE` | `rustfsadmin` | Credencial root; mutuamente exclusivas |
| `RUSTFS_SECRET_KEY` / `_FILE` | `rustfsadmin` | Segredo root; mutuamente exclusivas |
| `RUSTFS_REGION` | `us-east-1` | Região SigV4 default |
| `RUSTFS_TLS_PATH` | — | Diretório de certificados |
| `RUSTFS_RPC_SECRET` | derivado do par access/secret se não-default | Segredo internode; defina explicitamente em produção |
| `RUSTFS_IAM_MASTER_KEY` | — | Criptografia de IAM/2FA em repouso |
| `RUSTFS_IAM_MASTER_KEY_OLD_KEYS` | — | Chaves antigas aceitas para leitura durante rotação |
| `RUSTFS_LICENSE` | — | Conteúdo de licença para recursos licenciados |

`rustfs` sem argumentos vira `rustfs server` e lê `RUSTFS_VOLUMES`. `rustfs info`
mostra a configuração efetiva, build features e perfis.

## Storage e topologia

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_ERASURE_SET_DRIVE_COUNT` | auto | Fixa largura do set (divisor simétrico válido, ≤16) |
| `RUSTFS_STORAGE_CLASS_STANDARD` | auto | Paridade STANDARD, formato `EC:<n>` |
| `RUSTFS_STORAGE_CLASS_RRS` | `EC:1` (0 em single-drive) | Paridade REDUCED_REDUNDANCY |
| `RUSTFS_STORAGE_CLASS_INLINE_BLOCK` | escala 256 KiB/K, cap 128 KiB | Limite fixo por shard para inline |
| `RUSTFS_STORAGE_CLASS_OPTIMIZE` | — | Aceito por compatibilidade; sem efeito runtime hoje |
| `RUSTFS_LIST_OBJECTS_QUORUM` | `optimal` | `disk`, `reduced`, `optimal`, `auto`, senão `strict` |
| `RUSTFS_UNSUPPORTED_FS_POLICY` | `warn` | `warn` ou `fail` para NFS/CIFS/FUSE/etc. |
| `RUSTFS_UNSAFE_BYPASS_DISK_CHECK` | `false` | **Só laboratório**; ignora independência física |
| `RUSTFS_SHARD_INTEGRITY_WRITE` | `false` | Pede commitments SHA-256 em escritas novas |
| `RUSTFS_SHARD_INTEGRITY_FLEET_CONFIRMED` | `false` | Atestação de frota para o formato protegido |

## Durabilidade

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_DURABILITY_MODE` | `strict` | `strict`, `relaxed`, `none` |
| `RUSTFS_DRIVE_SYNC_ENABLE` | `true` | Legado; `false` → `legacy-off` |
| `RUSTFS_NEW_BUCKET_DURABILITY_MODE` | `inherit` | Semeia override em buckets novos |

Detalhes e garantias em `04-storage-erasure-coding.md`.

## HTTP, limites e proteção

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_API_MAX_CONNECTIONS` | `0` (ilimitado) | Conexões simultâneas no listener S3 |
| `RUSTFS_API_RATE_LIMIT_ENABLE` | `false` | Token bucket por IP |
| `RUSTFS_API_RATE_LIMIT_RPM` | `0` | Requisições/min por IP; 0 = ilimitado |
| `RUSTFS_API_RATE_LIMIT_BURST` | `0` | Burst; 0 = igual ao RPM |
| `RUSTFS_API_RATE_LIMIT_BUCKET_RPM` | `0` | Limite por bucket; 0 = desligado |
| `RUSTFS_API_RATE_LIMIT_BUCKET_BURST` | `0` | Burst por bucket |
| `RUSTFS_API_OBJECT_MAX_VERSIONS` | `usize::MAX` | Teto de versões por objeto |
| `RUSTFS_HTTP1_HEADER_READ_TIMEOUT` | `75` s | Fecha keep-alive ocioso; ajuste contra o proxy |
| `RUSTFS_HTTP_REQUEST_BODY_READ_TIMEOUT` | `300` s | Inatividade de corpo; `0` desliga (uploads comuns) |
| `RUSTFS_HTTP1_MAX_BUF_SIZE` | `64 KiB` | Buffer de headers |
| `RUSTFS_H2_INITIAL_STREAM_WINDOW_SIZE` | `4 MiB` | Flow control HTTP/2 |
| `RUSTFS_H2_INITIAL_CONN_WINDOW_SIZE` | `8 MiB` | Flow control HTTP/2 |
| `RUSTFS_H2_MAX_FRAME_SIZE` | `512 KiB` | Frame HTTP/2 |
| `RUSTFS_H2_MAX_CONCURRENT_STREAMS` | `2048` | Streams por conexão |
| `RUSTFS_H2_KEEP_ALIVE_INTERVAL` / `_TIMEOUT` | `20` / `10` s | Keepalive HTTP/2 |
| `RUSTFS_HTTP3_ENABLE` | `false` | Requer build `http3` + TLS |
| `RUSTFS_CORS_ALLOWED_ORIGINS` | vazio | CORS do S3 |
| `RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS` | vazio | CORS do console |
| `RUSTFS_CONSOLE_RATE_LIMIT_ENABLE` | `false` | Limite do console |
| `RUSTFS_CONSOLE_RATE_LIMIT_RPM` | `100` | RPM do console |
| `RUSTFS_CONSOLE_AUTH_TIMEOUT` | `3600` s | Timeout HTTP do console (não é duração de sessão) |
| `RUSTFS_CONSOLE_OIDC_SESSION_DURATION` | `3600` s | Sessão OIDC; máx. `604800` |

## Compressão de resposta

Default **off**, alinhado ao MinIO.

| Variável | Default |
|---|---|
| `RUSTFS_COMPRESS_ENABLE` | `false` |
| `RUSTFS_COMPRESS_EXTENSIONS` | vazio |
| `RUSTFS_COMPRESS_MIME_TYPES` | `text/*,application/json,application/xml,application/javascript` |
| `RUSTFS_COMPRESS_MIN_SIZE` | `1000` bytes |

## Runtime, buffers e I/O

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_RUNTIME_WORKER_THREADS` | `16` | Workers Tokio |
| `RUSTFS_RUNTIME_MAX_BLOCKING_THREADS` | `1024` | Pool blocking |
| `RUSTFS_RUNTIME_FSYNC_BLOCKING_THREADS` | `64` | Threads de fsync |
| `RUSTFS_BUFFER_PROFILE` | `GeneralPurpose` | Perfil de buffer adaptativo |
| `RUSTFS_BUFFER_PROFILE_DISABLE` | `false` | Usa buffers fixos legados |
| `RUSTFS_BUFFER_MIN_SIZE` | `64 KiB` | Mínimo do perfil |
| `RUSTFS_BUFFER_MAX_SIZE` | `1 MiB` | Máximo do perfil |
| `RUSTFS_BUFFER_DEFAULT_SIZE` | `256 KiB` | Tamanho desconhecido |
| `RUSTFS_OBJECT_IO_BUFFER_SIZE` | `128 KiB` | Bloco de leitura/escrita |
| `RUSTFS_OBJECT_DUPLEX_BUFFER_SIZE` | `4 MiB` | Pipe duplex |
| `RUSTFS_ERASURE_ENCODE_MAX_INFLIGHT_BYTES` | `32 MiB` | Memória do encode EC |
| `RUSTFS_ERASURE_ENCODE_BYTESMUT_INGEST` | `true` | Evita cópia no ingest |
| `RUSTFS_OBJECT_MAX_CONCURRENT_DISK_READS` | `64` | Paralelismo de leitura |
| `RUSTFS_IO_URING_READ_ENABLE` | `false` | Backend de leitura io_uring (Linux, opt-in) |
| `RUSTFS_IO_URING_SHARDS` | auto (`CPU/4`, `1..4`; cap 16) | Shards por disco |
| `RUSTFS_IO_URING_READ_CHUNK_BYTES` | `128 MiB` | Cap lógico por read; `4 KiB..128 MiB` |
| `RUSTFS_IO_URING_FD_CACHE` | `true` | Cache de fds; `false` volta a open-per-read |
| `RUSTFS_IO_URING_MAX_DRIVER_THREADS` | `0` | `0` = sem budget; >0 limita threads de driver |
| `RUSTFS_CLEANUP_ISOLATE_ENABLE` | `false` | Runtime/admissão dedicada a cleanup de PUT/GC |
| `RUSTFS_OBJECT_HIGH_CONCURRENCY_THRESHOLD` | `8` | Limiar de admissão |
| `RUSTFS_OBJECT_MEDIUM_CONCURRENCY_THRESHOLD` | `4` | Limiar de admissão |
| `RUSTFS_PUT_FOREGROUND_ADMISSION_ENABLE` | `false` | Admissão de PUT em foreground |
| `RUSTFS_PUT_FOREGROUND_ADMISSION_LIMIT` | `0` | Limite (0 = sem limite) |
| `RUSTFS_ALLOCATOR_RECLAIM_ENABLED` | `true` | Devolve páginas ao SO após ociosidade |
| `RUSTFS_ALLOCATOR_RECLAIM_INTERVAL_SECS` | `30` | Intervalo de amostragem |
| `RUSTFS_ALLOCATOR_RECLAIM_IDLE_INTERVALS` | `3` | Amostras ociosas |
| `RUSTFS_ALLOCATOR_RECLAIM_FORCE` | `true` | Coleta forçada quando suportado |

Perfis de workload:
`GeneralPurpose` (default), `AiTraining`, `DataAnalytics`, `WebWorkload`,
`IndustrialIoT`, `SecureStorage`, `Custom`.

`io_uring` é opt-in, Linux-only e lido no primeiro uso: mudanças exigem restart.
O chunk é um limite por operação, não quota de memória; buffers, shards e
budgets opcionais (`RUSTFS_IO_URING_READ_BUDGET_*`) se multiplicam por disco e
por concorrência. Meça GET/Range antes de adotar valores menores.

`RUSTFS_CLEANUP_ISOLATE_ENABLE=true` separa admissão/execução de cleanup do
foreground; saturação retorna `SlowDown` em vez de esperar. Não combine com
`RUSTFS_PUT_RENAME_TAIL_CLEANUP_LANE_ENABLE`, que cria uma segunda fila. O
`RUSTFS_CLEANUP_CPUS` default usa CPUs 1–2 no Linux; ajuste em containers
restritos.

## Scanner e heal

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_SCANNER_ENABLED` | `true` | Liga o scanner |
| `RUSTFS_HEAL_ENABLED` | `true` | Liga o heal manager |
| `RUSTFS_HEAL_AUTO_HEAL_ENABLE` | `true` | Heal automático |
| `RUSTFS_SCANNER_SPEED` | `default` | `fastest`, `fast`, `default`, `slow`, `slowest` |
| `RUSTFS_SCANNER_CYCLE` | derivado | Intervalo entre ciclos |
| `RUSTFS_SCANNER_CYCLE_MAX_DURATION_SECS` | `1800` | Orçamento por ciclo; `0` desliga |
| `RUSTFS_SCANNER_CYCLE_MAX_OBJECTS` | `0` | Teto de objetos; `0` desliga |
| `RUSTFS_SCANNER_CYCLE_MAX_DIRECTORIES` | `0` | Teto de diretórios; `0` desliga |
| `RUSTFS_SCANNER_BITROT_CYCLE_SECS` | `2592000` (30d) | Cadência de deep scan; `off` desliga |
| `RUSTFS_SCANNER_IDLE_MODE` | `true` | Sleeps de throttling |
| `RUSTFS_SCANNER_DISK_IO_BUDGET_IOPS` | `auto` | 100 HDD / 4000 flash |
| `RUSTFS_SCANNER_DISK_IO_BUDGET_BYTES_PER_SEC` | `auto` | 16 MiB/s HDD / 256 MiB/s flash |
| `RUSTFS_SCANNER_MAX_CONCURRENT_SET_SCANS` | `4` | Concorrência por set |
| `RUSTFS_SCANNER_MAX_CONCURRENT_DISK_SCANS` | `4` | Concorrência por disco |
| `RUSTFS_SCANNER_WALKERS_PER_DISK` | `1` | 1–16; mantenha 1 em HDD |
| `RUSTFS_HEAL_MAX_CONCURRENT_HEALS` | `4` | Heal global |
| `RUSTFS_HEAL_MAX_CONCURRENT_PER_SET` | `1` | Heal por set |
| `RUSTFS_HEAL_QUEUE_SIZE` | `10000` | Fila de heal |
| `RUSTFS_HEAL_MRF_QUEUE_SIZE` | `100000` | Fila MRF |
| `RUSTFS_HEAL_MRF_ENABLE` | `true` | Pipeline MRF durável |
| `RUSTFS_HEAL_TASK_TIMEOUT_SECS` | `300` | Timeout de task |
| `RUSTFS_HEAL_OVERLAP_POLICY` | `merge` | Política de heals concorrentes |

## Cluster e data movement

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_INTERNODE_RPC_TIMEOUT_SECS` | `30` | Timeout de RPC internode |
| `RUSTFS_ADMIN_PEER_PROBE_TIMEOUT_SECS` | `10` (1–60) | Budget por peer em `server_info`/`storage_info` |
| `RUSTFS_DELETE_RECOVERY_TIMEOUT_SECS` | `900` (30–86400) | Deadline de settle/verificação de delete |
| `RUSTFS_POOL_META_V3_WRITE` | `false` | Migra `pool.bin` para V3 |
| `RUSTFS_POOL_META_V3_FLEET_CONFIRMED` | `false` | Atestação de frota inteira para V3 |
| `RUSTFS_STARTUP_READINESS_MAX_WAIT_SECS` | `120` | Espera máxima por peer re-admission |
| `RUSTFS_STARTUP_PEER_READMISSION_ENABLE` | `true` | Espera maioria do set antes de publicar |
| `RUSTFS_DRIVE_RETURNING_PROBE_INTERVAL_SECS` | `2` | Probe de drive `offline`/`returning` |
| `RUSTFS_DRIVE_RETURNING_SUCCESS_THRESHOLD` | `3` | Sucessos para voltar a `online` |
| `RUSTFS_REBALANCE_MAX_ATTEMPTS` | `3` | Tentativas por item no rebalance |
| `RUSTFS_DECOMMISSION_BUCKET_CONCURRENCY` | até `4` (derivado de CPU) | Concorrência por bucket |
| `RUSTFS_DECOMMISSION_ENTRY_CONCURRENCY` | até `8` (derivado de CPU; cap 64) | Concorrência por entry |
| `RUSTFS_LIST_OBJECTS_QUORUM` | `optimal` | `disk`, `reduced`, `optimal`, `auto`, senão `strict` |

## Locks remotos

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_OBJECT_LOCK_RPC_TIMEOUT_MS` | `3000` | Deadline por RPC de lock |
| `RUSTFS_OBJECT_LOCK_RPC_EVICTION_COOLDOWN_MS` | `5000` | Intervalo mínimo entre evictions por peer |
| `RUSTFS_OBJECT_LOCK_RPC_DETACHED_LIMIT` | `256` | RPCs expirados mantidos em background por peer |
| `RUSTFS_OBJECT_LOCK_RPC_REQUEST_LIMIT` | `128` | In-flight por peer quando o breaker está degradado |

Timeout não cancela o stream: ele continua destacado e pode liberar o lock
depois. Três timeouts de aquisição abrem breaker por peer; release/refresh não
são bloqueados. Monitore `rustfs_remote_lock_rpc_timeouts_total` e
`..._evictions_total`.

## Drive timeouts

Perfil `RUSTFS_DRIVE_TIMEOUT_PROFILE=default|high_latency`; `high_latency` eleva
todos os knobs para 60 s.

| Variável | Default | `high_latency` |
|---|---|---|
| `RUSTFS_DRIVE_WALKDIR_STALL_TIMEOUT_SECS` | `5` | `60` |
| `RUSTFS_DRIVE_WALKDIR_PEEK_TIMEOUT_SECS` | `10` | `120` |
| `RUSTFS_DRIVE_WALKDIR_TIMEOUT_SECS` | `5` | `60` |
| `RUSTFS_DRIVE_LIST_DIR_TIMEOUT_SECS` | `5` | `60` |
| `RUSTFS_DRIVE_METADATA_TIMEOUT_SECS` | `5` | `60` |
| `RUSTFS_DRIVE_DISK_INFO_TIMEOUT_SECS` | `5` | `60` |
| `RUSTFS_OBJECT_DISK_READ_TIMEOUT` | `10` | `60` |
| `RUSTFS_CAPACITY_STAT_TIMEOUT` | `3` | `60` |
| `RUSTFS_CAPACITY_MAX_TIMEOUT` | `15` | `60` |
| `RUSTFS_DRIVE_MAX_TIMEOUT_DURATION` | `30` | — (deprecated) |

O knob específico para **ListObjects em prefixes grandes** é
`RUSTFS_DRIVE_WALKDIR_STALL_TIMEOUT_SECS`.

## Segurança e KMS

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_KMS_ENABLE` | `false` | Liga KMS |
| `RUSTFS_KMS_BACKEND` | `local` | `local`, `static`, `vault`/`vault-kv2`, `vault-transit`, `aws` |
| `RUSTFS_KMS_KEY_DIR` | — | Diretório do backend Local |
| `RUSTFS_KMS_LOCAL_MASTER_KEY` | — | Master key do backend Local |
| `RUSTFS_KMS_VAULT_ADDRESS` | — | Endereço do Vault |
| `RUSTFS_KMS_VAULT_TOKEN` / `_FILE` | — | Token do Vault |
| `RUSTFS_KMS_VAULT_MOUNT_PATH` | — | Mount do Vault; o backend KV2 ignora (legado), Transit usa |
| `RUSTFS_KMS_DEFAULT_KEY_ID` | — | Chave default para SSE-KMS |
| `RUSTFS_KMS_ALLOW_INSECURE_DEV_DEFAULTS` | `false` | Permite defaults inseguros de dev |
| `RUSTFS_KMS_ALLOW_IMMEDIATE_DELETION` | `false` | Habilita deleção física imediata |
| `RUSTFS_KMS_ENFORCE_SSE_KEY_POLICY` | `false` | Exige `kms:GenerateDataKey`/`Decrypt` no data path |
| `RUSTFS_SSE_S3_MASTER_KEY` | — | Master key base64 de 32 bytes para SSE-S3 sem KMS |
| `RUSTFS_SSE_C_REQUIRE_TLS` | — | Exige TLS para SSE-C |
| `RUSTFS_IDENTITY_OPENID_*` | vários | OIDC (ver `07`) |
| `RUSTFS_KEYSTONE_*` | vários | Keystone (ver `13`) |
| `RUSTFS_OUTBOUND_ALLOW_ORIGINS` | — | Allowlist de origens privadas para egress |
| `RUSTFS_SERVER_MTLS_ENABLE` | `false` | mTLS inbound |
| `RUSTFS_MTLS_CLIENT_CERT` / `_KEY` | — | Identidade mTLS outbound |
| `RUSTFS_TLS_RELOAD_ENABLE` | `false` | Recarrega certificados |
| `RUSTFS_TLS_RELOAD_INTERVAL` | `30` s (mín. 5) | Intervalo de reload |
| `RUSTFS_TLS_PUBLISH_DIR` | — | Diretório `0700` para publicação atômica via Admin API |
| `RUSTFS_TLS_KEYLOG` | `false` | Key logging TLS (não usar em produção) |

## Observabilidade

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_OBS_ENDPOINT` | vazio | Base OTLP/HTTP, ex. `http://otel:4318` |
| `RUSTFS_OBS_LOGGER_LEVEL` | `error` | Nível de log |
| `RUSTFS_OBS_METRIC_ENDPOINT` | derivado | Endpoint de métricas |
| `RUSTFS_OBS_TRACE_ENDPOINT` | derivado | Endpoint de traces |
| `RUSTFS_OBS_LOG_ENDPOINT` | derivado | Endpoint de logs |
| `RUSTFS_OBS_METER_INTERVAL` | — | Intervalo de export de métricas |
| `RUSTFS_OBS_ENVIRONMENT` | `production` | `production`, `development`, `test`, `staging` |
| `RUSTFS_OBS_SERVICE_NAME` / `_VERSION` | — | Identidade do serviço |
| `RUSTFS_OBS_USE_STDOUT` | `false` | Também escreve logs em stdout |
| `RUSTFS_OBS_LOG_DIRECTORY` | — | Diretório de arquivos de log |
| `RUSTFS_OBS_LOG_STDOUT_ENABLED` | — | Log em stdout |
| `RUSTFS_OBS_LOG_MAX_TOTAL_SIZE_BYTES` | `2 GiB` | Rotação/limpeza |
| `RUSTFS_OBS_LOG_COMPRESSION_ALGORITHM` | `zstd` | `zstd` ou `gzip` |
| `RUSTFS_OBS_LOG_COMPRESSED_FILE_RETENTION_DAYS` | `30` | Retenção de comprimidos |
| `OTEL_RESOURCE_ATTRIBUTES` | — | Use `rustfs.cluster.id=<id>` para dashboards |

## Notificações e audit

| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_NOTIFY_ENABLE` | `false` | Switch global de eventos |
| `RUSTFS_NOTIFY_TARGET_STREAM_CONCURRENCY` | `20` | Streams de target em paralelo |
| `RUSTFS_NOTIFY_SEND_CONCURRENCY` | `64` | Envios em paralelo |
| `RUSTFS_NOTIFY_WEBHOOK_ENABLE_<ID>` | — | Liga webhook `_<ID>` |
| `RUSTFS_NOTIFY_WEBHOOK_ENDPOINT_<ID>` | — | URL do webhook |
| `RUSTFS_NOTIFY_WEBHOOK_QUEUE_DIR_<ID>` | — | Fila store-and-forward |
| `RUSTFS_NOTIFY_WEBHOOK_CLIENT_CA_<ID>` | — | CA privada do webhook |
| `RUSTFS_NOTIFY_WEBHOOK_SKIP_TLS_VERIFY_<ID>` | `false` | **Inseguro**; prefira CA |
| `RUSTFS_NOTIFY_KAFKA_*` / `AMQP` / `MQTT` / `NATS` / `PULSAR` / `REDIS` / `POSTGRES` / `MYSQL` | — | Targets adicionais |
| `RUSTFS_AUDIT_ENABLE` | `false` | Switch global de audit |
| `RUSTFS_AUDIT_<TARGET>_*` | — | Webhook, Kafka, AMQP, MQTT, NATS, Pulsar, Redis, Postgres, MySQL |

Os targets usam envs com sufixo de instância (`_PRIMARY`, etc.) e ARN
`arn:rustfs:sqs:<id>:<target>`. A fila local é obrigatória para durabilidade.

## Protocolos opcionais

| Variável | Default |
|---|---|
| `RUSTFS_FTPS_ENABLE` | — |
| `RUSTFS_FTPS_ADDRESS` | `0.0.0.0:8022` |
| `RUSTFS_FTPS_TLS_ENABLED` | `true` |
| `RUSTFS_FTPS_CERTS_DIR` | — |
| `RUSTFS_FTPS_CA_FILE` | — |
| `RUSTFS_FTPS_PASSIVE_PORTS` | `40000-50000` (exemplo) |
| `RUSTFS_FTPS_EXTERNAL_IP` | — |
| `RUSTFS_WEBDAV_ENABLE` | — |
| `RUSTFS_WEBDAV_ADDRESS` | `0.0.0.0:8080` |
| `RUSTFS_WEBDAV_MAX_BODY_SIZE` | `5 GiB` |
| `RUSTFS_WEBDAV_REQUEST_TIMEOUT` | `300` s |
| `RUSTFS_WEBDAV_MAX_CONNECTIONS` | `1024` |
| `RUSTFS_SFTP_ENABLE` | `false` |
| `RUSTFS_SFTP_ADDRESS` | `0.0.0.0:2222` |
| `RUSTFS_SFTP_HOST_KEY_DIR` | — (obrigatório) |
| `RUSTFS_SFTP_IDLE_TIMEOUT` | `600` s |
| `RUSTFS_SFTP_PART_SIZE` | `16 MiB` |
| `RUSTFS_SFTP_READ_ONLY` | `false` |
| `RUSTFS_SFTP_HANDLES_PER_SESSION` | `64` |
| `RUSTFS_SFTP_READ_CACHE_WINDOW_BYTES` | `4 MiB` |
| `RUSTFS_SFTP_READ_CACHE_TOTAL_MEM_BYTES` | `256 MiB` |
| `RUSTFS_TABLE_CATALOG_*` | — (S3 Tables) |
| `RUSTFS_TABLE_MAINTENANCE_SCHEDULER_ENABLED` | `false` |
| `RUSTFS_TABLE_MAINTENANCE_SCHEDULER_BUCKETS` | — (1–32 buckets) |
| `RUSTFS_TABLE_MAINTENANCE_SCHEDULER_INTERVAL_SECONDS` | `300` (30–86400) |

## Exemplo de configuração de nó

```bash
# identidade
RUSTFS_VOLUMES='http://node{1...4}:9000/data{1...4}'
RUSTFS_ADDRESS=':9000'
RUSTFS_CONSOLE_ENABLE=true
RUSTFS_CONSOLE_ADDRESS=':9001'
RUSTFS_SERVER_DOMAINS='s3.example.com'
RUSTFS_REGION='us-east-1'

# segurança
RUSTFS_ACCESS_KEY_FILE=/run/secrets/rustfs-access
RUSTFS_SECRET_KEY_FILE=/run/secrets/rustfs-secret
RUSTFS_RPC_SECRET='<segredo-forte>'          # sem variante _FILE
RUSTFS_IAM_MASTER_KEY='<segredo-forte>'      # sem variante _FILE
RUSTFS_TLS_PATH=/etc/rustfs/tls
RUSTFS_TLS_RELOAD_ENABLE=true

# storage
RUSTFS_STORAGE_CLASS_STANDARD='EC:4'
RUSTFS_DURABILITY_MODE=strict
RUSTFS_UNSUPPORTED_FS_POLICY=fail

# observabilidade
RUSTFS_OBS_ENDPOINT='http://otel-collector:4318'
RUSTFS_OBS_LOGGER_LEVEL=info
OTEL_RESOURCE_ATTRIBUTES='rustfs.cluster.id=prod-a'
```

## Regras práticas

- Mantenha a configuração **idêntica** em todos os nós, exceto identidade local
  (`RUSTFS_LOCAL_ENDPOINT_HOST` em K8s).
- Variáveis de topologia só podem ser definidas antes do primeiro start.
- Alterações de scanner/heal/ILM via admin podem ser aplicadas sem restart;
  alterações de processo (TLS, KMS backend, OTLP) geralmente exigem restart.
- `rustfs info --json` é a forma barata de auditar a configuração efetiva.
- Não use `RUSTFS_UNSAFE_BYPASS_DISK_CHECK` em produção.

## Fonte

`rustfs/src/config/cli.rs`; `rustfs/src/config/info.rs`;
`crates/config/src/constants/*`; `crates/config/src/observability/*`;
`crates/config/src/notify/*`; `crates/config/src/audit/*`;
`docs/operations/cluster-lifecycle-operations.md`;
`docs/operations/durability-modes.md`;
`docs/operations/scanner-runtime-controls.md`;
`docs/operations/drive-timeout-tuning.md`;
`docs/operations/io-uring-initialization.md`;
`docs/operations/io-uring-read-chunks.md`;
`docs/operations/put-cleanup-isolation.md`;
`docs/operations/lock-rpc-storm-protection.md`;
`docs/operations/delete-transaction-recovery.md`;
`docs/operations/pool-metadata-recovery.md`;
`docs/operations/s3-tables-maintenance-scheduler.md`.
