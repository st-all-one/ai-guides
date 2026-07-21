# Compilado de Padrões Modernos para Documentação de Web APIs

Este diretório contém uma análise aprofundada dos padrões modernos de documentação de Web APIs, baseada na revisão completa dos diretórios `/api/` (1228+ interfaces) e `/media/` (guias de mídia) do repositório MDN.

## Documentos Principais

| # | Documento | Descrição |
|---|-----------|-----------|
| 01 | [Padrão Moderno de Documentação](01-padrao-moderno-web-api.md) | Filosofia geral, estrutura de diretórios, front matter YAML, macros de template, anatomia de páginas, formatação de links, relação slug ↔ pastas |
| 02 | [Semântica e Arquitetura](02-semantica-arquitetura.md) | Princípios semânticos, hierarquia de informação (4 níveis), interdependências entre APIs, seções críticas, padrões de front matter, versionamento e status |
| 03 | [Boas Práticas e Armadilhas](03-boas-praticas-armadilhas.md) | 8 boas práticas (com exemplos certo/errado), 8 anti-patterns identificados no repositório real, checklist de qualidade |
| 04 | [Template Modelo Base](04-template-modelo-base.md) | Templates completos para: API overview, guide, interface, método, propriedade — com badges, seções, front matter |
| 05 | [Mapeamento de Interdependências](05-mapeamento-interdependencias.md) | APIs de fundação, cadeias de dependência complexas (Shared Storage→Fenced Frame, Speculation Rules→APIs deferidas), matriz de compatibilidade, APIs standalone |
| 06 | [Glossário de Macros e Tipos](06-glossario-macros-tipos.md) | Catálogo completo de macros MDN (sidebar, badges, conteúdo, template), page-types, convenções de nomenclatura, mapa de slugs |
| 07 | [Integração Media/API](07-integracao-media-api.md) | Relação atual entre guias de mídia e referências de API, lacunas identificadas (WebCodecs, PiP, Screen Capture), recomendações de integração e novos guias |

## Documentos Complementares (Gaps)

| # | Documento | Tópico | Gaps Cobertos |
|---|-----------|--------|---------------|
| 08 | [Front Matter: Campo `sidebar:`](08-front-matter-sidebar.md) | Mecanismo YAML vs macros de sidebar, diferenças arquiteturais media/api | 2, 18 |
| 09 | [Template para Eventos](09-template-eventos.md) | Template completo para subpáginas de evento (`web-api-event`) | 4 |
| 10 | [Template para Construtores](10-template-construtores.md) | Template completo para subpáginas de construtor (`web-api-constructor`) | 5 |
| 11 | [Macros Adicionais](11-macros-adicionais.md) | Macros não documentadas (`EmbedGHLiveSample`, `SubPagesWithSummaries`) e variantes de capitalização | 3, 8, 9, 10, 17 |
| 12 | [Front Matter: Campo `status:`](12-front-matter-status.md) | Convenções de status (experimental, deprecated, non-standard), formato string vs array | 6, 15 |
| 13 | [Convenções para Guias](13-convencoes-guias.md) | Nomenclatura de subdiretórios de guia, quando criar, raridade de guias | 7, 23 |
| 14 | [Integração Media/API v2](14-integracao-media-api-v2.md) | Tabela corrigida e expandida, APIs adicionais, recomendações de cross-link | 11, 22 |
| 15 | [Grupos de API Não Mapeados](15-mapeamento-api-grupos.md) | Privacy Sandbox, PWA, Houdini, Device APIs, SVG, WebTransport+Streams, WebCodecs+Streams | 12, 16, 20, 21 |
| 16 | [Segurança e Boas Práticas](16-seguranca-boas-praticas.md) | Badges de segurança vs seção dedicada, checklist de requisitos | 13 |
| 17 | [Convenções de Capitalização](17-convencoes-titulos.md) | Sentence case vs title case, exceções, regras | 14 |
| 18 | [Convenções EmbedLiveSample](18-embedlivesample-convencoes.md) | ID pairing, mecanismo de slug, padrões de uso, anti-patterns | 19 |
| 19 | [Anti-pattern: múltiplos spec-urls](19-spec-urls-anti-pattern.md) | Critérios para spec-urls, exemplos excessivos vs aceitáveis, boas práticas | 24 |
| 20 | [Page-types Complementares](20-page-types-complementares.md) | `webgl-extension-method`, `landing-page` vs `listing-page`, tabela completa | 1, 25 |

## Metodologia

- Revisão de **1228+ entries** no diretório `/api/`
- Leitura completa de **20+ APIs** representativas (Fetch, WebSocket, WebGPU, WebCodecs, WebRTC, Streams, Credential Management, WebAuthn, Compute Pressure, Speculation Rules, Fenced Frame, Shared Storage, Trusted Types, Performance, entre outras)
- Leitura completa de **24+ arquivos** no diretório `/media/` (~12.000+ linhas)
- Análise de interdependências, anti-patterns, lacunas e sobreposições
- **Segunda rodada**: revisão de cobertura identificou 25 lacunas nos documentos 01-07, corrigidas nos documentos 08-20
- Compilação otimizada para consumo por IA e por desenvolvedores

## Atualizações

| Data | Versão | Mudanças |
|------|--------|----------|
| 2026-07-21 | 1.0 | Documentos iniciais (01-07) |
| 2026-07-21 | 2.0 | Documentos complementares (08-20) corrigindo 25 lacunas identificadas |
