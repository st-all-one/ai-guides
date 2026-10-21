# 12 — Ciclo de vida do cluster

## Layout imutável

Persistidos em `FormatV3`:
- número de endpoints do pool;
- número de sets e drives por set;
- posição do pool na lista;
- posição/UUID de cada disco.

No startup, `check_format_erasure_value_for_topology` compara o formato com a
configuração. Divergência falha com `PoolTopologyMismatch` (ou
`UnsupportedSnsdExpansion` para single-drive). **Não** apague `format.json` para
"resolver".

Nunca:
- sobrescrever um pool com mais/menos endpoints;
- mudar `RUSTFS_ERASURE_SET_DRIVE_COUNT` de um pool inicializado;
- reordenar volumes ou mover diretório de disco para outro slot;
- editar/apagar shards, `xl.meta` ou `.rustfs.sys` à mão;
- tratar cópia de arquivos como data movement.

## Planejamento

1. Defina failure domains por nó, rack, energia e rede.
2. Escolha a largura de set por pool (`2..16`), simétrica.
3. Escolha paridade STANDARD/RRS e valide no pool mais estreito.
4. Registre comando completo, ordem de endpoints, ordem de pools, set width e
   variáveis de storage class. Precisam ser idênticos em todo nó/restart.
5. Dê ownership exclusivo a RustFS em cada path.

Topologia não é garantia de HA: um pool single-node perde todos os shards com o
host; o startup loga `host_failure_data_unavailable` para pools multi-drive em um
único host.

## Startup e verificação

Ordem: parse de endpoints → validação de storage classes em todos os pools →
política de filesystem → init de discos locais → lock clients → format quorum →
store.

Verificação read-only:

```text
GET /rustfs/admin/v3/pools/list
GET /rustfs/admin/v3/pools/status?pool=<pool>[&by-id=true]
GET /rustfs/admin/v3/decommission/status[?pool=<pool>&by-id=true]
GET /rustfs/admin/v4/cluster/snapshot
GET /rustfs/admin/v4/runtime/capabilities
```

Confirme: número de pools, endpoints por pool, sets/largura, locais vs remotos,
sem flag legado, peers prontos, sem topology mismatch.

Teste de dados:
1. PUT/GET/HEAD/range/Copy/multipart de um objeto STANDARD e um RRS.
2. Derrube um drive/nó dentro da paridade; leitura continua, escrita conforme
   quórum.
3. Volte; fila de heal drena; bitrot para de crescer.
4. Todos os nós mostram a mesma topologia/snapshot.

## Expansão

Um pool **não cresce in-place**. Adicione um pool:

1. Planeje nós, drives e failure domain; ≥2 endpoints.
2. Prepare paths vazios e exclusivos.
3. Acrescente o pool aos argumentos em **todos** os nós, mantendo pools
   existentes, ordem, endpoints e set width.
4. Rolling restart.
5. Novas escritas são distribuídas entre pools; objetos antigos ficam onde estão.
6. Para mover dados antigos, rode rebalance. Restart **não** rebalanceia.

Single-node single-drive não expande; migre via S3.

## Rebalance

Precondições:
- >1 pool;
- nenhum decommission rodando/conflitante;
- `start`/`stop` sem query string.

```text
POST /rustfs/admin/v3/rebalance/start   → {"id": "<uuid>"}
GET  /rustfs/admin/v3/rebalance/status
POST /rustfs/admin/v3/rebalance/stop
```

Status: `id`, `pools[]` com `status`, `stopping`, `used`, `lastError`,
`cleanupWarnings`, `progress` (objects, versions, bytes, remainingBuckets,
bucket, object, elapsed, eta), `stoppedAt`, `stopPropagation`.

- Start propaga fence de admissão e workers aos peers; falha de propagação
  rollbacka para estado terminal e reporta peers que não rollbackaram.
- Stop fecha admissão, para workers locais/remotos e persiste o estado.
- Considere concluído só quando nenhum pool está `active`/`stopping`,
  `lastError` vazio/explicado, warnings entendidos, `pendingTerminalReload`
  false e objetos migrados legíveis.
- Rebalance/decommission copiam a **representação armazenada**; não os use como
  reparo de cifra/compressão nem remova a origem antes de validar GET/decrypt
  das amostras.
- Estado em `rebalance.bin`; **não apague** para destravar.
- `rc admin rebalance` tem alias `expand`; não existe API server-side `expand`.

## Decommission

Suportado apenas em multi-pool **não-legacy** (ellipsis). Rebalance em
andamento bloqueia.

```text
POST /rustfs/admin/v3/pools/decommission?pool=<a>[,<b>]
POST /rustfs/admin/v3/pools/decommission?pool=1&by-id=true
GET  /rustfs/admin/v3/decommission/status[?pool=1&by-id=true]
POST /rustfs/admin/v3/pools/cancel?pool=1&by-id=true
POST /rustfs/admin/v3/pools/clear?pool=1&by-id=true
```

- Targets validados em lote antes de persistir: unknown, duplicate, active,
  queued ou completed são rejeitados; failed/canceled precisam de clear, salvo
  listing entries não resolvidas (aí um novo start é o retry).
- Requests podem ir a qualquer nó; são encaminhados ao pool leader.
- Estados em `pool.bin`: `queued` → `active` → `completed`/`failed`/`canceled`.
- Worker único por entry; startup retoma não-terminais e pula terminais
  anteriores.
- Source pool em qualquer estado de decommission rejeita novos PUTs e novos
  multipart; PUT staged recebe `SlowDown`; multipart existente pode drenar
  enquanto não-terminal.
- `clear` remove metadata failed/canceled; nunca move dados de volta.
- `queuedBuckets` é inventário, não prova de worker vivo.
- Remova o pool dos argumentos só após `completed`, free versions/tier ownership
  convergidos e status igual em todos os nós.

## Heal e substituição de drive

### Admin heal

```text
POST /rustfs/admin/v3/heal/                    # root: cluster ou set
POST /rustfs/admin/v3/heal/<bucket>
POST /rustfs/admin/v3/heal/<bucket>/<prefix>
POST /rustfs/admin/v3/background-heal/status
GET  /rustfs/admin/v4/heal/replacement-recovery
```

Body: `recursive`, `dryRun`, `remove`, `recreate`, `scanMode`, `updateParity`,
`nolock`, `readRepair`, `pool`, `set`.

- Root heal exige `recursive=true` ou `pool`+`set`.
- Bucket heal sem prefixo é sempre recursivo.
- `readRepair=true` é rejeitado com `InvalidArgument`.
- `nolock` é aceito e forçado a `false`; admin heal sempre pega o lock.
- `clientToken` correlaciona start/status/stop; `forceStart`/`forceStop` são
  validados entre si.
- Overlap segue `RUSTFS_HEAL_OVERLAP_POLICY` (`merge` default).
- Heal recusa quando faltam mais shards que a paridade reconstrói ou quando a
  geometria não bate.

### Substituição de drive

1. Confirme read quorum do set (impossível em `EC:0`).
2. Anote pool/set/slot e o UUID do disco falho.
3. Substitua no **mesmo** endpoint/mount por um filesystem vazio, ownership
   RustFS. Não copie diretórios antigos; `format.json` copiado reivindica
   identidade já rastreada.
4. Ao voltar, o drive vazio não é membro do format quorum; o monitor tenta a
   cada 15s.
5. O heal de erasure set grava o formato no slot original via
   `heal_replacement_format` (intent automático em
   `.rustfs.sys/buckets/ahm-replacement/`) ou `heal_format` (admin heal).
6. Acompanhe `replacement-recovery`, background heal, disk health e bitrot.
7. Concluído quando recovery reporta `completed` para a instância e objetos
   amostrados têm `xl.meta` + parts no novo drive.

Se o set perdeu mais drives que a paridade, heal não reconstrói; restaure de
replicação, tier ou backup.

## Restart e recuperação

### Rolling restart

- Um nó por vez.
- Argumentos idênticos.
- Espere `/health/ready` **e** peer re-admission antes do próximo.
- Re-admission: maioria estrita do set vê os drives do nó online; limitada por
  `RUSTFS_STARTUP_READINESS_MAX_WAIT_SECS` (120s), fail-open.
- Após restart, o nó pode estar Ready antes dos sobreviventes recontarem os
  drives; o Helm usa um delay pós-Ready para evitar derrubar dois membros do
  mesmo set.
- Não pare o cluster inteiro para "reiniciar mais rápido".

### Recuperação por estado

| Estado | Ação |
|---|---|
| Restart normal | Reload de pool metadata, `rebalance.bin`, decommission queue, heal records |
| Rebalance | Leia status; trate active/stopping, erros, cleanup, stop propagation |
| Decommission | Entries não-terminais retomam; failed/canceled sobrevivem até clear/retry |
| Root heal | Shutdown gracioso persiste `root-heal-<task>.json` e replay com o mesmo task id |
| Unclean shutdown | Marker deixado → heal completo de todo set local |
| Scanner pause backlog | Não edite `.scanner-pause-backlog.json`; preserve records e escale |

### Scanner pause backlog

- Um ledger `.scanner-pause-backlog.json` inválido/ilegível bloqueia ciclos,
  inclusive rebuild de usage.
- Capture snapshots timestamped antes/depois do retry.
- `pause_backlog.replica_diagnostics` lista set, missing/valid/invalid/
  future_schema/unavailable, revision CAS, gerações.
- Restaure acesso/locks sem editar o ledger.
- Um commit completo sobrevivente ou rollback estável igual permite recuperação
  automática.
- Sem prova de commit/rollback, preserve os objetos originais e escale. **Não**
  há force-reset suportado para autoridade perdida.

## Recuperação de estados persistidos

- Bucket sumiu em um drive, mas a metadata autoritativa existe: admin heal
  `recursive=true` no bucket (ou cluster) com `scanMode=2`; guarde o
  `clientToken` e confira `execution` **e** `coverage`. `recreate=true` é opção
  de recuperação, não permissão para ressuscitar bucket deletado via S3.
- Bucket removido fora do S3: `POST /rustfs/admin/v3/recover-orphaned-bucket/{bucket}`
  com `expectedIncarnationId` exato. Verifica todos os discos, recusa se houver
  volume/offline/identidade errada e é recusado com site replication ativo.
- Metadata de bucket: `GET /rustfs/admin/v3/export-bucket-metadata` (backup) ou
  `?diagnostic=true` (ZIP sem credenciais); importe com
  `PUT /rustfs/admin/v3/import-bucket-metadata`. Diagnóstico nunca é backup
  restaurável. Target de replicação ilegível pode ser substituído via
  `PUT /rustfs/admin/v3/set-remote-target?bucket=...&replace-unreadable=true`.
- Delete interrompido: recovery roda no startup e em heal; use heal escopado
  `dryRun` e depois real. `RUSTFS_DELETE_RECOVERY_TIMEOUT_SECS=900`. **Não**
  remova `delete-data.*`, `reserve-delete-data.*` ou diretórios de transação à mão.
- `pool.bin` V3: só ative `RUSTFS_POOL_META_V3_WRITE` +
  `RUSTFS_POOL_META_V3_FLEET_CONFIRMED` com a frota inteira qualificada. Startup
  distingue `incompatible` (não sobrescreve), `corrupt` (só réplica commitada) e
  `recovery required` (fonte escolhida por operador). Após V3 commitado, não há
  downgrade. Não apague `pool.bin`/`pool.bin.identity`.
- Drive substituído: preserve `.rustfs-replacement.lock` e `healing.bin`; não os
  apague para “destravar”. `GET /rustfs/admin/v4/heal/replacement-recovery`
  mostra gerações blocked/retry. Conclusão exige proof da nova identidade.

## Exclusão mútua

| Operação | Com rebalance | Com decommission |
|---|---|---|
| PUT/DELETE/multipart complete | Object lock | Source pool rejeita publicação |
| Decommission | Rejeitado | Fila serial |
| Rebalance | Só multi-pool | Rejeitado se conflita |
| Admin heal | Object lock | Repara, não muda estado |
| Drive replacement | Não muda layout | Evite no source pool |

Não faça: mudar endpoints durante rebalance/decommission; apagar
`.rustfs.sys`, `rebalance.bin`, `pool.bin`, root-heal records; rodar heal
manual + cópia de arquivos + troca de drive no mesmo pool; tratar HTTP 200 de
start como conclusão.

## Checklists

Após start/expansão:
- endpoints/ordem iguais em todos os nós;
- topologia == `FormatV3`;
- peers prontos e pool metadata gate aberto;
- novos endpoints únicos e exclusivos;
- GET/HEAD/range/multipart OK.

Após rebalance:
- nenhum pool active/stopping;
- `lastError` vazio/explicado;
- cleanup warnings tratados;
- `pendingTerminalReload=false`;
- objetos migrados legíveis.

Após decommission:
- status `completed`;
- source rejeita writes;
- free versions/tier/listing convergidos;
- argumentos atualizados em todos os nós antes de desconectar drives.

Após heal/replacement:
- recovery `completed`;
- slot/UUID corretos;
- fila drenada;
- bitrot não crescendo;
- versões atuais e históricas legíveis;
- sem diretórios temporários.

## Mapa `rc`

```bash
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
rc admin heal start local --bucket logs --prefix 2026/ --scan-mode deep
rc admin heal status local --client-token <TOKEN>
rc admin heal stop local --client-token <TOKEN>
```

## Fonte

`docs/operations/cluster-lifecycle-operations.md`;
`docs/operations/rolling-restart.md`;
`docs/operations/replacement-generation-recovery.md`;
`docs/operations/delete-transaction-recovery.md`;
`docs/operations/bucket-metadata-recovery.md`;
`docs/operations/pool-metadata-recovery.md`;
`docs/operations/bucket-heal-recovery.md`;
`docs/architecture/decommission-compatibility.md`;
`docs/architecture/erasure-coding.md`.
