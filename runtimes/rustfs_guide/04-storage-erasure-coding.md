# 04 — Storage, erasure coding e durabilidade

## Modelo Reed-Solomon

Cada objeto é codificado em um **erasure set** de `N` drives:

```
N = K (data) + M (parity)
qualquer K shards reconstrói o objeto
tolera até M falhas de drive no set
```

- Codec moderno: **Reed-Solomon GF(2⁸)** (`rs-vandermonde`,
  `rustfs-erasure-codec`), usado para todas as escritas novas e para dados
  migrados do MinIO.
- Codec legado: GF(2¹⁶), usado apenas para ler/healar objetos escritos por
  versões antigas do RustFS. A escolha vem dos metadados (`uses_legacy`), não de
  um toggle.
- Bloco de codificação: **1 MiB** (`BLOCK_SIZE_V2`), gravado por versão.
- Bitrot: **HighwayHash-256** com chave derivada de π; frame `[hash][data]` por
  bloco; verificação antes de usar.
- Shard moderno: `ceil(block_size / K)`; legado: arredondado para par.

## Geometria de pools e sets

| Regra | Valor |
|---|---|
| Set size multi-drive | `2..=16` drives |
| Single-drive | `N=1`, `M=0` (caminho separado) |
| Override | `RUSTFS_ERASURE_SET_DRIVE_COUNT` só aceita divisor simétrico válido |
| Set count | Escolhido para dividir uniformemente o pool, preferindo menos sets |
| Distribuição de objeto→set | Hash do key (SipHash V2/V3), separado da distribuição intra-set |
| Distribuição intra-set | Rotação de `1..N` derivada de `CRC32("bucket/object") % N` |
| Versões | Todas as versões de um key compartilham a mesma distribuição |

A geometria fica **por objeto** em `xl.meta`; alterar o default não reescreve
objetos existentes.

## Paridade default

`default_parity_count(N)`:

| Drives no set | 1 | 2–3 | 4–5 | 6–7 | ≥8 |
|---|---:|---:|---:|---:|---:|
| Paridade default | 0 | 1 | 2 | 3 | 4 |

Classes:
- `STANDARD` → `RUSTFS_STORAGE_CLASS_STANDARD` (`EC:<n>`).
- `REDUCED_REDUNDANCY` (RRS) → `RUSTFS_STORAGE_CLASS_RRS` (default `EC:1`, `0`
  em single-drive).

Validação:
- `parity ≤ N/2`.
- `STANDARD parity ≥ RRS parity` quando ambos são não-zero.
- Paridade resolvida **por pool**, contra o `N` daquele pool.
- Apenas `STANDARD` e `REDUCED_REDUNDANCY` são aceitos em PUT/Copy/
  CreateMultipartUpload. Labels AWS (`STANDARD_IA`, `GLACIER`, etc.) retornam
  `InvalidStorageClass`.
- Labels AWS históricos sem semântica física distinta são normalizados para o
  layout local efetivo (`STANDARD` ou `RRS`) em leitura/listagem; um objeto
  realmente transicionado preserva o nome do tier.

## Quórum e capacidade

```text
capacidade útil ≈ raw × K / N
read quorum     = K
write quorum    = K, ou K+1 quando K == M
delete markers  = N/2 + 1
```

Exemplos:
- 16 drives, `EC:4` → `K=12`, ~75% útil, tolera 4 falhas, lê com 12 shards.
- 8 drives, `EC:4` → `K=4`, 50% útil, tolera 4 falhas.
- 4 drives, `EC:2` → `K=2`, 50% útil, tolera 2 falhas.
- 2 drives, `EC:1` → `K=M=1`, 50% útil, tolera 1 falha mas com 1 drive não
  escreve.
- `EC:0` em 8 drives → `K=8`, 100% útil, tolera 0 falhas.

Metadados internos em `.rustfs.sys` são escritos com `max_parity` (paridade
`N/2`), independentemente da classe do bucket.

## Objetos inline

Um objeto é inline quando **todo shard** cabe no orçamento por shard:

```
default = min(256 KiB / K, 128 KiB)
```

- Em bucket versionado, o orçamento é dividido por 8.
- `RUSTFS_STORAGE_CLASS_INLINE_BLOCK` substitui o default por um limite fixo.
- Cada drive guarda apenas seu próprio shard inline; a semântica de perda é a
  mesma de shards externos.
- Streams comprimidos/cifrados só ficam inline se o tamanho armazenado for
  conhecido e couber no orçamento.

Inline reduz latência e IOPS para objetos pequenos, mas aumenta o `xl.meta` e
pode piorar a amplificação de metadados em workloads de milhões de arquivos
minúsculos.

## `EC:0` — modo sem redundância

Aceito em STANDARD, RRS ou ambos, em qualquer largura.

| Aspecto | Comportamento |
|---|---|
| Escrita | `K=N`, `M=0`, write quorum `N`; qualquer drive indisponível → `ErasureWriteQuorum` |
| Verificação | Cada shard é verificado contra o bitrot **antes** do commit |
| Leitura | Exige `N` metadados e `N` shards; sem leitura degradada |
| Drive offline | GET/HEAD de todo objeto zero-parity naquele set falham |
| Delete | Maioria `N/2+1`; delete pode funcionar com leitura/escrita falhando |
| Heal | `cannot_heal` sempre que falta qualquer shard; nunca repara |
| Substituição de drive | Perda permanente dos objetos daquele set |
| Aumentar paridade depois | Não reescreve; re-upload/CopyObject por objeto |

`EC:0` **não** emite warning quando explícito; o warning
`storage_class_zero_redundancy` só aparece para paridade zero automática
(single-drive).

Use `EC:0` somente quando uma camada externa (RAID, replicação, backup ou fonte
recriável) possui a durabilidade, e com aceite formal de que uma falha de drive
= perda do set. Produção normalmente usa `EC:1` mínimo e `EC:2+` quando o set
cruza nós.

## Modos de durabilidade (fsync)

Configuração:

```bash
RUSTFS_DURABILITY_MODE=strict|relaxed|none   # default: strict
RUSTFS_DRIVE_SYNC_ENABLE=true|false          # legado; false → legacy-off
RUSTFS_NEW_BUCKET_DURABILITY_MODE=strict|relaxed|none|inherit
```

| Write point | strict | relaxed | none | legacy-off |
|---|---|---|---|---|
| Shards EC (fdatasync antes do rename) | sim | **sim** | não | não |
| Payload de multipart | sim | **sim** | não | não |
| `xl.meta` | sim | não | não | não |
| Objetos inline | sim | não | não | não |
| Backups de rollback | sim | não | não | não |
| Diretórios de commit | sim | não | não | não |
| Escritas system-critical | sim | sim (pin) | sim (pin) | **não** |

Garantias:
- **strict**: todo 200 OK é durável no drive; sobrevive a queda de energia do nó
  ou do cluster.
- **relaxed**: payload de shards/partes é durável, mas metadados não. Uma versão
  recém-confirmada pode desaparecer; objetos inline não têm fsync algum. Só é
  defensável em cluster multi-nó com domínios de energia independentes. Em
  single-node, use `strict`.
- **none**: nenhum fsync no data path; objetos confirmados podem desaparecer.
- **legacy-off**: nada é fsyncado, incluindo `format.json`; existe apenas para
  compatibilidade histórica. Prefira `none`.

Namespaces `.rustfs.sys` e `.minio.sys` são sempre `strict`, exceto em
`legacy-off`. `.rustfs.sys/tmp` e `.rustfs.sys/multipart` seguem o tier, mas o
commit final usa a durabilidade do volume de destino.

### Override por bucket

```bash
curl -X PUT "http://host/rustfs/admin/v3/bucket-durability/photos" \
  -d '{"mode":"relaxed"}'
curl "http://host/rustfs/admin/v3/bucket-durability/photos"
curl -X DELETE "http://host/rustfs/admin/v3/bucket-durability/photos"
```

Resolução:
1. Namespace system-critical → `strict`.
2. Override do bucket (ambas as direções).
3. Modo global.

O override é propagado por notificação de metadata do bucket; se um peer perder
a notificação, converge no refresh periódico (15 min). Uma operação em voo
mantém o tier resolvido no início. `legacy-off` ignora overrides.

## Corrupção de metadados

- `xl.meta` vazio/ilegível é **corrupção**, não objeto ausente.
- RustFS reporta erro de metadata e mantém snapshots de usage incompletos;
  admissão de quota pode falhar fechada até um snapshot completo.
- Em multi-nó, tente heal a partir de réplicas saudáveis e valide as versões
  recuperadas antes de limpar qualquer drive.
- Sem cópia saudável ou backup, o índice de versões não é reconstruível só com
  shards.
- `DeleteObject` não é limpeza física de metadata corrompida.
- Após reparo/limpeza, aguarde um ciclo completo do scanner e confirme a
  publicação de usage antes de confiar na quota.

## Bitrot e integridade

- Todo shard é verificado no read path; `RUSTFS_OBJECT_GET_SKIP_BITROT_VERIFY`
  existe para medir o teto teórico e **nunca** deve ser default em produção.
- Leitura com shard faltando e `available > K` regenera paridade e compara com a
  paridade sobrevivente; divergência → `InvalidData "inconsistent read source
  shards"`.
- Shard integrity commitments independentes (SHA-256/Merkle por stripe) são
  opt-in: exigem `RUSTFS_SHARD_INTEGRITY_WRITE=true` **e**
  `RUSTFS_SHARD_INTEGRITY_FLEET_CONFIRMED=true`.
- Objetos legados mantêm o comportamento antigo; só um Deep scan/repair com
  fontes autenticadas produz recibo `VerifiedHealthy`.
- Inventário/auditoria usam `/rustfs/admin/v3/integrity`: `GET /readiness`,
  `GET /{bucket}/inventory` (1–100 por página) e jobs `audit`/`migrate`
  (`POST /{bucket}/jobs`, 1–64 itens, objeto até 5 GiB, 64 KiB/s–1 GiB/s).
- `audit` exige `expected_sha256` Base64 de 32 bytes (não ETag/hex) e só cobre
  objeto local, single-part, sem cifra/compressão/tier. `migrate` grava uma
  cópia nova com precondition create-only e exige bucket unversioned/plaintext,
  sem encryption, Object Lock, replication, lifecycle, quota ou notificação; não
  sobrescreve nem apaga a origem.
- `complete` significa “todos os itens terminaram”, não “todos passaram”:
  inspecione `verified`, `mismatch`, `unsupported`, `stale` e `conflict`.
- `EcN=0` com bitrot confirmado (`FileCorrupt`) não é reconstruível; restaure de
  backup/réplica e preserve `xl.meta`/`part.N` como evidência.

## Heal

- Seleciona a versão autoritativa por quorum de metadata.
- Recusa quando há mais shards ausentes do que a paridade pode reconstruir.
- Exige que a geometria armazenada corresponda ao set; caso contrário, recusa
  ("backend disks manually modified").
- Shards reconstruídos são gravados nos discos `outdated`, com
  `erasure.index` correto, e passam por `rename_data`.
- Read-repair é agendado quando a leitura funciona mas faltam shards.
- Scanner e MRF alimentam o heal; admin heal compartilha o lock `(bucket, object)`
  com PUT/delete/multipart complete/data movement.
- Heal **não** é bypass de lock: `nolock` é aceito na API e forçado a `false`.

## Formato `xl.meta`

Container (compatível com MinIO XL2 nos formatos cobertos):

| Offset | Conteúdo |
|---|---|
| 0 | Magic `XL2 ` (4 bytes) |
| 4 | major `1` (u16 LE) |
| 6 | minor `3` (u16 LE) |
| 8 | msgpack bin32 + length BE do meta blob |
| 13 | meta blob msgpack (array de versões) |
| 13+N | `0xce` + u32 BE = xxh64(meta, seed 0) |
| 13+N+5 | inline data (opcional) |

- Header dispatch por `header_ver`; cada versão valida o comprimento do array.
- `VersionType`: `Invalid=0`, `Object=1`, `Delete=2`, `Legacy=3`.
- UUIDs: 16 bytes crus; nil ⇄ `None`.
- `MTime`: unix nanos; epoch ⇄ `None`.
- `actual_size` negativo é sentinela válida para "comprimido, tamanho
  desconhecido".
- Chaves internas usam prefixos duplos RustFS/MinIO e sufixos exatos; mudar um
  sufixo órfã metadados existentes.
- Chaves desconhecidas devem ser ignoradas na leitura (forward-compat).

## Compatibilidade MinIO

| Artefato | Build default | `rio-v2` |
|---|---|---|
| `xl.meta` não cifrado (meta 1–3, inline, multipart, versionado) | lê | lê |
| `.metadata.bin` e IAM | importa | importa |
| SSE-S3/KMS (KMS estático do MinIO) | falha fechado | lê com a master key |
| SSE-C | falha fechado | lê com a chave do cliente |
| SSE via KES/KMS plugin/MinKMS | falha | falha |
| Drives RustFS lidos por MinIO | não suportado | não suportado |
| Objetos SSE RustFS lidos por MinIO | não suportado | não suportado |

A migração é **one-way** MinIO → RustFS. Objetos cifrados do MinIO listam e
fazem HEAD, mas o GET falha com `InvalidObjectState` no build padrão.

## Fonte

`docs/architecture/erasure-coding.md` (normativo);
`docs/architecture/minio-file-format-compat.md`;
`docs/operations/durability-modes.md`;
`docs/operations/no-parity-bitrot-recovery.md`;
`docs/operations/shard-integrity-audit.md`;
`docs/operations/shard-integrity-rollout.md`;
`docs/operations/cluster-lifecycle-operations.md`;
`crates/ecstore/src/config/storageclass.rs`;
`crates/ecstore/src/erasure/`.
