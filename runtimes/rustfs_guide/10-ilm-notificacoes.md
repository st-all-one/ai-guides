# 10 — ILM/tiering, notificações e audit

## Tiering (ILM para storage remoto)

### Backends

`TierType` suporta:
`S3`, `MinIO`, `RustFS`, `Wasabi`, `Aliyun`, `Tencent`, `Huaweicloud`,
`Azure`, `GCS`, `R2`.

- S3/MinIO/RustFS/R2 usam a família S3-compatible; Azure/GCS nativos têm
  clientes próprios.
- Endpoints privados (RFC 1918) são aceitos para tiers self-hosted; loopback só
  em build de debug para RustFS.
- Cloud tiers têm validação de endpoint canônico.

### Configuração

```bash
mc admin tier add s3 warm \
  --endpoint https://s3.example.com \
  --access-key <ak> --secret-key <sk> \
  --bucket rustfs-cold --prefix cold/

mc ilm rule add local/src \
  --transition-days 30 --transition-tier warm
```

Admin API equivalente: `GET/PUT/POST/DELETE /rustfs/admin/v3/tier*`
(`admin:ListTier`/`SetTier`).

Regras de lifecycle: ver `06-buckets-objetos.md`. Resumo: no máximo uma
transição e uma noncurrent transition por regra; sem chaining de tiers;
expiração vence transição; `Days` e `Date` são exclusivos.

### Leitura e restore

- Objeto transicionado mantém metadata local (`transition-status=complete`,
  `transition-tier`, `transitioned-object`, `transitioned-versionID`).
- GET faz **read-through** do tier remoto.
- Restore copia o objeto de volta para o tier local; headers de restore não
  autorizam cleanup sozinhos.
- Um objeto restaurado só pode ser limpo localmente após transição completa e
  replicação pendente resolvida; a versão lógica e os dados remotos permanecem.
- O restore preserva o ETag original e os ETags de parte; não recalcula sobre
  bytes cifrados/comprimidos.
- Objetos cifrados/comprimidos usam coordenadas de **stored size** no restore;
  versões antigas podem ter restaurado bytes desalinhados — re-restaure de uma
  release corrigida.

### Free versions e cleanup remoto

- Depois de uma expiração local-first, um marker durável
  (`tier-free-versionID`) representa o DELETE remoto pendente.
- Loop dedicado `tier-free-version-recovery` roda independente de scanner/heal;
  líder via lock `tier-free-version-recovery/leader.lock`.
- `RUSTFS_TIER_FREE_VERSION_RECOVERY_ENABLED=false` desliga **só** esse walk;
  não é mecânica de cleanup.
- Página: até 10.000 objetos lógicos, 100 buckets, 1.000 free versions
  enfileiradas. Sweep truncado espera ≥60s; falhas backoff 60s→10min; idle
  backoff até 10min com jitter.
- Marker persistido é a fonte de verdade do retry. Não apague.

### Version IDs remotos

- `transitioned-versionID` pode ser texto exato, UUID legado, `null` ou ausente.
- Só um estado `KnownDisabled` autoriza omitir `versionId`.
- IDs opacos (ex.: Backblaze B2) só são persistidos/limpos com o gate de frota:
  `RUSTFS_TIER_REMOTE_VERSION_STATE_WRITE=true` **e**
  `RUSTFS_TIER_REMOTE_VERSION_STATE_FLEET_CONFIRMED=true`.
- Sem prova de frota, cleanup ambíguo é retido, nunca "chuta" um ID.

### Remoção de tier

`force` pula a construção do driver e o probe do bucket, mas ainda exige:
- operações ociosas;
- prova completa de que não há referências persistidas;
- nenhuma transição/free version/delete journal/transaction ativa.

Não apague records para "destravar" a remoção.

### Manual transition

`POST /rustfs/admin/v3/ilm/transition/run` (`admin:SetTier`):

| Parâmetro | Contrato |
|---|---|
| `bucket` | obrigatório |
| `prefix`, `tier`, `dryRun` | estreitam a execução |
| `mode` | `enqueue_only` (default) ou `async` (job durável) |
| `maxObjects` | default 10.000, cap 100.000 |
| `maxDurationSeconds` | cap 3.600; checado entre páginas, não cancela listing em voo |

Status/cancel: `/ilm/transition/jobs/{job_id}`. Recovery:
`/ilm/recovery/records`, reconcile, exports.

### Timeouts e privacidade

| Variável | Default |
|---|---|
| `RUSTFS_TIER_REMOTE_CONNECT_TIMEOUT_SECS` | `10` |
| `RUSTFS_TIER_REMOTE_REQUEST_TIMEOUT_SECS` | `86400` |
| `RUSTFS_TIER_REMOTE_RESPONSE_BODY_IDLE_TIMEOUT_SECS` | `60` |

Valores zero falham a inicialização. Objetos enviados ao tier **não** carregam
headers SSE nem DEK wrapped; o `xl.meta` local mantém a criptografia para
read-through/restore.

## Notificações de eventos

### Modelo

Bucket notification é configurada por bucket e entrega eventos a targets
pré-configurados. O switch global é `RUSTFS_NOTIFY_ENABLE`.

Targets:
`webhook`, `amqp`, `kafka`, `mqtt`, `mysql`, `nats`, `postgres`, `pulsar`,
`redis`.

ARN: `arn:rustfs:sqs:<target_id>:<target_name>` (ex.:
`arn:rustfs:sqs::primary:webhook`).

### Configuração (webhook)

```bash
RUSTFS_NOTIFY_ENABLE=true
RUSTFS_NOTIFY_WEBHOOK_ENABLE_PRIMARY=on
RUSTFS_NOTIFY_WEBHOOK_ENDPOINT_PRIMARY=http://logstash:8080/events
RUSTFS_NOTIFY_WEBHOOK_QUEUE_DIR_PRIMARY=/var/lib/rustfs/events
RUSTFS_NOTIFY_WEBHOOK_AUTH_TOKEN_PRIMARY=...
RUSTFS_OUTBOUND_ALLOW_ORIGINS=http://logstash:8080
```

- `QUEUE_DIR` é obrigatório para durabilidade; sem ele, eventos podem se perder
  em restart.
- A fila é store-and-forward; eventos não confirmados são retidos.
- `SKIP_TLS_VERIFY` é inseguro; prefira `CLIENT_CA`.
- O endpoint precisa ser acessível **diretamente** (sem proxy, sem redirect) e
  passar pela outbound policy.

### Eventos

Famílias:

```
s3:ObjectCreated:*        Put, Post, Copy, CompleteMultipartUpload
s3:ObjectRemoved:*        Delete, DeleteMarkerCreated, DeleteAllVersions, NoOP
s3:ObjectAccessed:*       Get, Head, GetRetention, GetLegalHold, Attributes
s3:ObjectTagging:*        Put, Delete
s3:ObjectRestore:*        Post, Completed
s3:ObjectTransition:*     Complete, Failed
s3:ObjectReplication:*    Complete, Failed, MissedThreshold, ReplicatedAfterThreshold, NotTracked
s3:ObjectAcl:Put
s3:LifecycleExpiration:*  Delete, DeleteMarkerCreated, DelMarkerExpirationDelete
s3:IntelligentTiering
s3:Scanner:*              ManyVersions, LargeVersions, BigPrefix
```

Eventos internos de KMS/IAM vão apenas para o **audit sink**, nunca para
bucket notification.

### Regras de entrega

- Regra por prefixo/sufixo e lista de eventos.
- Concorrência: `RUSTFS_NOTIFY_TARGET_STREAM_CONCURRENCY` (20) e
  `RUSTFS_NOTIFY_SEND_CONCURRENCY` (64).
- NATS JetStream exige stream pré-provisionado, `queue_dir`, ack timeout
  10–120s (default 30), duplicate window compatível com o retry e
  `failed_store_length` monitorado.
- Rejeições terminais (payload grande, sequência errada, stream sealed) vão para
  o failed store; erros de conexão/credencial permanecem na fila viva.
- `RUSTFS_NOTIFY_TARGET_STREAM_CONCURRENCY` abaixo do backlog de targets
  aumenta duplicatas; dimensione o duplicate window.

NATS JetStream (opt-in, notify e audit):
- `RUSTFS_NOTIFY_NATS_JETSTREAM_ENABLE=true` (ou prefixo
  `RUSTFS_AUDIT_NATS_`), `..._STREAM_NAME` e `..._QUEUE_DIR` são obrigatórios;
  ACK timeout `10..120s` (default 30).
- A stream precisa existir, ser gravável, capturar o subject, ter ACK e não estar
  sealed. RustFS não cria a stream.
- Com retry de 5 tentativas e backoff base 2s, a duplicate window mínima é
  **274s** no timeout default; cada +1s de ACK soma +5s.
- Core NATS pode perder evento em restart; JetStream é at-least-once. Erros de
  conexão/credencial ficam na fila viva; rejeição terminal vai ao failed store.
- Dimensione `queue_limit` para a maior janela de outage tolerada; no limite,
  eventos novos são rejeitados (não sobrescreve a fila).

### Métricas

- `queue_length`
- `failed_store_length`
- `failed_messages`
- métricas por target no runtime de notificações

Alerta: `failed_store_length` subindo = rejeições terminais recorrentes.

## Audit

### Modelo

Audit registra operações administrativas, de identidade e KMS em um sink
separado. Switch global: `RUSTFS_AUDIT_ENABLE` (default `false`).

Targets: `webhook`, `amqp`, `kafka`, `mqtt`, `mysql`, `nats`, `postgres`,
`pulsar`, `redis`.

```bash
RUSTFS_AUDIT_ENABLE=true
RUSTFS_AUDIT_WEBHOOK_ENABLE_PRIMARY=on
RUSTFS_AUDIT_WEBHOOK_ENDPOINT_PRIMARY=https://siem.example.com/audit
RUSTFS_AUDIT_WEBHOOK_QUEUE_DIR_PRIMARY=/var/lib/rustfs/audit
RUSTFS_AUDIT_WEBHOOK_AUTH_TOKEN_PRIMARY=...
```

### Eventos relevantes

- `KmsKeyCreated`, `KmsKeyRotated`, `KmsKeyEnabled`, `KmsKeyDisabled`,
  `KmsKeyDeletionScheduled`, `KmsKeyDeletionCancelled`, `KmsKeyDeleted`,
  `KmsKeyAccessed`, `KmsServiceConfigured`, `KmsServiceStarted`,
  `KmsServiceStopped`.
- `IamIdentityCredentialChanged`, `IamIdentityAuthChallenge`.
- Operações admin (pools, rebalance, decommission, heal, tier, replicação,
  TLS, KMS, IAM).

O evento carrega `api.name`, `iamOperation` e campos seguros; nunca deve conter
secret, token, claim ou payload.

### Boas práticas

- Sink append-only/immutável fora do cluster.
- Fila local em volume persistente.
- Alertas para `AccessDenied`, mudanças de policy, rotação/deleção KMS, MFA e
  falhas de entrega.
- Não logar payload de objeto; audit é metadata/operação.
- Redija endpoints e credenciais antes de compartilhar diagnósticos.

## Fonte

`docs/operations/tier-ilm-debugging.md`;
`docs/operations/nats-jetstream.md`;
`docs/operations/amqp-notifications.md`;
`docs/operations/outbound-connection-policy.md`;
`crates/s3-types/src/event_name.rs`;
`crates/config/src/notify/*`;
`crates/config/src/audit/*`.
