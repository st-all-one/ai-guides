# 14 — Troubleshooting

## Proxy/CDN

| Sintoma | Causa provável | Correção |
|---|---|---|
| PUT grande trava; pequenos passam | `Content-Length` não chega completo; proxy buffering/re-chunk | Desligue compressão e buffering; preserve o corpo byte-a-byte |
| `socket hang up` / `ECONNRESET` em PUT | Keep-alive do proxy > `RUSTFS_HTTP1_HEADER_READ_TIMEOUT` (75s) | Reduza keepalive upstream para <75s ou desligue |
| `SignatureDoesNotMatch` | `Host`/`x-amz-*` reescritos, `Accept-Encoding` alterado | Encaminhe headers assinados intactos; `Accept-Encoding: identity` |
| Multipart falha no complete | Proxy remove `ETag` | Preserve `ETag` na resposta |
| Cloudflare: uploads grandes falham, pequenos passam | Orange-cloud bufferiza/re-chunka | Use DNS-only (grey cloud) no endpoint S3 |
| Console quebra atrás de tunnel | `Content-Length` perdido | Não re-chunke; preserve framing |
| Upload part sem length | `MissingContentLength` (411) | Cliente deve enviar tamanho lógico; proxy não pode remover |

Diagnóstico: bypass o proxy e mande direto em `:9000`; se funciona, o defeito é
forwarding. Ver `docs/operations/reverse-proxy.md`.

## Readiness e quórum

| Sintoma | Significado | Ação |
|---|---|---|
| `/health` 200, `/health/ready` 503 | Falta storage/IAM/shared lock quorum | Leia `details`; verifique drives, IAM, lock peers |
| `/health/ready` 200, `/minio/health/cluster` 503 | Write quorum, pool metadata gate ou exclusive lock | Verifique `poolMetadata`, drives write, locks |
| S3 503 com `Retry-After: 5` | Ainda não `FullReady` | Espere startup; verifique `startup_finalization_pending` |
| `startup_finalization_pending` por muito tempo | Peer re-admission esperando maioria | Verifique rede/RPC; limite `RUSTFS_STARTUP_READINESS_MAX_WAIT_SECS` |
| `ErasureReadQuorum` | Menos de `K` shards/metadados | Restaure drives; heal; verifique se passou da paridade |
| `ErasureWriteQuorum` | Menos de `K` (ou `K+1`) discos graváveis | Restaure quórum; não insista no PUT |
| Delete funciona com GET/PUT falhando | Delete usa maioria, não data quorum | Não interprete delete OK como set saudável |
| `EC:0` com um drive offline | Comportamento esperado | Restaure o drive; não há leitura degradada |
| `pool_meta_write_blocked` / `pool_metadata_recovery_pending` | `pool.bin` sem quórum/identidade | Restaure discos/peers; **não** apague metadata; leia reason/phase |
| Enxurrada de `Remote lock RPC timed out` + `GOAWAY too_many_resets` | Lock peer lento; timeout não mata o stream | Verifique o serviço de lock; ajuste `RUSTFS_OBJECT_LOCK_RPC_*` com métricas |
| `admin info` lento/timeout | Peer probe agregando disco em recuperação | Ajuste `RUSTFS_ADMIN_PEER_PROBE_TIMEOUT_SECS` (1–60) |

## Topologia e startup

| Erro | Causa | Correção |
|---|---|---|
| `PoolTopologyMismatch` | Endpoints/ordem/set width diferentes do `FormatV3` | Restaure os argumentos originais; **não** apague `format.json` |
| `UnsupportedSnsdExpansion` | Tentou expandir single-drive | Migre via S3 para novo deployment |
| `must use distinct physical disks` | Dois endpoints no mesmo volume | Um endpoint por disco físico |
| Filesystem não suportado | NFS/CIFS/FUSE/etc. | Use POSIX local; `RUSTFS_UNSUPPORTED_FS_POLICY=fail` |
| Startup aborta com RPC secret | Peers remotos + credenciais default/sem segredo derivável | Defina o mesmo `RUSTFS_RPC_SECRET` em todos os nós |
| `no durable bootstrap identity or pool.bin` | Bootstrap de multi-pool inconsistente | Verifique primeira inicialização; não apague metadata |

## Storage e durabilidade

| Sintoma | Causa | Correção |
|---|---|---|
| Objeto confirmado sumiu após queda | `relaxed`/`none`/`legacy-off` | Use `strict`; recupere de réplica/backup; heal de unclean shutdown |
| `xl.meta` vazio/ilegível | Corrupção de metadata | Preserve o diretório; heal de réplicas; não trate como objeto ausente |
| Quota falha fechada após corrupção | Snapshot de usage incompleto | Repare; aguarde ciclo completo do scanner |
| Bitrot crescendo | Hardware/mídia | Deep scan, substitua drive, verifique cabos/controladora |
| Heal não reconstrói | Faltam mais shards que a paridade | Restaure de replicação/tier/backup |
| ListObjects lento/timeout em prefixo grande | Walk stall budget | Ajuste `RUSTFS_DRIVE_WALKDIR_STALL_TIMEOUT_SECS`; profile I/O |
| GET timeout durante PUT/heal | Contenção de object lock/I/O | Diagnostique lock; não aumente timeout sem causa |
| `FileCorrupt`/`bitrot hash mismatch` em objeto `EcN=0` | Sem paridade para reconstruir | Restaure de backup/réplica; preserve `xl.meta`/`part.N`; não edite |
| `deleteRecovery` pending/blocked/failed | Delete interrompido ou participante indisponível | Mantenha transações; heal escopado dry-run e depois real; ajuste `RUSTFS_DELETE_RECOVERY_TIMEOUT_SECS` |

## KMS/SSE

| Erro | Causa | Correção |
|---|---|---|
| `400 KMS.NotFoundException` | Chave removida/inexistente | Restaure/recrie a chave; rekey/rewrite |
| `403 AccessDenied` em SSE-KMS | Grant/policy KMS negada | Ajuste `KMSKeyUser`/policy |
| `503` em `aws:kms` | KMS configurado mas parado/indisponível | `POST /kms/reload`/`start`; verifique backend |
| `400 InvalidRequest` em `aws:kms` | KMS nunca configurado ou key id ausente | Configure KMS/default key |
| `501 NotImplemented` | Backend não suporta a operação | Troque de backend |
| Objetos MinIO cifrados ilegíveis | Build padrão falha fechado | Use `rio-v2` com a master key correta ou re-cifre no MinIO |
| SSE-C rejeitado | Sem TLS / headers incompletos | Use TLS e o trio de headers completo |
| ETag sumiu em listing | Objeto cifrado antigo/sem marker | `HeadObject` autenticado |

## Replicação

| Sintoma | Causa | Correção |
|---|---|---|
| `FAILED` com `replica etag mismatch` | Target não usa MD5 como ETag | `RUSTFS_REPLICATION_REPLICA_ETAG_VERIFY=false` |
| Objeto >5 GiB não replica | Foi escrito como single PUT | Reenvie como multipart |
| `EntityTooSmall` | Layout de partes <5 MiB | Reenvie com partes válidas |
| `EntityTooLarge` | Parte >5 GiB ou target menor | Ajuste part size/cliente |
| `VersionFidelity` falha | Target minta version ids | Esperado; use ledger/`replication-check` para validar mutações |
| Replicação para com 403 | Falta `ReplicateObject`/`ReplicateDelete` | Ajuste policy do usuário de replicação |
| `pendingOperation` preso | Peer inacessível/credencial/TLS | Restaure peer; aguarde 600s ou reinicie nó saudável |
| IAM divergente | Deleção/replay pendente | Repair explícito; trate como incidente |
| `Metrics.retries` sempre 0 | Não é retry por evento; é scanner/MRF | Monitore `errors` e backlog |
| Duplicatas NATS | Duplicate window < retry span | Aumente a janela ou reduza concorrência |

## ILM/tiering

| Sintoma | Causa | Correção |
|---|---|---|
| `NoSuchVersion` no GET de tiered | `transitioned-versionID` ausente/ambíguo | Inspecione estado; probe/reconcile; não chute versionId |
| Tier não remove | Referências/free versions/transações ativas | Aguarde idle; resolva records; não force sem prova |
| Restore desalinhado | Release antiga com bug de stored size | Re-restaure de release corrigida ou backup |
| `rotation_due` inesperado | Idade/wraps acima do limite | Rotacione com um único owner |
| Manual transition não anda | Limite de objetos/tempo | Ajuste `maxObjects`/`maxDurationSeconds`; use job async |
| Free version pendente | Cleanup remoto falhou | Verifique marker, permissões e endpoint; não apague |

## Scanner/quota

| Sintoma | Causa | Correção |
|---|---|---|
| Usage stale | Scanner desligado ou ciclo incompleto | Ligue scanner; aguarde ciclo; verifique `scanner/status` |
| Quota 503 | Usage ausente em quota legada | Ligue scanner ou migre para protocolo v2 |
| `pause_backlog.persistence_state=degraded` | Ledger inacessível | Restaure storage/locks; não edite o JSON |
| Scanner não converge | Escrita contínua/dirty usage | Verifique geração dirty por bucket; ajuste `DATA_USAGE_UPDATE_DIR_CYCLES` |
| `replica_diagnostics` missing/invalid | Membership inconsistente | Restaure peers; preserve snapshots; escale |

## Notificações/audit

| Sintoma | Causa | Correção |
|---|---|---|
| Nenhum POST chega | `RUSTFS_NOTIFY_ENABLE` off, target off, regra ausente | Verifique os três níveis |
| Target privado bloqueado | Outbound policy | Adicione origem exata em `RUSTFS_OUTBOUND_ALLOW_ORIGINS` |
| Eventos somem em restart | Sem `QUEUE_DIR` persistente | Configure volume durável |
| Fila não drena | Servidor não ACK / credencial / subject | Verifique conectividade e stream |
| Duplicatas | Retry + duplicate window curto | Aumente janela; dimensione concorrência |
| `failed_store_length` sobe | Rejeição terminal | Corrija payload/sequência/stream |

## OIDC/SSO

| Sintoma | Causa | Correção |
|---|---|---|
| Provider não lista | Falha de load/restart pendente | Cheque env, logs, reinicie |
| Discovery bloqueado | IdP privado sem allowlist | Adicione origem exata e reinicie |
| `invalid redirect_uri` | Callback divergente | Use exatamente `/rustfs/admin/v3/oidc/callback/<id>` |
| Sem `code`/`state` | Proxy dropou query | Preserve URL completa |
| Sem `id_token` | Scope `openid` ausente / fluxo OAuth-only | Use authorization code + `openid` |
| Falha de assinatura | Issuer/audience/JWKS/alg | Compare discovery e config |
| Login OK, acesso negado | Claim não casa policy | Emita array plano = nomes de policy; sem `/` |
| Sessão expira em ~1h | Default de sessão | Ajuste `RUSTFS_CONSOLE_OIDC_SESSION_DURATION` (não `AUTH_TIMEOUT`) |

## SFTP/FTPS

| Sintoma | Causa | Correção |
|---|---|---|
| Startup SFTP falha | `HOST_KEY_DIR` ausente/inválido | Forneça chave decodificável |
| `host key file has insecure permissions` | Arquivo group/other-readable | `chmod 600/400` em **todos** os arquivos |
| Upload SFTP rejeitado | Resume/append/edição in-place | Stream sequencial desde offset 0 |
| SFTP lento em arquivo grande | Rename = copy+delete | Evite rename de grandes objetos |
| FTPS >156.25 GiB falha | Limite de 10.000 partes × 16 MiB | Aumente part size no cliente |
| FTPS cancelado deixa lixo | Cleanup sem permissão | Conceda `AbortMultipartUpload` ou use lifecycle |

## Segurança

| Sintoma | Causa | Correção |
|---|---|---|
| `403` com header `x-amz-*` | Header não assinado | Assine todos os headers que alteram a operação |
| Acesso amplo demais | Policy `admin:*`/`readwrite` em workload | Aplique least privilege |
| Root não troca senha | Limitação de design | Reconfigure via ambiente/restart; não renomeie root |
| 2FA não habilita | `RUSTFS_IAM_MASTER_KEY` ausente | Configure a master key |
| 2FA não protege SDK | Design: SigV4 direto não é gated | Rotacione chaves e use STS/policies |
| Console exposto | Bind público sem auth | TLS + OIDC + network policy |

## Comandos de coleta

```bash
rustfs --version
rustfs info --json > info.json
rustfs tls --path "$RUSTFS_TLS_PATH"
rustfs diagnose /var/log/rustfs --redact
curl -fsS http://node:9000/health/ready | jq .
curl -fsS http://node:9000/minio/health/cluster -i
rc admin pool list local
rc admin pool status local 0 --by-id
rc admin decommission status local
rc admin rebalance status local
mc replicate status local/bucket
mc admin replicate status site-a
```

Ao escalar, inclua: versão/build, topologia, argumentos, variáveis relevantes
(sem segredos), snapshots de health/status, logs estruturados e horário.

## Fonte

`docs/operations/reverse-proxy.md`;
`docs/operations/drive-timeout-tuning.md`;
`docs/operations/object-lock-contention.md`;
`docs/operations/s3-write-failure-diagnostics.md`;
`docs/operations/lock-rpc-storm-protection.md`;
`docs/operations/admin-peer-probe-timeout.md`;
`docs/operations/delete-transaction-recovery.md`;
`docs/operations/replication-*`;
`docs/operations/tier-ilm-debugging.md`;
`docs/operations/oidc-*`;
`docs/operations/sftp.md`.
