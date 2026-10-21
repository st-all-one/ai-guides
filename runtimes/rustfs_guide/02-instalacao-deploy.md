# 02 — Instalação e deployment

## Pré-requisitos

| Item | Requisito |
|---|---|
| SO | Linux/Windows/macOS para dev; produção em Linux x86_64/arm64 |
| Rust (source) | 1.99.0+, edition 2024 |
| Filesystem | POSIX local (ext4, XFS, …). NFS/CIFS/SMB/FUSE/overlay/9p/Ceph/Gluster estão fora do boundary de produção |
| Discos | Um endpoint por disco físico; o startup valida independência física |
| Portas | 9000/TCP (S3+admin+internode), 9001/TCP (console), opcionais 2222, 8021, 8022, 8080, UDP 9000 |
| Usuário Docker | `10001:10001`; mounts devem ser graváveis por esse UID |
| Clock | NTP/sincronizado (TLS, JWT, métricas) |

O guard de filesystem é controlado por `RUSTFS_UNSUPPORTED_FS_POLICY=warn|fail`
(default `warn`). Em produção use `fail` para impedir mounts de rede por acidente.

## Modos de topologia

| Modo | Exemplo | Expansão |
|---|---|---|
| Single-node single-drive | `rustfs /data/rustfs` | **Não** expande; migre via S3 |
| Single-node multi-drive | `rustfs /data/vol{1...4}` | Só adicionando pool; cada pool ≥2 endpoints |
| Multi-node | `rustfs http://node{1...4}:9000/data{1...4}` | Rolling restart + append de pool |
| Multi-pool | dois argumentos, cada um com ellipsis | Append-only; rebalance move dados |

Regras de parsing (`DisksLayout::from_volumes`):
- Com mais de um argumento, **todo** argumento precisa de ellipsis.
- Cada pool expande para ≥2 endpoints distintos.
- Um pool single-drive não entra em deployment multi-pool.
- `{3...3}` não burla o mínimo.
- Windows: `http://node{1...4}:9000/D:/rustfs/data{1...4}`; UNC shares são
  rejeitados.

## Opção 1 — script de instalação

```bash
curl -O https://rustfs.com/install_rustfs.sh
bash install_rustfs.sh
rustfs --version
rustfs info            # sistema, runtime, build, config, features
```

## Opção 2 — Docker

```bash
mkdir -p data logs
chown -R 10001:10001 data logs

docker run -d --name rustfs \
  -p 9000:9000 -p 9001:9001 \
  -v "$PWD/data:/data" -v "$PWD/logs:/logs" \
  rustfs/rustfs:latest
```

Produção: fixe a tag (`rustfs/rustfs:<versão>`), não `latest`. O container roda
como `rustfs` (UID/GID `10001:10001`). Se usar bind mount, prepare ownership ou
rode com `user: "<uid>:<gid>"`.

### Docker Compose simples

`docker-compose-simple.yml` sobe 4 drives nomeados, console e healthcheck:

```bash
docker compose -f docker-compose-simple.yml up -d
docker compose -f docker-compose-simple.yml ps
curl -fsS http://127.0.0.1:9000/health/ready
```

Ele inclui um serviço `volume-permission-helper` para volumes nomeados. Para
bind mounts, o `chown` é sua responsabilidade.

### Compose completo

`docker-compose.yml` adiciona perfis de observabilidade (OTel Collector,
Prometheus, Grafana, Tempo, Jaeger, Loki) e TLS em `/opt/tls`. Leia o arquivo
antes de subir: ele monta `./deploy/data`, `./deploy/logs` e certificados.

## Opção 3 — Helm (Kubernetes)

```bash
helm repo add rustfs https://charts.rustfs.com
helm repo update
helm install rustfs rustfs/rustfs \
  --namespace rustfs --create-namespace \
  --set secret.rustfs.access_key='<access>' \
  --set secret.rustfs.secret_key='<secret>' \
  --set replicaCount=4 \
  --set drivesPerNode=4 \
  --set storageclass.dataStorageSize=100Gi
```

Defaults relevantes (`helm/rustfs/values.yaml`):
- `replicaCount: 4`; `drivesPerNode: null` (infere 4 quando `replicaCount=4`,
  senão 1).
- `mode.distributed.enabled: true`; `mode.standalone.enabled: false`.
- `secret.allowInsecureDefaults: false`: o chart **falha** se você não fornecer
  um Secret existente ou credenciais não-default.
- `config.rustfs.volumes` vazio → o chart gera os endpoints a partir dos pods.
- `config.rustfs.ec.storage_class_standard` vazio → paridade automática.
- `service.type: ClusterIP`; `ingress.enabled: true` com hosts de exemplo
  (`console.rustfs.com`, `endpoint.rustfs.com`) — **sobrescreva**.
- `tls.enabled` e `mtls.enabled` são mutuamente exclusivos.
- `podSecurityContext` usa `10001:10001`, rootfs read-only, drop ALL.
- `livenessProbe` em `/health`, `readinessProbe` em `/health/ready`.

### Pools no Helm

`pools.enabled=true` renderiza um StatefulSet por pool. Regras:
- Lista **append-only**; o índice define o nome do StatefulSet. Nunca reordene
  nem remova.
- Cada pool precisa de `replicaCount >= 2`.
- Para retirar um pool, rode `rc admin decommission` **antes** de editar values.
- Após adicionar pool, rode `rc admin rebalance start`.

```yaml
pools:
  enabled: true
  list:
    - {}                      # pool 0: herda top-level, mantém PVCs
    - replicaCount: 4
      storageclass:
        dataStorageSize: 10Gi
```

`drivesPerNode` não pode mudar em um StatefulSet existente (Kubernetes proíbe
alterar `volumeClaimTemplates`). Para mudar, delete o StatefulSet com
`--cascade=orphan` e recrie.

## Opção 4 — systemd

Template em `deploy/build/rustfs.service`:

```ini
[Service]
Type=notify
User=rustfs
Group=rustfs
WorkingDirectory=/opt/rustfs
EnvironmentFile=/etc/default/rustfs
ExecStart=/usr/bin/rustfs server
LimitNOFILE=1048576
Restart=always
TimeoutStartSec=120s
TimeoutStopSec=45s
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/data/rustfs /var/log/rustfs
```

`deploy/config/rustfs.env`:

```bash
RUSTFS_ACCESS_KEY=REPLACE_WITH_UNIQUE_ACCESS_KEY
RUSTFS_SECRET_KEY=REPLACE_WITH_UNIQUE_SECRET_KEY
RUSTFS_VOLUMES="./deploy/data/vol{1...4}"
RUSTFS_ADDRESS=0.0.0.0:9000
RUSTFS_CONSOLE_ENABLE=true
RUSTFS_CONSOLE_ADDRESS=0.0.0.0:9001
RUSTFS_OBS_ENDPOINT=http://localhost:4318
RUSTFS_TLS_PATH=/etc/default/tls
```

Prefira `RUSTFS_ACCESS_KEY_FILE` / `RUSTFS_SECRET_KEY_FILE` para segredos
gerenciados por systemd/agenix/sops.

## Opção 5 — Nix / NixOS

```bash
nix run github:rustfs/rustfs
nix build github:rustfs/rustfs
./result/bin/rustfs --help
```

Módulo NixOS:

```nix
imports = [ inputs.rustfs.nixosModules.rustfs ];
services.rustfs = {
  enable = true;
  accessKeyFile = "/run/secrets/rustfs-access-key";
  secretKeyFile = "/run/secrets/rustfs-secret-key";
  volumes = [ "/var/lib/rustfs" ];
};
```

O flake também exporta `rustfs-client` (binário `rc`). Nunca coloque segredos no
Nix store; use runtime files.

## Opção 6 — build do source

```bash
git clone https://github.com/rustfs/rustfs.git
cd rustfs
cargo build --release -p rustfs

RUSTFS_VOLUMES='/data/vol{1...4}' \
RUSTFS_ACCESS_KEY='...' \
RUSTFS_SECRET_KEY='...' \
./target/release/rustfs server
```

Features:
- Default: `ftps`, `webdav`, `gcs`.
- `--features swift`, `--features sftp`, `--features http3`, `--features rio-v2`
  (migração MinIO cifrada), `--features full` (protocolos + observabilidade).
- `rustfs-cli` (`rc`) é um binário separado no mesmo workspace; releases oficiais
  também publicam o cliente.

Build Docker multi-arquitetura:

```bash
./docker-buildx.sh -p linux/amd64
./docker-buildx.sh --push --release 1.0.3
make docker-buildx
```

## Primeiro acesso e verificação

```bash
# Console
open http://localhost:9001        # rustfsadmin / rustfsadmin

# CLI S3 (mc)
mc alias set local http://localhost:9000 rustfsadmin rustfsadmin
mc mb local/demo
mc cp ./file.bin local/demo/

# CLI nativo
rc alias set local http://localhost:9000 <access> <secret>
rc ping local
rc ready local --timeout 2
rc admin info cluster local
```

Verificações mínimas:
1. `/health` responde 200 (liveness).
2. `/health/ready` responde 200 (read quorum + IAM + shared locks).
3. `mc ls` funciona com SigV4.
4. PUT/GET/HEAD/range/multipart funcionam.
5. Todos os nós mostram a mesma topologia em `rc admin pool list`.
6. Com uma falha dentro da paridade, leitura continua e escrita comporta-se
   conforme o quórum.

## TLS

`RUSTFS_TLS_PATH` aponta para um diretório com:

```
rustfs_cert.pem
rustfs_key.pem
public.crt        # trust outbound (opcional)
ca.crt            # CA (opcional)
client_ca.crt     # mTLS inbound (opcional)
client_cert.pem   # mTLS outbound (opcional)
client_key.pem
<domain>/rustfs_cert.pem
<domain>/rustfs_key.pem
```

- S3 e console usam o mesmo diretório.
- Identidades SNI ficam em subdiretórios visíveis com os dois arquivos.
- `RUSTFS_TLS_RELOAD_ENABLE=true` recarrega a cada
  `RUSTFS_TLS_RELOAD_INTERVAL` (30s default).
- Kubernetes: monte o Secret inteiro; `subPath` não recebe atualizações.
- O chart suporta `tls.existingSecret` (apenas `tls.crt`/`tls.key`) e
  `tls.trustSecret` (`ca.crt`).
- RustFS **não** emite ACME nem altera DNS; use cert-manager ou um controlador
  externo.

## Checklist de produção

- [ ] Credenciais root trocadas e guardadas fora do repositório.
- [ ] `RUSTFS_RPC_SECRET` único e idêntico em todos os nós remotos.
- [ ] `RUSTFS_IAM_MASTER_KEY` definido (obrigatório para 2FA; protege IAM).
- [ ] TLS no S3 e no console; console não exposto publicamente sem auth.
- [ ] `RUSTFS_UNSUPPORTED_FS_POLICY=fail`.
- [ ] Um endpoint por disco físico; nenhum NFS/CIFS.
- [ ] Topologia registrada (endpoints, ordem, set width, paridade).
- [ ] `RUSTFS_ERASURE_SET_DRIVE_COUNT` documentado se usado.
- [ ] Paridade validada no pool mais estreito; `EC:0` proibido sem exceção formal.
- [ ] `RUSTFS_DURABILITY_MODE=strict` (ou justificativa para outro).
- [ ] Backups/DR via replicação, tiering ou ferramenta S3 — nunca cópia de shards.
- [ ] OTLP configurado e dashboards importados.
- [ ] Alertas para capacidade, bitrot, heal, replicação, quotas e readiness.
- [ ] Rolling restart testado; decommission/rebalance documentados.

## Fonte

`README.md`; `docker-compose-simple.yml`; `docker-compose.yml`;
`helm/rustfs/values.yaml`; `deploy/build/rustfs.service`;
`deploy/config/rustfs.env`; `deploy/build/rustfs.nixos.md`;
`docs/operations/cluster-lifecycle-operations.md`;
`docs/operations/tls-certificate-rotation.md`;
`crates/config/src/constants/app.rs`.
