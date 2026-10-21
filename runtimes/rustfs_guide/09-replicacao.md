# 09 — Replicação, migração e DR

## Quatro mecanismos diferentes

| Mecanismo | Direção | O que move | Autoridade | Quando usar |
|---|---|---|---|---|
| **Bucket replication** | push contínuo | novas versões/delete markers de um bucket | origem | cópia contínua para outro S3 |
| **Site replication** | bidirecional | buckets, IAM, policies, topologia, objetos | todos os peers | dois+ RustFS convergindo |
| **On-demand migration (ODM)** | pull sob demanda | objetos lidos (+ backfill opcional) | origem até o pull; local depois | cutover sem downtime de outro provedor |
| **ILM tiering** | push por regra | objetos frios | metadata local, dados remotos | reduzir capacidade local |

Não confunda site replication com bucket replication: site replication exige
APIs admin compatíveis entre RustFS; um S3 genérico só pode ser target de bucket
replication.

## Bucket replication

### Configuração

Pré-requisitos:
- Versioning habilitado no bucket de origem (e no destino, para fidelidade).
- Target S3 acessível, com credenciais e TLS válidos.
- Política do usuário de replicação com `s3:ReplicateObject`,
  `s3:ReplicateDelete`, `s3:GetObject`, `s3:GetObjectVersion`,
  `s3:PutObject`, `s3:DeleteObject` conforme o caso.
- `RUSTFS_REPLICATION_ALLOW_LOOPBACK_TARGET=true` só se o target for loopback.

Fluxo típico com `mc`:

```bash
mc admin bucket remote add local/src https://target.example.com \
  --access-key <ak> --secret-key <sk> --path auto

mc replicate add local/src \
  --remote-bucket 'arn:minio:replication::<id>:target' \
  --replicate "delete,delete-marker" \
  --existing-objects

mc replicate status local/src
```

O target é um ARN configurado no bucket. Operações de replicação usam as APIs
S3 do destino, não o Admin API.

### Validação de target

`GET /bucket?replication-check` (assinado) valida cada target. **É mutante**:
grava um probe de 8 bytes, cria delete marker, apaga a versão e limpa todos os
artefatos.

Fases: `Bucket`, `Versioning`, `ObjectLock`, `Put`, `VersionFidelity`,
`DeleteMarker`, `VersionDelete`, `Cleanup`.

- `VersionFidelity` verifica PUT e multipart com o version id da origem.
- Target que **minta** seus próprios version ids falha nessa fase com
  `BucketRemoteTargetVersionMismatch`; a replicação ainda converge via
  **target-version ledger** (metadata interna
  `replication-target-version-<arn>`).
- `Cleanup` com falha nunca é reportado como sucesso.
- Erros são limitados a 512 bytes e não expõem endpoint/credencial.

### Limites de forma e tamanho

O transporte é escolhido pela **forma de escrita original**, não pelo tamanho:

| Origem | Transporte |
|---|---|
| `PutObject` | `PutObject` no target |
| Multipart | replay do **mesmo layout de partes** |

Limites do target genérico:
- `PutObject` ≤ 5 GiB. Objeto >5 GiB escrito como single PUT **não replica**;
  reenvie como multipart.
- Multipart: cada parte ≥5 MiB (exceto última), ≤5 GiB, ≤10.000 partes, objeto
  ≤5 TiB.
- Partes são transferidas **sequencialmente**; não há retry por parte. Falha em
  qualquer parte falha o objeto inteiro e aborta o multipart no target.
- Retry é no nível do objeto (MRF/heal), então uma falha tardia reenvia tudo.

### Integridade e checksums

Default:
- Corpo plano com `Content-Length` exato, sem `aws-chunked`.
- Objeto single-part encaminha `x-amz-checksum-<algo>` da origem.
- Multipart é reconstruído e não carrega checksum de objeto.
- Managed-SSE não encaminha checksum.
- PUT com Object Lock sem checksum encaminha `Content-MD5` (ou CRC32 do SDK).
- Headers `x-rustfs-source-etag`, `x-rustfs-source-mtime`,
  `x-rustfs-source-version-id` (e gêmeos `x-minio-*`).
- ETag do target é comparado ao da origem para single-part MD5 não cifrado;
  divergência = `FAILED`, não `COMPLETED`.

Knobs:
| Variável | Default | Efeito |
|---|---|---|
| `RUSTFS_REPLICATION_STREAMING_CHECKSUMS` | desligado | Restaura trailer checksums `aws-chunked` |
| `RUSTFS_REPLICATION_REPLICA_ETAG_VERIFY` | ligado | Desliga comparação de ETag para targets que não usam MD5 |
| `RUSTFS_REPLICATION_ALLOW_LOOPBACK_TARGET` | `false` | Permite target loopback |

### Criptografia

| Origem | Comportamento |
|---|---|
| SSE-S3 | Origem decifra; envia intenção `AES256`; destino cifra com seu KMS |
| SSE-KMS | Origem decifra; envia `aws:kms` sem key id local; destino usa seu KMS |
| SSE-C | Ciphertext + metadata SSE-C passam; RustFS verifica evidência do target |
| Marcadores MinIO/RustFS desconhecidos | Falha, nunca encaminha como metadata comum |

Se o destino não consegue satisfazer a criptografia, a réplica fica `FAILED`;
nunca grava plaintext silenciosamente.

### Estado e recuperação

- MRF persiste intenções de replicação; flush máximo a cada 10s ou 1.000
  entradas.
- Health probe do target a cada 5s.
- Resync: `mc replicate resync start|status|cancel`; jobs concorrentes
  limitados (default 2, faixa 1–32).
- `replication-metrics` expõe online/downtime, contadores, bytes, fila e erros.
- `replication-reset` só com existing-object replication habilitado.

## Site replication

### Modelo

- **Control plane**: buckets, metadata de bucket, IAM, policies, topologia.
- **Data plane**: bucket replication de versões e deletes.
- `enabled: true` só significa >1 site configurado; **não** é veredito de saúde.

### Operação

```bash
mc admin replicate add site-a site-b site-c
mc admin replicate info site-a
mc admin replicate status site-a      # rode em mais de um site
mc admin replicate resync start site-a
mc admin replicate remove site-a site-b
```

Campos críticos:
- `sites`: topologia local; compare deployment IDs e endpoints nos dois lados.
- `pendingOperation`: journal durável de operação multi-step; ausência é o
  estado saudável.
- `retryStats.pending/failed/lastError`: backlog e escalonamento.
- `PeerErrors`: peer inalcançável; contadores ausentes **não** são zero.
- `BucketStats`, `PolicyStats`, `UserStats`, `GroupStats`: divergências.
- `Metrics.replMetrics`, `queued`, `inProgress`, `errors`.

Saúde = topologia igual, sem pending operation, sem peer error, sem escalação,
estado de bucket/IAM em sincronia, filas/erros estáveis ou caindo.

### Pending operations

- `remove`: topologia e ACKs persistidos antes de finalizar. Restaure acesso aos
  peers pendentes; se um peer sumiu de vez, um novo remove pode remover os
  unacknowledged ativos.
- `rotate-svc-acct`: mantém candidatos e ACKs até todos aceitarem; não apague
  credenciais candidatas.
- `endpoint-refresh`: atualiza endpoint/CA/TLS em todos os peers; um refresh
  pendente bloqueia outro endpoint edit. Journal fixa o payload.
- Não edite o objeto de estado à mão; o marker é o journal de crash recovery.
- Reconciler pesado: startup + a cada 600s. Drain leve: 30s.
- Reiniciar um nó saudável força um passe de startup, mas não substitui corrigir
  conectividade/credenciais/TLS.

### Outage e convergência

- Control-plane retry começa em 30s; snapshots e topologia em 600s.
- MRF de objetos persiste a cada 10s; health a cada 5s.
- Objetos descobertos pelo scanner têm limite superior:
  `RUSTFS_DATA_USAGE_UPDATE_DIR_CYCLES × max(RUSTFS_SCANNER_CYCLE, duração real)`.
  Default 16 ciclos; produção pode usar 4; 1 força re-descida por ciclo.
- Para recuperação imediata: `mc admin replicate resync start`.
- Descubra por backlog e taxa de `Metrics.errors`, não só pela fórmula.

### Pareamento com dados existentes

- Buckets presentes em >1 site exigem **versioning Enabled** em todos e o mesmo
  estado de Object Lock.
- Bucket presente em apenas um site é criado nos demais via backfill.
- Bucket não versionado compartilhado é rejeitado (merge poderia sobrescrever).
- Divergência de Object Lock é rejeitada.
- Em conflito: mantenha a cópia autoritativa, remova o bucket dos demais, rode
  add de novo e resync do site sobrevivente.

### IAM

- Mudanças IAM são entregues a cada peer; import em massa agenda snapshot
  completo por peer.
- Deleção falha é replayada antes do snapshot (para não recriar principal).
- High-water marks de deleção: 30 dias. Replay bodies: 256 entidades por peer.
- Grupo: disable converge para todos; mudança de membership **nunca** habilita
  um grupo desabilitado.
- Divergência IAM é incidente de segurança: user deletado pode continuar válido
  em peer isolado até replay/repair.
- Peer com entry escalada não recebe snapshots até repair.

### Criptografia

Mesma tabela da bucket replication. A origem decifra SSE-S3/KMS e o destino
re-cifra; SSE-C passa ciphertext com evidência do target.

### Upgrade/rollback

- Atualize um site inteiro consecutivamente, valide reconciliação, depois o
  próximo. Não rode site misto de versões intencionalmente.
- Antes de rollback, drene/repare purges de versão pendentes; código antigo pode
  liberar data dir de versão retida antes do ACK remoto.
- Target-version ledger é inofensivo no rollback, mas código antigo não o usa.

## On-Demand Migration (ODM)

- Pull de bucket S3/AWS/MinIO/RustFS/R2/GCS/Azure/GCS-native para um bucket
  local.
- Requer módulo ligado (`RUSTFS_ON_DEMAND_MIGRATION_ENABLED=true`, default on) e
  **licença de servidor**.
- Configuração por bucket em `on-demand-migration.json`:
  `PUT /rustfs/admin/v3/on-demand-migration/{bucket}` (com `?dry-run=true`).
- GET miss:
  - ≤ `inline_max_bytes` (default 16 MiB): source GET é tee para cliente e
    storage local.
  - > limite ou Range: stream through + background pull do objeto inteiro.
  - HEAD miss: proxy ao source, não armazena; `policy.head=local_only` retorna
    404.
- `policy.list_through=true` mescla listagem do source no `ListObjectsV2` (off
  por default).
- Backfill: `POST .../backfill?op=start|cancel`, checkpoint em
  `GET .../backfill`.
- Proteções: circuit breaker por source, negative cache, singleflight, limite de
  concorrência, fila limitada, bandwidth limit, anti-loop marker, outbound
  policy.
- Providers: `s3`, `aws`, `minio`, `rustfs`, `r2`, `gcs` (XML/HMAC), `azure`
  (Blob nativo), `gcs_native` (OAuth service account).
- Métricas `rustfs_on_demand_migration_*`.

ODM não substitui replicação: o source continua autoritativo até o pull; um
delete no source não apaga o local.

## Escolha rápida

| Objetivo | Use |
|---|---|
| Cópia contínua para outro S3 | Bucket replication |
| Active-active entre RustFS | Site replication |
| Migrar de outro provedor com cutover | ODM |
| Liberar capacidade local | ILM tiering |
| DR de leitura em outra região | Bucket/site replication |
| Backup pontual | Ferramenta S3 externa (não copie shards) |

## Fonte

`docs/operations/site-replication-operations.md`;
`docs/operations/replication-check.md`;
`docs/operations/replication-object-size-limits.md`;
`docs/operations/replication-outbound-transport.md`;
`docs/operations/on-demand-migration.md`;
`docs/architecture/s3-compatibility-matrix.md`.
