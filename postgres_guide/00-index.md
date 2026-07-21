# PostgreSQL — Guia de Padrões Modernos e Segurança de Dados

## Sobre este guia

Compilado a partir da documentação oficial do PostgreSQL 18.4 (1.147 páginas HTML analisadas). Otimizado para consulta por IA e desenvolvedores. 19 guias, ~9.610 linhas.

Foco: **padrão moderno, semântica correta, prevenção de perda de dados, segurança**.

## Sumário

| Arquivo | Tópico |
|---------|--------|
| `01-ddl-modelagem.md` | DDL moderno: tipos, constraints, identidade, particionamento, generatad columns, domínios |
| `02-dml-consultas.md` | DML: CTEs recursivas, MERGE, RETURNING, window functions, queries de tabelas grandes |
| `03-transactions-concorrencia.md` | MVCC, isolamento, locks, deadlocks, dicas de concorrência segura |
| `04-seguranca-dados.md` | Row-Level Security, criptografia, SSL/TLS, SCRAM, roles, privilégios mínimos |
| `05-backup-pitr.md` | Backup físico e lógico, WAL archiving, Point-in-Time Recovery, validação de restore |
| `06-configuracao-producao.md` | postgresql.conf para produção: fsync, WAL, checkpoint, autovacuum, recursos |
| `07-server-programming.md` | Functions, Procedures, Triggers, SECURITY DEFINER, extensões, boas práticas PL/pgSQL |
| `08-indices-performance.md` | Tipos de índice, BRIN, GiST, GIN, partial indexes, expressional indexes, EXPLAIN |
| `09-manutencao-monitoramento.md` | VACUUM, autovacuum, wraparound, REINDEX, pg_stat_*, logs, alertas |
| `10-client-security.md` | Segurança no cliente: SSL/TLS, require_auth, channel_binding, OAuth, .pgpass, env vars, SSH tunnels, GSSAPI |
| `11-ha-replicacao.md` | HA e replicação: físicia (streaming, slots, sync), lógica (publication, subscription, conflitos), pg_rewind, failover, hot standby |
| `12-kernel-upgrade.md` | Kernel/OS: systemd RemoveIPC, OOM killer, huge pages, shared memory; upgrade: pg_upgrade, pg_dumpall; non-durability detalhado |
| `13-funcoes-builtin.md` | Catálogo de funções built-in: string, datetime, aggregate, JSON (SQL/JSON), window, pattern matching, conditional, system info, admin |
| `14-extensoes-essenciais.md` | Extensões essenciais: amcheck, passwordcheck, pg_stat_statements, postgres_fdw, pg_trgm, citext, pg_prewarm, pgcrypto e mais |
| `15-server-programming-avancado.md` | PL/Python, PL/Perl (trusted vs untrusted), Background Workers, SPI, Logical Decoding, C functions, Custom WAL RMGR |
| `16-information-schema.md` | Information Schema, System Catalogs (pg_class, pg_attribute, etc.), Views Estatísticas, Wait Events, Consultas de Diagnóstico |
| `17-tipos-avancados.md` | Tipos avançados: bytea, network (inet/cidr), geometric, ENUM, XML, bit, ranges, composite, OID, pg_lsn, pseudo-types, type conversion |
| `18-ferramentas-diagnostico.md` | pgbench, pg_waldump, pg_controldata, pg_verifybackup, pg_checksums, pg_isready, SQLSTATE, limites, progress reporting |
| `19-internals-armazenamento.md` | Storage (page layout, TOAST, FSM, VM, HOT), WAL internals, Transaction internals (XID, MVCC, 2PC), Index AM (B-Tree, GIN, GiST, SP-GiST, Hash, BRIN), Planner/Statistics |

## Convenções usadas

- `✅` — padrão moderno recomendado
- `⚠️` — atenção: risco de segurança ou perda de dados
- `🛑` — antipadrão: NÃO usar
- `📝` — exemplo prático
- `🔍` — detalhe de implementação

## Princípios gerais extraídos da documentação

1. **Durabilidade primeiro**: `fsync=on`, `full_page_writes=on`, `wal_level=replica`, `synchronous_commit=on` são defaults por boas razões — alterá-los requer justificativa explícita e aceitação do risco
2. **Privilégio mínimo**: roles pré-definidas (pg_read_all_data, pg_write_all_data) evitam superuser abusivo; RLS complementa
3. **Autovacuum é crítico**: wraparound causa perda total de dados; monitore `age(relfrozenxid)` e NUNCA desative
4. **Backup não testado não existe**: WAL archiving + pg_basebackup periódico + testes de restore são obrigatórios
5. **SCRAM-SHA-256 é o padrão**: MD5 está deprecated; `password_encryption` deve ser `scram-sha-256`
6. **Views precisam de `security_barrier`** para evitar vazamento de dados via funções de custo artificialmente baixo
7. **SECURITY DEFINER exige `SET search_path`** para evitar ataques de trojan via schema público
8. **Generated columns e identity columns** substituem SERIAL e triggers manuais para valores auto-incrementados
9. **SSL/TLS no cliente**: `sslmode=prefer` (default) NÃO protege contra MITM; produção exige `verify-full`
10. **systemd RemoveIPC** pode corromper dados silenciosamente — crie usuário postgres como system user
11. **pg_upgrade**: `--no-sync` corrompe dados em crash do SO; prefira `--clone` (reflink) ou `--link`
12. **Replicação lógica**: `run_as_owner=true` é perigoso; publications não têm controle de acesso
13. **Replicação física**: `wal_log_hints=on` OU data_checksums são pré-requisitos para pg_rewind
14. **ENUM vs lookup table**: ENUM para valores fixos, lookup table para valores mutáveis
15. **sslmode=prefer** é o default no cliente e NÃO protege contra MITM — produção exige `verify-full`
16. **systemd RemoveIPC** corrompe shared memory — crie usuário postgres com `useradd -r`
17. **pg_upgrade**: `--no-sync` corrompe em crash OS; `--clone` (reflink) é o mais seguro
18. **Replicação lógica**: `run_as_owner=true` permite execução arbitrária via triggers; publications sem ACL
