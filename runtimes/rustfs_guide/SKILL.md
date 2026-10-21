---
name: rustfs
description: >
  RustFS 1.0.2 — S3-compatible distributed object storage in Rust (MinIO-like
  operations, Apache-2.0). Covers architecture, pools/sets/erasure coding and
  quorum, installation (binary, Docker, Compose, Helm, systemd, Nix), RUSTFS_*
  configuration, storage classes and EC:0, durability modes, S3 API coverage and
  deviations, buckets/versioning/Object Lock/lifecycle/quotas, IAM/policies/STS/
  OIDC/Keystone, TLS/mTLS, KMS/SSE, bucket and site replication, tiering,
  notifications/audit, OTLP observability, scanner/heal, expansion/rebalance/
  decommission/drive replacement, SFTP/FTPS/WebDAV/Swift, S3 Tables and
  troubleshooting. Load when deploying, configuring, operating, securing,
  tuning, recovering, or debugging RustFS, or when validating S3/MinIO compatibility.
category: runtimes
version: "1.0.2"
tags: [rustfs, object-storage, s3, minio-compatible, erasure-coding, distributed-storage, kms, iam, replication, lifecycle, tiering, kubernetes, helm, docker, observability]
license: MIT
---

# RustFS 1.0.2

S3-compatible distributed object storage written in Rust. Apache-2.0. Positions
itself as a MinIO-compatible operational model (pools, erasure sets, `xl.meta`,
`.rustfs.sys`) with Rust performance and an explicit compatibility matrix rather
than blanket S3 claims.

## Use When
- Install/deploy: binary, Docker, Compose, Helm, systemd, Nix, Kubernetes.
- Design topology: single-node/single-drive, multi-drive, multi-pool, expansion.
- Configure `RUSTFS_*`, TLS, console, OIDC, KMS, notifications, limits.
- Operate: rebalance, decommission, heal, drive replacement, rolling restart.
- Write S3 clients or check compatibility/limits/deviations.
- Secure: IAM, bucket policies, STS, SSE, mTLS, audit, hardening.
- Tune: EC parity, inline threshold, durability tier, scanner, I/O, buffers.
- Debug: quorum, proxy, SigV4, replication, ILM/tiering, KMS, scanner, SFTP.
- Migrate from MinIO (`xl.meta` / `.metadata.bin` read rules).

## Non-Negotiable Rules
1. **Topology is immutable once initialized.** Endpoint count/order, set width,
   pool order and disk-UUID slots are persisted in `FormatV3`. Never delete
   `format.json`, reorder volumes, or move a drive to another slot.
2. **Expand by appending pools**, never by growing an existing pool in place.
   Every launch argument needs an ellipsis once there is more than one pool;
   each pool needs ≥2 distinct drive endpoints. A single-drive deployment cannot
   expand.
3. **Use local POSIX filesystems only.** NFS/CIFS/SMB/FUSE/overlay/9p/ceph/
   gluster are outside the production boundary (`RUSTFS_UNSUPPORTED_FS_POLICY`,
   default `warn`; set `fail` to abort).
4. **Write quorum is `data_blocks` (`+1` when `data == parity`).** Reads need
   `data_blocks`; delete markers use majority `N/2+1`. Below quorum: fail closed.
5. **`EC:0` is raw capacity, not redundancy.** One lost drive loses every
   zero-parity object in that set. No degraded reads and no heal. Use only with
   an external durability layer and explicit sign-off.
6. **Durability default is `strict`.** `relaxed`/`none` trade power-loss
   guarantees; `relaxed` is only defensible on multi-node clusters in independent
   power domains. System namespaces stay pinned to `strict`.
7. **Do not copy shard directories or `xl.meta` as backup/migration.** Use
   bucket replication, site replication, remote tiering, or S3-level tooling.
8. **Front the console and admin API with TLS and network policy.** Change the
   default `rustfsadmin/rustfsadmin`; set a unique `RUSTFS_RPC_SECRET` on every
   remote-node cluster; set `RUSTFS_IAM_MASTER_KEY` before enabling 2FA.
9. **Proxies must forward the body and signed headers byte-for-byte.** No
   compression/re-chunking; preserve `Content-Length`, `Host`, `x-amz-*`, `ETag`.
10. **Validate claims against the compatibility matrix.** ACL authorization is
    intentionally unsupported; several S3 areas are explicitly not complete.

## Ports And Planes
| Surface | Default | Notes |
|---|---|---|
| S3 API | `:9000` | Primary data plane; SigV4; path-style unless `RUSTFS_SERVER_DOMAINS`. |
| Admin API | `:9000` | `/rustfs/admin/*`; `/minio/admin/*` is a compatibility alias. |
| Console | `:9001` | Web UI; default credentials `rustfsadmin/rustfsadmin`. |
| Internode | S3 listener | Authenticated RPC/gRPC between nodes; requires `RUSTFS_RPC_SECRET` when peers are remote. |
| Health | `:9000/health`, `/health/live`, `/health/ready` | Readiness gate; S3 returns 503 before `FullReady`. |
| SFTP (opt-in) | `:2222` | Build feature `sftp`. |
| FTPS | `:8022` | Default build. |
| WebDAV | `:8080` | Default build. |
| FTP | `:8021` | Optional. |
| HTTP/3 (opt-in) | UDP `:9000` | Build `--features http3` + `RUSTFS_HTTP3_ENABLE=true` + TLS. |

## Quick Start
```bash
mkdir -p data logs && chown -R 10001:10001 data logs
docker run -d --name rustfs -p 9000:9000 -p 9001:9001 \
  -v "$PWD/data:/data" -v "$PWD/logs:/logs" \
  rustfs/rustfs:latest
# API http://localhost:9000 · Console http://localhost:9001
```

```bash
# source build (Rust 1.99+, edition 2024)
cargo build --release -p rustfs
RUSTFS_VOLUMES='/data/vol{1...4}' \
RUSTFS_ACCESS_KEY='change-me' RUSTFS_SECRET_KEY='change-me-too' \
RUSTFS_ADDRESS=':9000' RUSTFS_CONSOLE_ENABLE=true \
./target/release/rustfs server
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Visão geral, modelo mental, status de features, mapa |
| `01-arquitetura.md` | Camadas, request path, pools/sets, metadata, quorum, readiness |
| `02-instalacao-deploy.md` | Binário, Docker, Compose, Helm, systemd, Nix, requisitos |
| `03-configuracao.md` | `RUSTFS_*`, defaults, io_uring, cleanup, locks, limites |
| `04-storage-erasure-coding.md` | EC, paridade, inline, `EC:0`, durabilidade, integridade |
| `05-s3-api.md` | Cobertura, limites, assinatura, desvios, clientes |
| `06-buckets-objetos.md` | Versioning, Object Lock, lifecycle, quotas, website |
| `07-iam-seguranca.md` | IAM, políticas, STS, OIDC, Keystone, 2FA, TLS, hardening |
| `08-kms-sse.md` | SSE-S3/KMS/C, backends, enforcement, rotação, DR |
| `09-replicacao.md` | Bucket replication, site replication, ODM, limites |
| `10-ilm-notificacoes.md` | ILM/tiering, eventos, audit, filas, NATS JetStream |
| `11-observabilidade.md` | OTLP, logs, health, métricas, scanner/heal |
| `12-cluster-lifecycle.md` | Expansão, rebalance, heal, restart, recuperação |
| `13-protocolos-extras.md` | Swift/Keystone, SFTP, FTPS, WebDAV, S3 Tables |
| `14-troubleshooting.md` | Sintomas, causas, correções |
| `15-cheatsheet.md` | Comandos, endpoints, env vars, exemplos |
| `99-exemplo-completo.md` | Stack de produção comentada |

## Read Order
`00` → `01` → `02` → `03`; storage/API `04`–`06`; security `07`–`08`;
data services `09`–`10`; ops `11`–`12`; consult `13`–`15`, deploy with `99`.

## Source
Official repository `rustfs/rustfs`, workspace version `1.0.2`, commit
`6153769` (2026-10-14): `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`,
`docs/` (121 files), `deploy/`, `helm/`, and code defaults under
`crates/config/`, `crates/credentials/`, `crates/ecstore/`, `rustfs/src/`.
Claims are pinned to that snapshot; re-check upstream before relying on
preview features.
