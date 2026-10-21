# 05 — API S3: cobertura, limites e desvios

## Promessa de compatibilidade

RustFS é compatível com **S3 core para as features suportadas**, não com todo o
universo S3. A fonte de verdade é
`docs/architecture/s3-compatibility-matrix.md` + listas de testes em
`scripts/s3-tests/`:

| Lista | Uso |
|---|---|
| `implemented_tests.txt` | Testes S3 esperados no gate local |
| `lifecycle_behavior_tests.txt` | Casos de lifecycle com dia acelerado |
| `unimplemented_tests.txt` | Features ainda não passantes |
| `excluded_tests.txt` | Comportamento vendor-specific ou intencionalmente não suportado |

## Cobertura suportada

| Área | Status |
|---|---|
| Bucket create/delete/list/head | Suportado |
| Object put/get/delete/copy/head | Suportado |
| ListObjects/ListObjectsV2 (prefix, delimiter, marker, max-keys) | Suportado |
| Multipart create/upload/complete/abort + copy/checksum/attributes selecionados | Suportado |
| Tagging de bucket e objeto | Suportado |
| Bucket policy put/get/delete | Suportado |
| Public access block | Suportado |
| Presigned GET/PUT | Suportado |
| Range e leituras condicionais | Suportado |
| DeleteObjects condicional | Suportado com limites (abaixo) |
| User metadata | Suportado |
| SSE-C e SSE-KMS (casos selecionados) | Suportado |
| Versioning, Object Lock, checksums, CORS, raw request, escrita condicional | Parcial/selecionado |
| `CopyObject` com todos os checksums (CRC32, CRC32C, CRC64NVME, SHA1, SHA256, MD5, SHA512, XXHASH3/64/128) | Suportado, com preservação de origem e override explícito |
| S3 Select | Disponível |

## Não declare como completo

| Área | Situação |
|---|---|
| Bucket access logging | Handlers existem; testes ainda em `unimplemented_tests.txt` |
| POST Object form upload + checksum | Não passante no gate |
| Bucket ownership controls | Sem handler |
| Multipart listing/part lookup (edge cases) | Fora do gate default |
| Casos dependentes de IAM-account/multi-storage-class | Fora do gate default |
| Bucket policy multi-tenant (edge cases) | Requer investigação |
| Autorização por ACL | **Intencionalmente não suportada** |

Exceções específicas do roteador MinIO (o resto é equivalente):
- `GetBucketReplicationMetrics`, ownership controls e `/v3/top/drives|net` não
  existem; métricas de replicação ficam em `/v3/replicationmetrics`.
- `PutBucketAcl`/`PutObjectAcl`: só headers canned; XML de grants retorna
  `NotImplemented`.
- `DeleteBucketNotification/Logging/RequestPayment/Accelerate`: sem DELETE
  dedicado; limpe escrevendo configuração vazia via PUT.
- Batch jobs (`start/list/status/describe/cancel`) são stubs; `keyrotate` é
  recusado de propósito.
- `POST /v3/service` `restart`/`stop` faz shutdown gracioso; o supervisor deve
  relançar o processo.
- `GetObjectTorrent` retorna `404 NoSuchKey` (não `501`).

## Limites S3

| Limite | Valor |
|---|---|
| `PutObject` single request | 5 GiB |
| Objeto máximo (multipart) | 5 TiB |
| Partes por upload | 10.000 |
| Tamanho mínimo de parte (exceto última) | 5 MiB |
| Tamanho máximo de parte | 5 GiB |
| Partes em replicação para target genérico | mesmas regras do target |
| Versões por objeto | `RUSTFS_API_OBJECT_MAX_VERSIONS` (default ilimitado) |

Um objeto >5 GiB escrito com um único `PutObject` **não** pode ser replicado
para um target S3 genérico; reenvie como multipart.

## Endereçamento e assinatura

- Default: **path-style** (`http://host:9000/bucket/key`).
- Virtual-hosted-style exige `RUSTFS_SERVER_DOMAINS` e DNS
  (`bucket.s3.example.com`). Sem isso, configure o cliente para path-style
  (`s3_use_path_style=true` / `force_path_style=true`).
- S3 request signing é **SigV4**. Requisições com `Authorization` header cujo
  algoritmo não seja `AWS4-HMAC-SHA256` são rejeitadas.
- **Headers não assinados são rejeitados**: um `x-amz-*` presente na request mas
  ausente de `SignedHeaders` gera `403 AccessDenied` ("There were headers present
  in the request which were not signed"). Vale para header-signed e presigned.
  Exceção: `x-amz-cf-id` (CloudFront) é tolerado.
- Consequência prática: se você quer `x-amz-tagging`, storage class, SSE, ACL,
  metadata ou website redirect, assine esses headers **antes** de gerar a URL.

## Checksums

- `CopyObject` preserva o checksum da origem por default e aceita override
  explícito.
- Checksums suportados: CRC32, CRC32C, CRC64NVME, SHA1, SHA256, MD5, SHA512,
  XXHASH3, XXHASH64, XXHASH128.
- Objetos cifrados usam **ETag fingerprint** (32 hex) para escritas novas; não é
  o MD5 do plaintext. Listings podem omitir o ETag de objetos cifrados antigos ou
  multipart; para obter o ETag, faça `HeadObject` autenticado.
- `RUSTFS_OBJECT_GET_SKIP_BITROT_VERIFY` não altera checksums de resposta; é só
  instrumento de medição.

## DeleteObjects condicional

`DeleteObjects` aceita `ETag` opcional por objeto no XML:

| Condição | Resultado |
|---|---|
| ETag específico do objeto atual | Deleta se `s3:DeleteObject` + `s3:GetObject` |
| `ETag="*"` | Exige objeto atual; só `s3:DeleteObject` |
| Sem ETag | Delete incondicional |
| ETag divergente | `PreconditionFailed` por objeto |
| Objeto ausente ou delete marker atual | `NoSuchKey` |
| ETag vazio/weak | `InvalidArgument` |
| ETag + `VersionId` (inclusive `null`) | `InvalidRequest` |
| Bucket versionado/suspenso sem `VersionId` | Suportado |
| Rebalance em andamento | `SlowDown` |
| Mudança de geração no commit | `OperationAborted` |

A resposta pode ser HTTP 200 com entradas de sucesso e falha. `Quiet=true`
esconde sucessos e mantém erros. Requer namespace locking e peers que suportem
mutações de metadata guarded; peers antigos retornam `NotImplemented` antes de
mutar, nunca caem para delete incondicional. `s3:if-match` em bucket policy não
faz parte do suporte.

## Presigned upload size caps

Extensões RustFS para limitar uploads assinados:

| | V1 por request | V2 por upload |
|---|---|---|
| Query param | `x-rustfs-max-content-length=<u64>` | `x-rustfs-max-total-object-size=<u64>` |
| Aceito em | `PutObject` presigned SigV4 | `CreateMultipartUpload` (assinado ou presigned) |
| Mede | Bytes decodificados daquela request | Bytes lógicos (`actual_size`) somados das partes |
| Onde vive | Só na request | Metadata da sessão multipart |
| Excesso | `EntityTooLarge` | `EntityTooLarge` na parte ou no complete |

Qualquer outra operação com esses parâmetros retorna `InvalidRequest`. O limite
deve ser incluído **antes** de assinar; anexar depois invalida a assinatura.

## Desvios intencionais do AWS S3

| Comportamento | RustFS | AWS S3 | Motivo |
|---|---|---|---|
| Key com segmento `.`/`..` ou vazio (`a//b`) | `400 InvalidArgument` | Key opaca | Evita alias/path traversal no layout em filesystem |
| Directory marker (key terminando em `/`) em bucket versionado | Armazenado como versão `null`; PUT posterior sobrescreve | Versão real por PUT | Evita versões ocultas atrás de prefixos |
| `CopyObject` com `MetadataDirective=REPLACE` | Campos omitidos são limpos, inclusive `Content-Type` | Pode reter/inferir | Contrato explícito; cliente deve enviar `Content-Type` |
| Listing com `metadata=true` (extensão MinIO) | Nomes de user metadata sem `x-amz-meta-` | Não é ListObjectsV2 padrão | Compatibilidade MinIO; normalize no cliente |
| ACL | Sem autorização por ACL | ACL completa | Fora do escopo; use bucket policies/IAM |

## Clientes

Configuração típica:

```bash
aws configure set default.s3.addressing_style path
aws --endpoint-url http://localhost:9000 s3 ls
```

```python
# boto3
s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",
    aws_access_key_id="...",
    aws_secret_access_key="...",
    region_name="us-east-1",
    config=Config(s3={"addressing_style": "path"}),
)
```

- `mc`: compatível para operações cobertas; use `mc alias set`.
- `rc`: cliente nativo RustFS; `rc alias set`, `rc ping`, `rc ready`.
- SDKs que fazem virtual-host por default precisam de `RUSTFS_SERVER_DOMAINS` +
  DNS wildcard, ou path-style forçado.
- Proxies/CDNs: ver `14-troubleshooting.md`; o corpo e os headers assinados não
  podem ser alterados.

## Operações administrativas fora do S3

O Admin API usa `/rustfs/admin/v3/*` (alias `/minio/admin/v3/*`). Algumas
extensões S3 assinadas:

| Operação | Efeito |
|---|---|
| `GET /bucket?replication-check` | **Mutante**: grava, cria delete marker, apaga e limpa probes em cada target |
| `GET /bucket?replication-metrics[=2]` | Métricas de replicação do bucket |
| `PUT /bucket?replication-reset[&arn=...]` | Reset de estado de replicação (exige existing-object replication) |
| `GET /bucket?replication-reset-status` | Status do reset |

`replication-check` não é read-only; obtenha confirmação antes de chamar.

## Fonte

`docs/architecture/s3-compatibility-matrix.md`;
`docs/architecture/minio-rustfs-router-compatibility.md`;
`docs/operations/replication-check.md`;
`docs/operations/replication-object-size-limits.md`;
`docs/operations/presigned-size-limits.md`;
`docs/operations/encrypted-etags.md`;
`CHANGELOG.md` (GHSA-g8w9 / GHSA-xm99).
