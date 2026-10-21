# 99 — Exemplo completo de deployment

Exemplo de referência para um nó único com 4 drives, TLS, OIDC, notificações e
observabilidade. Em produção multi-nó, replique o serviço em cada host e use a
lista de endpoints comum.

## `docker-compose.yml`

```yaml
services:
  rustfs:
    image: rustfs/rustfs:1.0.2
    container_name: rustfs
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      RUSTFS_VOLUMES: /data/rustfs{0...3}
      RUSTFS_ADDRESS: 0.0.0.0:9000
      RUSTFS_CONSOLE_ENABLE: "true"
      RUSTFS_CONSOLE_ADDRESS: 0.0.0.0:9001
      RUSTFS_SERVER_DOMAINS: s3.example.com
      RUSTFS_REGION: us-east-1

      RUSTFS_ACCESS_KEY_FILE: /run/secrets/rustfs-access
      RUSTFS_SECRET_KEY_FILE: /run/secrets/rustfs-secret
      RUSTFS_RPC_SECRET: ${RUSTFS_RPC_SECRET:?set in .env}
      RUSTFS_IAM_MASTER_KEY: ${RUSTFS_IAM_MASTER_KEY:?set in .env}

      RUSTFS_TLS_PATH: /opt/tls
      RUSTFS_TLS_RELOAD_ENABLE: "true"

      RUSTFS_UNSUPPORTED_FS_POLICY: fail
      RUSTFS_DURABILITY_MODE: strict
      RUSTFS_STORAGE_CLASS_STANDARD: EC:2
      RUSTFS_SCANNER_SPEED: default

      RUSTFS_OBS_ENDPOINT: ${OTEL_ENDPOINT:-http://otel-collector:4318}
      RUSTFS_OBS_LOGGER_LEVEL: info
      OTEL_RESOURCE_ATTRIBUTES: rustfs.cluster.id=prod-a

      RUSTFS_NOTIFY_ENABLE: "true"
      RUSTFS_NOTIFY_WEBHOOK_ENABLE_PRIMARY: "on"
      RUSTFS_NOTIFY_WEBHOOK_ENDPOINT_PRIMARY: http://events:8080/events
      RUSTFS_NOTIFY_WEBHOOK_QUEUE_DIR_PRIMARY: /var/lib/rustfs/events
      RUSTFS_OUTBOUND_ALLOW_ORIGINS: http://events:8080

      RUSTFS_IDENTITY_OPENID_ENABLE: "on"
      RUSTFS_IDENTITY_OPENID_CONFIG_URL: https://idp.example.com/.well-known/openid-configuration
      RUSTFS_IDENTITY_OPENID_CLIENT_ID: rustfs-console
      RUSTFS_IDENTITY_OPENID_CLIENT_SECRET: ${OIDC_CLIENT_SECRET:?set in .env}
      RUSTFS_IDENTITY_OPENID_SCOPES: openid,profile,email
      RUSTFS_IDENTITY_OPENID_GROUPS_CLAIM: groups
      RUSTFS_IDENTITY_OPENID_REDIRECT_URI: https://s3.example.com/rustfs/admin/v3/oidc/callback/keycloak
      RUSTFS_BROWSER_REDIRECT_URL: https://s3.example.com

    secrets:
      - rustfs-access
      - rustfs-secret
    volumes:
      - rustfs0:/data/rustfs0
      - rustfs1:/data/rustfs1
      - rustfs2:/data/rustfs2
      - rustfs3:/data/rustfs3
      - rustfs-logs:/app/logs
      - rustfs-events:/var/lib/rustfs/events
      - ./certs:/opt/tls:ro
    healthcheck:
      test:
        - CMD-SHELL
        - >-
          curl -fsS -k https://127.0.0.1:9000/health &&
          curl -fsS -k https://127.0.0.1:9001/rustfs/console/health
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

secrets:
  rustfs-access:
    file: ./secrets/rustfs-access
  rustfs-secret:
    file: ./secrets/rustfs-secret

volumes:
  rustfs0: {}
  rustfs1: {}
  rustfs2: {}
  rustfs3: {}
  rustfs-logs: {}
  rustfs-events: {}
```

Notas:
- `RUSTFS_STORAGE_CLASS_STANDARD=EC:2` em 4 drives → `K=2`, 50% útil, 2 falhas.
- `RUSTFS_RPC_SECRET`, `RUSTFS_IAM_MASTER_KEY` e
  `RUSTFS_IDENTITY_OPENID_CLIENT_SECRET` **não** têm variante `_FILE`; injete-os
  por `.env`/secret manager do orquestrador. Access key/secret e credenciais do
  Vault (token/AppRole) têm variantes de arquivo dedicadas.
- O webhook precisa de `RUSTFS_OUTBOUND_ALLOW_ORIGINS` só quando resolve para
  rede privada/loopback; a origem é `scheme://host:port`, sem path.
- Monte o diretório TLS inteiro; `subPath` impede reload.

## Certs

```
certs/
├── rustfs_cert.pem
├── rustfs_key.pem
├── ca.crt                 # opcional
└── s3.example.com/
    ├── rustfs_cert.pem    # SNI
    └── rustfs_key.pem
```

## Bootstrap

```bash
export S3=http://127.0.0.1:9000
mc alias set local "$S3" "$(cat secrets/rustfs-access)" "$(cat secrets/rustfs-secret)"

mc mb local/app-data
mc version enable local/app-data
mc retention set --default GOVERNANCE 30d local/app-data

# lifecycle: expira noncurrent em 90d e aborta multipart em 7d
cat > /tmp/lifecycle.json <<'JSON'
{
  "Rules": [
    {
      "ID": "noncurrent-90d",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 90 }
    },
    {
      "ID": "abort-mpu",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
JSON
mc ilm import local/app-data < /tmp/lifecycle.json

# quota hard de 1 TiB
curl -X PUT "$S3/rustfs/admin/v3/quota/app-data" \
  -H "Authorization: ..." \
  -d '{"quota":1099511627776,"quota_type":"HARD"}'
```

O `curl` acima ilustra o endpoint; para assinatura SigV4 use `mc`/SDK. O tipo
suportado é apenas `HARD`.

## Policy de workload

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::app-data/*",
      "Condition": { "Bool": { "aws:SecureTransport": "true" } }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::app-data",
      "Condition": { "StringLike": { "s3:prefix": ["tenant-a/*"] } }
    }
  ]
}
```

```bash
mc admin policy create local app-data-rw /tmp/policy.json
mc admin user add local app-writer '<secret>'
mc admin policy attach local app-data-rw --user app-writer
```

## Notificação por bucket

```bash
mc event add local/app-data \
  arn:rustfs:sqs::primary:webhook \
  --event put,delete,delete-marker \
  --prefix tenant-a/
```

## Replicação para outro S3

```bash
# 1. registrar o target
mc admin bucket remote add local/app-data https://dr.example.com \
  --access-key "$DR_AK" --secret-key "$DR_SK" --path auto

# 2. criar a regra (use o ARN retornado)
mc replicate add local/app-data \
  --remote-bucket 'arn:minio:replication::<id>:target' \
  --replicate "delete,delete-marker" \
  --existing-objects

# 3. validar (MUTANTE: grava/apaga probes no target)
curl -sf "$S3/app-data?replication-check" -H "Authorization: ..." | jq .

# 4. monitorar
mc replicate status local/app-data
```

Pré-requisitos: versioning na origem; permissões `ReplicateObject`/
`ReplicateDelete` no target; target com Object Lock quando a origem usa WORM.

## Cluster multi-nó (systemd)

Em cada nó, `/etc/default/rustfs`:

```bash
RUSTFS_VOLUMES='http://node{1...4}:9000/data{1...4}'
RUSTFS_ADDRESS=':9000'
RUSTFS_CONSOLE_ENABLE=true
RUSTFS_CONSOLE_ADDRESS=':9001'
RUSTFS_ACCESS_KEY_FILE=/run/secrets/rustfs-access
RUSTFS_SECRET_KEY_FILE=/run/secrets/rustfs-secret
RUSTFS_RPC_SECRET='<segredo-forte>'
RUSTFS_IAM_MASTER_KEY='<segredo-forte>'
RUSTFS_TLS_PATH=/etc/rustfs/tls
RUSTFS_UNSUPPORTED_FS_POLICY=fail
RUSTFS_DURABILITY_MODE=strict
RUSTFS_STORAGE_CLASS_STANDARD=EC:4
RUSTFS_OBS_ENDPOINT=http://otel-collector:4318
RUSTFS_OBS_LOGGER_LEVEL=info
OTEL_RESOURCE_ATTRIBUTES=rustfs.cluster.id=prod-a
```

```bash
systemctl enable --now rustfs
systemctl status rustfs
curl -fsS https://node1:9000/health/ready | jq .
rc alias set prod https://node1:9000 <ak> <sk>
rc admin pool list prod
```

## Kubernetes (resumo)

```yaml
mode:
  distributed:
    enabled: true
replicaCount: 4
drivesPerNode: 4
secret:
  existingSecret: rustfs-credentials
config:
  rustfs:
    ec:
      storage_class_standard: "EC:4"
    obs_endpoint:
      enabled: true
      base_endpoint: "http://otel-collector:4318"
    kms:
      enabled: true
      type: vault
      vault:
        vault_backend: vault-transit
        vault_address: "https://vault.example.com"
        vault_mount_path: transit
        default_key: rustfs-default
tls:
  enabled: true
  existingSecret: rustfs-serving-tls
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: s3.example.com
      paths:
        - path: /
          pathType: Prefix
          servicePort: endpoint
    - host: console.example.com
      paths:
        - path: /
          pathType: Prefix
          servicePort: console
```

## Ordem de validação

1. `rustfs info` e `/health/ready` em todos os nós.
2. `rc admin pool list` idêntico em todos os nós.
3. PUT/GET/HEAD/range/multipart.
4. Derrubar um drive dentro da paridade; leitura continua; escrita conforme
   quórum.
5. Healing drena; bitrot não cresce.
6. Notificação chega no sink.
7. Replicação `COMPLETED` e `replication-check` OK.
8. Lifecycle expira/transiciona conforme regra.
9. Quota rejeita excesso.
10. OIDC login e policy mapping.
11. KMS encrypt/decrypt e rotação.
12. Rolling restart completo.

## Anti-patterns

- `EC:0` em produção sem camada externa.
- `RUSTFS_DURABILITY_MODE=relaxed` em single-node.
- Copiar `format.json`/shards como backup.
- Rodar proxy com compressão ou buffering no upload.
- Deixar `rustfsadmin/rustfsadmin`.
- Expandir pool mudando endpoints em vez de append.
- Deletar `pool.bin`, `rebalance.bin`, `.scanner-pause-backlog.json` ou
  `.rustfs.sys` para "destravar".
- Usar ACL como modelo de autorização.
