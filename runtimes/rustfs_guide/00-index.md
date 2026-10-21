# 00 — Índice, visão geral e modelo mental

> Guia denso de **RustFS 1.0.2** derivado do repositório oficial `rustfs/rustfs`
> (commit `6153769`, 2026-10-14). Otimizado para consulta por IA: cada arquivo é
> autônomo o suficiente para ser carregado isoladamente.

## O que é RustFS

Sistema de **object storage distribuído e compatível com S3**, escrito em Rust,
licenciado **Apache-2.0**. O modelo operacional é deliberadamente próximo do
MinIO: pools, erasure sets, `xl.meta`, namespace interno `.rustfs.sys`,
compatibilidade de clientes S3 e console web.

Não é um "S3 completo". O próprio projeto define a promessa como **ampla
compatibilidade para as features suportadas**, com matriz de testes e lista de
exceções. Leia `05-s3-api.md` antes de assumir qualquer operação.

## Proposta de valor (README oficial)

| Eixo | RustFS |
|---|---|
| Linguagem | Rust; foco em segurança de memória e previsibilidade |
| Licença | Apache-2.0 (sem AGPL) |
| Distribuição | Single-node, single-node multi-drive, multi-node, multi-pool |
| Durabilidade | Reed-Solomon, bitrot, heal, scanner, replicação |
| Compatibilidade | S3 core, Swift, FTPS, WebDAV, SFTP opt-in |
| Segurança | IAM/policies, STS, OIDC, Keystone, TLS/mTLS, SSE, KMS, audit |
| Dados analíticos | Data lake, IA, big data; S3 Tables/Iceberg em preview |
| Console | UI web completa sobre Admin API |

## Status de features (1.0.2)

Disponível: S3 core, upload/download, versioning, Object Lock (WORM),
SSE, KMS, lifecycle/ILM, tiering para S3 remoto, bucket/site replication,
quotas, S3 Select, event notifications, audit, IAM/policies, OIDC/SSO,
Keystone, Swift, FTPS/WebDAV, SFTP opt-in, console, Helm, multi-tenancy,
bitrot, healing/scanner, pool expansion/decommission, MinIO disk read
(pré-visualização, sem SSE no build padrão).

Preview: **S3 Tables** (Iceberg REST Catalog), **MinIO on-disk compatibility**
(feature `rio-v2`, fora do build padrão).

Não suportado/fora do escopo: autorização por **ACL**, paridade completa com
APIs de controle do AWS S3 Tables, leitura reversa de drives RustFS por MinIO,
objetos MinIO cifrados em builds padrão, FIPS 140-3 validado.

## Modelo mental em uma frase

> Um deployment é uma lista de **pools**; cada pool é dividido em **erasure
> sets** de 2–16 drives; cada objeto é codificado Reed-Solomon dentro de um set,
> com metadados versionados em `xl.meta`, e só é confirmado quando o **write
> quorum** é atingido.

```
deployment
└── pool 0 .. pool N          (lista de endpoints persistida)
    └── erasure set 0 .. M    (largura fixa por pool, N drives)
        └── drives            (shards + xl.meta + bitrot)
```

## Planos de rede

| Plano | Default | Função |
|---|---|---|
| S3 API | `:9000` | CRUD de objetos, assinatura SigV4 |
| Admin API | `:9000` | `/rustfs/admin/*`; alias `/minio/admin/*` |
| Console | `:9001` | UI web; credenciais default `rustfsadmin/rustfsadmin` |
| Internode RPC | listener S3 | coordenação, locks, metadata, heal, replicação |
| Health | `:9000/health*` | liveness/readiness; S3 bloqueia antes de `FullReady` |
| SFTP | `:2222` | opt-in (`--features sftp`) |
| FTPS | `:8022` | build padrão |
| WebDAV | `:8080` | build padrão |
| FTP | `:8021` | opcional |
| HTTP/3 | UDP `:9000` | opt-in (`--features http3` + TLS) |

## O que você precisa saber antes de operar

1. **Topologia é imutável.** Número/ordem de endpoints, largura do set, ordem dos
   pools e posição dos UUIDs dos discos estão em `FormatV3`. Erro de topologia
   falha com `PoolTopologyMismatch`; não se "conserta" apagando `format.json`.
2. **Expansão = novo pool.** Um pool existente não cresce. Adicione um pool
   vazio com ≥2 endpoints, reinicie em rolling e rode rebalance.
3. **Paridade é por pool.** `RUSTFS_STORAGE_CLASS_STANDARD=EC:4` precisa ser
   válido para o pool mais estreito. Default: 0/1/2/3/4 conforme drives.
4. **Quorum manda.** Leitura = `K` shards; escrita = `K` (ou `K+1` se `K==M`);
   delete marker = maioria. Abaixo disso, falha explícita.
5. **Durabilidade é uma escolha explícita.** Default `strict` (fsync completo).
   `relaxed` e `none` são trade-offs; `EC:0` é trade-off de disponibilidade.
6. **Segurança default é insegura por design de laboratório.** Troque
   `rustfsadmin`, defina `RUSTFS_RPC_SECRET` e `RUSTFS_IAM_MASTER_KEY`, use TLS.
7. **Proxy não pode tocar no corpo.** Sem compressão/re-chunk; preserve headers
   assinados e `Content-Length`, senão PUTs grandes travam ou falham SigV4.
8. **MinIO é migração de leitura, não simbiose.** Drives RustFS não são lidos
   por MinIO; objetos MinIO cifrados exigem build `rio-v2`.

## Como escolher o tópico

| Necessidade | Arquivo |
|---|---|
| Entender o fluxo de uma requisição | `01-arquitetura.md` |
| Subir em Docker/K8s/systemd | `02-instalacao-deploy.md` |
| Ajustar variáveis, io_uring, cleanup, locks | `03-configuracao.md` |
| Entender paridade, capacidade, `EC:0` | `04-storage-erasure-coding.md` |
| Validar compatibilidade S3 | `05-s3-api.md` |
| Configurar bucket, versioning, lock, quota | `06-buckets-objetos.md` |
| IAM, OIDC, TLS, hardening | `07-iam-seguranca.md` |
| Criptografia, KMS, enforcement e DR | `08-kms-sse.md` |
| Replicação e migração | `09-replicacao.md` |
| Lifecycle, tiering, eventos, audit | `10-ilm-notificacoes.md` |
| Métricas, logs, health, scanner | `11-observabilidade.md` |
| Expandir, rebalancear, recuperar metadata | `12-cluster-lifecycle.md` |
| Swift, SFTP, FTPS, WebDAV, S3 Tables | `13-protocolos-extras.md` |
| Resolver erro | `14-troubleshooting.md` |
| Cola | `15-cheatsheet.md` |
| Exemplo integrado | `99-exemplo-completo.md` |

## Fontes primárias

- `README.md` — features, quickstart, limites de topologia, performance.
- `ARCHITECTURE.md` — camadas, crates, startup, invariantes.
- `docs/architecture/erasure-coding.md` — contrato normativo de EC/quorum.
- `docs/operations/cluster-lifecycle-operations.md` — runbook de topologia.
- `docs/operations/durability-modes.md` — fsync por modo.
- `docs/architecture/s3-compatibility-matrix.md` — cobertura e desvios.
- `docs/operations/*.md` — runbooks de KMS, replicação, ILM, scanner, TLS.
- `crates/config/src/constants/*` — defaults efetivos das variáveis.
