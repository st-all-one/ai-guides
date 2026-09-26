# SQLite3 — Guia Completo de Implementação Segura e Otimizada

**Baseado na documentação oficial do SQLite versão 3.53.0**

---

## O que é o SQLite?

SQLite é uma biblioteca em C que implementa um motor de banco de dados SQL
embarcado, sem servidor, sem configuração e transactional. É o banco de dados
mais implantado do mundo, presente em bilhões de dispositivos.

### Características Fundamentais

| Característica | Descrição |
|---|---|
| **Embedded** | Sem servidor separado — a biblioteca é linkada diretamente na aplicação |
| **Zero-config** | Sem arquivos de configuração, sem setup |
| **ACID** | Transações Atômicas, Consistentes, Isoladas e Duráveis |
| **Transactional** | Garantia mesmo em caso de queda de energia ou crash |
| **Full SQL** | Suporte a views, triggers, subqueries, CTEs, window functions, etc. |
| **Pequeno** | ~600KB com tudo habilitado, ~300KB com omissões |
| **Rápido** | Mais rápido que sistemas de arquivos para dados estruturados |
| **Confiável** | Testado com bilhões de casos de teste, fuzz-tested |
| **Portável** | Roda em qualquer lugar com C89+ compilador |

### Quando Usar SQLite

- **Embedded/IoT**: dispositivos com recursos limitados
- **Mobile**: iOS e Android usam SQLite nativamente
- **Desktop**: formato de arquivo de aplicação, config, cache
- **Web**: navegadores (via WASM), ferramentas de desenvolvimento
- **Middle-tier**: cache de dados, filas, ETL, análise local

### Quando NÃO Usar SQLite

- **Alta concorrência de escrita**: múltiplos escritores simultâneos em
  diferentes processos no mesmo host (WAL atenua, mas não elimina)
- **Acesso concorrente por rede**: NFS, SMB — sistemas de locking POSIX
  são problemáticos em redes
- **Grande volume de dados**: ~140TB máximo teórico (páginas de 64KB),
  mas outras soluções escalam melhor
- **Alta vazão de escrita (>100k transações/s)**: 50M+ transações/dia
  é possível, mas não com milhares de escritores simultâneos

## Filosofia do SQLite

O SQLite segue uma filosofia conservadora de design:

1. **Simplicidade sobre performance**: a implementação é mantida simples
   e correta. Otimizações são adicionadas só quando comprovadamente
   necessárias e seguras.

2. **Confiabilidade sobre velocidade**: se uma otimização aumenta o risco
   de corrupção, ela não é implementada ou é desativada por padrão.

3. **Testes exaustivos**: 100% de cobertura de branches, testes de mutação,
   testes de falha (OOM, I/O error), testes de crash em nível de página.

4. **Compatibilidade retroativa**: bancos criados em 2004 (v3.0) abrem
   sem migração na versão atual.

## Estrutura da Documentação Oficial (3.53.0)

A documentação completa do SQLite está disponível em `sqlite-doc-3530300/`.
Os arquivos HTML contêm:

| Área | Arquivos Principais |
|---|---|
| API C | `cintro.html`, `capi3ref.html`, `c3ref/` |
| SQL | `lang_*.html` (SELECT, INSERT, CREATE, etc.) |
| Compilação | `compile.html` |
| Performance | `optoverview.html`, `queryplanner.html`, `eqp.html` |
| Transações | `transactional.html`, `atomiccommit.html` |
| WAL | `wal.html` |
| Locking | `lockingv3.html` |
| Segurança | `security.html` |
| Tipos | `datatype3.html` |
| PRAGMAs | `pragma.html` |
| Limites | `limits.html` |
| Backup | `backup.html` |
| Extensões | `loadext.html`, `vtab.html`, `vfs.html` |
| FTS | `fts3.html`, `fts5.html` |
| JSON | `json1.html` |

---

**Próximo**: [02-compilacao.md](02-compilacao.md) — Configuração e Compilação
