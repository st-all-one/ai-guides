# 11 — Observabilidade e operação

## Pipeline

RustFS instrumenta métricas, traces e logs e exporta via **OTLP/HTTP** para um
collector (`RUSTFS_OBS_ENDPOINT`, ex. `http://otel-collector:4318`). O stack
oficial do repositório sobe Collector + Prometheus + Grafana + Tempo + Jaeger +
Loki; o Prometheus raspa o Collector em `:8888` (telemetria do collector) e
`:8889` (métricas da aplicação).

```bash
RUSTFS_OBS_ENDPOINT=http://otel-collector:4318
RUSTFS_OBS_LOGGER_LEVEL=info
OTEL_RESOURCE_ATTRIBUTES=rustfs.cluster.id=prod-a
```

- `rustfs.cluster.id` é obrigatório para separar deployments nos dashboards.
- Não some métricas de observers diferentes; escolha **um** observer fresco para
  visões de cluster.
- O caminho suportado é push OTLP. Não assuma um endpoint Prometheus direto no
  processo: confirme a superfície de scrape do build antes de configurar.
- Export é assíncrono; uma coleta pode misturar observações adjacentes por um
  instante.

## Health e readiness

| Endpoint | Semântica |
|---|---|
| `/health` | Liveness; não depende de storage/IAM/quorum |
| `/health/live` | Idem |
| `/health/ready` | Read quorum + IAM + shared locks; membership K8s |
| `/minio/health/ready` | Alias |
| `/minio/health/cluster` | Write quorum + pool-metadata gate + exclusive locks |
| `/minio/health/cluster/read` | Read quorum |

Antes de `FullReady`, S3 retorna `503` + `Retry-After: 5`. Admin/console/RPC
ignoram o gate externo, mas mantêm auth e dependências próprias.

Campos de `/health/ready`:
- `details.storage.ready`, `readQuorum`, `writeQuorum`;
- `details.storage.unavailableDrives[]` com pool/set/disk index, runtime state
  e hostOnline;
- `details.poolMetadata.status` (`writable`/`unavailable`);
- `details.lock.ready`.

Um write gate bloqueado **não** derruba `/health/ready`; ele aparece em
`/minio/health/cluster`. Use o probe certo para o objetivo:
- membership/leitura → `/health/ready`;
- aceitar novas escritas → `/minio/health/cluster`.

`RUSTFS_HEALTH_READINESS_CACHE_TTL_MS` (1000ms) cacheia a checagem;
`RUSTFS_HEALTH_PEER_READY_CHECK_ENABLE` (false) inclui peer health.

## Logs

- Formato estruturado (JSON) com `event`, `component`, `subsystem`, `state`/
  `result`, contexto e mensagem curta.
- Nível default: `error`; produção normalmente `info`, debug sob demanda.
- Em `production`, o default é log em arquivo; `RUSTFS_OBS_USE_STDOUT=true`
  também envia para stdout.
- Rotação: `RUSTFS_OBS_LOG_ROTATION_TIME`, `_KEEP_FILES`,
  `_MAX_TOTAL_SIZE_BYTES` (2 GiB), compressão `zstd`/`gzip`, retenção 30 dias.
- Nunca logar secrets, tokens, claims, payloads ou credenciais.
- Eventos operacionais úteis:
  - `disk_local_durability_mode`
  - `put_object_body_read_stalled`, `upload_part_body_read_stalled`
  - `replication_object_failed`
  - `storage_class_zero_redundancy`
  - `OIDC provider discovery blocked by outbound policy`
  - `scanner_pause_backlog` / `lifecycle_worker_state`
  - `SFTP server listening`, `host key file has insecure permissions`

`rustfs diagnose` analisa logs JSON offline (diretório, `.zip/.tar/.gz/.zst`,
`kubectl logs -`), sem abrir storage/rede. Use `--since 24h --format md`,
`--redact` para hashear identificadores e `--rules extra.json` para regras
customizadas; exit `2` = argumento/entrada inválida, findings não falham o
processo. Panics só aparecem se stderr foi coletado.

## Método de tuning

- Congele workload, durabilidade, topologia e versão; mude **um** knob por A/B.
- Meça PUT/GET stages, p95/p99, CPU/RSS, I/O e filas; não use throughput médio
  como única prova.
- `io_uring` é opt-in e exige restart; chunk é cap lógico, não RSS. Compare
  buffers/reads com o backend std na mesma carga.
- Multipart: o budget de EC limita blocos enfileirados, não a memória total.
  Valide com cgroup `memory.current/stat`, alocador e janela ociosa; reclaim só
  ocorre sem atividade contínua.
- Cleanup isolation troca espera por `SlowDown`; dimensione pending/workers para
  o burst real e confirme que a fila drena abaixo dos deadlines.

## Métricas: escopos e labels

| Escopo | Famílias | Significado |
|---|---|---|
| `collection_scope="local"` | `rustfs_system_drive_*`, `rustfs_node_disk_*` | Drives do nó que reporta, incluindo slots offline |
| `collection_scope="cluster"` | capacidade, health, objetos/buckets, erasure sets, `rustfs_cluster_drive_*` | Observação de um nó sobre o cluster |

Labels:
- `observer`: nó que reporta.
- `server`: dono do drive.
- `drive`: não é chave única; agrupe com `server` + `drive` (+ `disk_id`).
- `disk_id`: identidade física; substituição inicia série nova.
- `rustfs_cluster_id`: via resource attribute.

Freshness:
- `rustfs_storage_snapshot_last_success_timestamp_seconds`
- `rustfs_storage_snapshot_max_age_seconds`
- `capacity_stale_drives`, `capacity_missing_drives`

Série ausente = desconhecido, **não** zero. Use recording rules oficiais
(`.docker/observability/prometheus-rules/rustfs-storage.yml`) e valide com
`promtool`.

## Famílias de métricas relevantes

| Domínio | Exemplos |
|---|---|
| HTTP/S3 | requests, latência, bytes, falhas por status/método |
| PUT stages | `rustfs_s3_put_object_stage_duration_ms{stage=...}` |
| GET stages | `rustfs_io_get_object_stage_duration_seconds{path,stage}` |
| EC | `rustfs_ec_encode_inflight_bytes_current` |
| Drives | `rustfs_system_drive_*`, `rustfs_node_disk_*`, `rustfs_cluster_drive_*` |
| Capacidade | raw/usable/used, objetos, buckets, sets |
| Uso por bucket | `rustfs_cluster_usage_buckets_total_bytes`, `..._objects_count` |
| Scanner | ciclos, pressão, checkpoint, backlog, alertas |
| Heal | fila, tasks, MRF, replacement recovery |
| Replicação | online/downtime, replicados, bytes, failed, filas |
| Quota | reservas, protocolo, uso |
| KMS | operações, falhas, circuit breaker, cache, rotação, probes |
| ODM | requests, pulls, failures, queue, breaker, latência |
| Container | `rustfs_container_cpu_cores`, `rustfs_container_memory_bytes` |

## Admin/realtime e status

| Endpoint | Uso |
|---|---|
| `GET /rustfs/admin/v3/realtime` | Métricas ao vivo (`admin:GetMetrics`) |
| `GET /rustfs/admin/v3/scanner/status` | Config efetiva, ciclos, bitrot, disk budget, pause backlog |
| `POST /rustfs/admin/v3/background-heal/status` | Status do heal |
| `GET /rustfs/admin/v4/heal/replacement-recovery` | Recuperação de drive substituído |
| `GET /rustfs/admin/v3/pools/list` / `status` | Topologia e saúde por pool |
| `GET /rustfs/admin/v3/decommission/status` | Estado de decommission |
| `GET /rustfs/admin/v3/rebalance/status` | Estado de rebalance |
| `GET /rustfs/admin/v4/cluster/snapshot` | Snapshot de cluster |
| `GET /rustfs/admin/v4/runtime/capabilities` | Capacidades/storage classes |
| `GET /rustfs/admin/v3/quota-stats/{bucket}` | Uso e quota |
| `GET /rustfs/admin/v3/ilm/expiry/status` | Status de expiração |
| `GET/POST /profile/cpu`, `/profile/memory` | Profiling (ação admin) |

## Capacidade e usage

- Uso por bucket vem do scanner; inclui versões não-current, exclui bytes de
  delete markers.
- `rustfs_cluster_usage_buckets_objects_count` conta entradas/chaves, separado de
  versões e delete markers.
- Usage pode ficar stale; uma quota durável não depende do scanner para
  admissão, mas relatórios podem ficar `null` até um snapshot.
- Se o scanner estiver desligado, lifecycle/replicação por descoberta e usage
  param; heal/replication sob demanda ainda podem rodar.
- Após reparo de metadata ou cleanup, aguarde um ciclo completo antes de confiar
  no novo snapshot.

## Container e runtime

- CPU/memória efetivas vêm de cgroup v2 (`cpu.max`, `memory.max`), depois v1,
  depois host.
- Overrides: `RUSTFS_OVERRIDE_CPU_CORES`, `RUSTFS_OVERRIDE_MEMORY_BYTES`,
  `RUSTFS_DISABLE_CGROUP_DETECTION`.
- Logs de startup indicam `container resources (detected from cgroup|using host
  values|overridden by environment variables)`.

## Alertas recomendados

| Sinal | Ação |
|---|---|
| `/health/ready` 503 por >5 min | Verificar storage/IAM/lock quorum |
| `/minio/health/cluster` 503 com ready 200 | Write quorum ou pool metadata gate |
| `capacity_used / usable > 80%` | Expandir pool ou tiering |
| `capacity_stale_drives > 0` | Coletor/peer/rede |
| bitrot count crescendo | Heal/Deep scan, checar hardware |
| heal queue não drena | Lock/quorum/disco lento |
| replacement recovery != completed | Verificar slot/UUID/empty FS |
| replication `failed` subindo | Target/credenciais/TLS/limites |
| `failed_store_length` de notify subindo | Rejeição terminal |
| KMS `circuit_open` | Backend/KMS indisponível |
| quota `XRustfsQuotaExceeded` | Capacidade ou quota mal dimensionada |
| scanner `pause_backlog.persistence_state=degraded` | Ledger de pause inacessível |
| `set_disk_encode` P95 alto | Budget EC/RSS/threads |
| `set_disk_rename` P99 alto | fsync/durability/tail de commit |

## Diagnóstico rápido

```bash
rustfs info --json
rustfs info config
rustfs tls --path /etc/rustfs/tls
rustfs diagnose /var/log/rustfs --since 24h --format md
rustfs inspect --help          # leitura offline do disco
curl -fsS http://node:9000/health/ready | jq
rc admin info cluster local
rc admin pool status local 0 --by-id
```

## Fonte

`docs/operations/storage-metrics.md`;
`docs/operations/bucket-usage-metrics.md`;
`docs/operations/container-resource-detection.md`;
`docs/operations/logging-governance.md`;
`docs/operations/scanner-runtime-controls.md`;
`docs/architecture/readiness-matrix.md`;
`.docker/observability/`.
