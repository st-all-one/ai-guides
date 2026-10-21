# 01 — Arquitetura e modelo de dados

## Camadas

O binário `rustfs` compõe crates; a direção de dependência é **para baixo**:

```
server/        HTTP, TLS, CORS, compressão, middleware, shutdown
admin/         Admin API, console, handlers
app/           use-cases: object, bucket, multipart
storage/       tradução S3, ecfs, SSE, RPC, concorrência
ecstore/       engine erasure-coded: pools, sets, discos, metadata
rio/ io-core/  pipeline de leitura/escrita, buffers, backpressure
```

Invariantes centrais (`ARCHITECTURE.md`):
- `ecstore` não serve HTTP nem o protocolo S3; opera sobre abstrações de storage.
- Apenas o crate `rustfs` conecta tudo.
- Erros de biblioteca usam `thiserror` com nomes descritivos.
- O engine de erasure coding é crate-private.

## Fluxo de uma requisição PUT

```
HTTP request
  → server (TLS, auth, routing, compression)
    → app/object_usecase (validation, policy, lifecycle)
      → storage/ecfs (erasure coding, encryption, checksums)
        → ecstore (disk pool selection, data distribution)
          → rio (encrypt → compress → hash → write)
            → io-core (buffer pool, profiling, admission)
              → local disk / remote disk via RPC
```

O caminho inverso (GET) lê metadados no quorum, verifica bitrot, decodifica a
partir de pelo menos `K` shards e enfileira read-repair se algum shard faltar.

## Hierarquia de armazenamento

| Nível | Definição |
|---|---|
| **Pool** | Lista de endpoints com layout persistido. Ordem e posição importam. |
| **Erasure set** | Partição uniforme dos drives de um pool. Largura `N ∈ 2..16`. |
| **Drive** | Um endpoint local (diretório em filesystem POSIX) ou remoto. |
| **Shard** | Fatia de 1 MiB codificada de um objeto, gravada em um drive. |

Regras:
- O set size é o maior divisor simétrico do GCD dos tamanhos dos pools,
  preferindo menos sets; `RUSTFS_ERASURE_SET_DRIVE_COUNT` pode fixar uma largura
  já válida, nunca ultrapassar 16.
- Um deployment single-drive roda `N=1`, paridade 0, por um caminho separado.
- Objetos são distribuídos para um set por hash (`sip_hash` em V2/V3); dentro do
  set, os shards rotacionam por `CRC32("bucket/object") % N`.

## Layout em disco

```
{drive}/
├── {bucket}/
│   └── {object}/
│       ├── xl.meta                 # metadados versionados + inline data
│       └── {data-dir}/part.N      # shards externos
└── .rustfs.sys/                   # namespace interno (IAM, config, buckets)
```

- `xl.meta` é **byte-compatível com MinIO XL2** para os formatos cobertos.
- Objetos pequenos podem ser **inline** dentro do `xl.meta`.
- Metadados internos usam **dois prefixos**: `x-rustfs-internal-*` e
  `x-minio-internal-*`; a escrita emite ambos, a leitura prefere RustFS.
- `.rustfs.sys` é o meta-bucket vivo; `.minio.sys` é fonte de importação.

## Metadados e versões

- Container: magic `XL2 `, major/minor, meta msgpack, CRC xxh64, inline blob.
- `header_ver` e `meta_ver` aceitam versões antigas e rejeitam apenas futuras.
- Versões podem ser objeto, delete marker ou legado; o `VersionType` numérico é
  contrato de formato.
- `ErasureInfo` guarda `data_blocks`, `parity_blocks`, `block_size`, `index`,
  `distribution` e checksums.
- A geometria é **por objeto**: mudar o default de paridade não reescreve nada.
- O backend de codec é escolhido pelos metadados do objeto (`uses_legacy`), nunca
  por toggle de runtime.

## Quorum (resumo normativo)

| Operação | Quorum |
|---|---|
| GET/HEAD (payload) | `K = N − M` metadados/shardes |
| Decode | `≥ K` shards |
| PUT/UploadPart/Complete | `K`; `K+1` se `K == M` |
| Delete marker / version delete | `N/2 + 1` (maioria) |
| Escrita interna (`max_parity`) | paridade `N/2` |

Consequências:
- Escrita abaixo do quorum **nunca** retorna sucesso; rollback é best-effort e
  resíduos são reconciliados por heal/scanner.
- Leitura abaixo de `K` falha fechada; nunca trunca silenciosamente.
- Leitura com `K ≤ disponíveis < N` é servida e agenda read-repair.
- Metadados vencedores são escolhidos por hash de identidade de conteúdo; campos
  de status de replicação são excluídos para não dividir o quorum.

## Consistência e durabilidade

- `strict` (default): fsync de shards, `xl.meta`, backups e diretórios antes do
  200 OK.
- `relaxed`: fsync apenas dos payloads de shards/partes; metadados ficam no page
  cache. Pode perder uma versão recente em queda de energia.
- `none`: nenhum fsync no data path.
- `legacy-off`: semântica histórica sem fsync algum; só via
  `RUSTFS_DRIVE_SYNC_ENABLE=false`.
- Namespaces `.rustfs.sys`/`.minio.sys` são pinados em `strict`, exceto em
  `legacy-off`.

## Readiness e admissão

`FullReady` efetivo:

```text
storage_ready && iam_ready && lock_quorum_ready && peer_health_ready
```

- `peer_health_ready` é `true` por default; só entra no gate com
  `RUSTFS_HEALTH_PEER_READY_CHECK_ENABLE=true`.
- Antes de `FullReady`, a API S3 responde `503` com `Retry-After: 5`.
- `/health` (liveness) não depende de storage/IAM/quorum.
- `/health/ready` reflete **read quorum**, IAM e shared-lock quorum; é o sinal de
  membership do Kubernetes.
- `/minio/health/cluster` exige **write quorum**, pool-metadata write gate e
  exclusive-lock quorum.
- Em cluster distribuído, o startup espera **peer re-admission** (maioria estrita
  de cada set vê os drives deste nó online), limitado por
  `RUSTFS_STARTUP_READINESS_MAX_WAIT_SECS` (120s), fail-open com WARN.
- Se um pool está com escrita bloqueada (`pool_meta_write_blocked`), `/health/ready`
  não cai; a readiness de escrita do cluster cai.

## Recursos de background

| Serviço | Função |
|---|---|
| Scanner | Inventário, usage, detecção de lifecycle/transição, bitrot, heal hints |
| Heal manager | Reparo de shards/metadados; MRF, admin heal, replacement recovery |
| Notifier | Entrega de eventos de bucket com fila store-and-forward |
| Audit | Sink de auditoria (operações administrativas e de identidade) |
| Replication | Bucket e site replication, MRF, resync |
| Lifecycle | Expiração, transição para tier, cleanup de versões |
| KMS | Gestão de chaves e envelopes de DEK |
| Capacity | Uso por bucket, quotas, snapshots de capacidade |

O scanner é o dono da descoberta de lifecycle e replicação; desligá-lo pausa
essas descobertas, mesmo que heal/replicação ainda possam rodar sob demanda.

## Portas, processos e escalabilidade

- Um processo `rustfs` por nó; todos os pools são servidos pelo mesmo listener.
- O listener HTTP abre cedo, mas S3 fica atrás do gate de readiness.
- Admin/health/internode RPC ignoram o gate HTTP externo; autorização própria
  continua valendo.
- Distribuição é **shared-nothing** no data path: cada nó fala com seus discos
  locais e com peers via RPC autenticado.
- A topologia é simétrica: todos os nós recebem a mesma lista de volumes.

## Compatibilidade de formato

- RustFS escreve o formato atual e lê formatos RustFS antigos e dados migrados
  de MinIO.
- `xl.meta` não cifrado, inline, multipart, versionado e delete markers são
  legíveis; `metadata.bin` e IAM do MinIO são importados.
- Objetos MinIO cifrados (SSE-S3/KMS/C) **falham fechado** no build padrão; o
  build `rio-v2` lê SSE-S3/KMS com a master key correspondente e SSE-C com a
  chave do cliente.
- MinIO lendo drives RustFS não é suportado (`.rustfs.sys` vs `.minio.sys`).

## Fonte

`ARCHITECTURE.md`; `docs/architecture/erasure-coding.md`;
`docs/architecture/runtime-lifecycle.md`; `docs/architecture/readiness-matrix.md`;
`docs/architecture/minio-file-format-compat.md`;
`docs/operations/durability-modes.md`;
`crates/ecstore/src/layout/disks_layout.rs`,
`crates/ecstore/src/config/storageclass.rs`,
`crates/ecstore/src/set_disk/`.
