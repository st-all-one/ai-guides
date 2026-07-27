# Caddy Guide — AI-Optimized Reference

Guia completo e sistematizado sobre o servidor web **Caddy** (v2), focado em performance, segurança, integrabilidade e boas práticas de produção. Todo o conteúdo é derivado da documentação oficial do Caddy, condensado e organizado para leitura por IA e humanos.

## Estrutura

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [01-installation.md](01-installation.md) | Instalação, build customizado, xcaddy, Docker, systemd |
| 02 | [02-fundamentals.md](02-fundamentals.md) | Arquitetura, lifecycle de módulos, conceitos fundamentais |
| 03 | [03-caddyfile-reference.md](03-caddyfile-reference.md) | Referência completa da Caddyfile (diretivas, matchers, opções globais) |
| 04 | [04-json-configuration.md](04-json-configuration.md) | Configuração JSON, admin API, adapters |
| 05 | [05-performance.md](05-performance.md) | Otimização de performance (compressão, buffers, timeouts, HTTP/2, HTTP/3) |
| 06 | [06-security-tls.md](06-security-tls.md) | HTTPS automático, ACME, TLS, ECH, On-Demand TLS |
| 07 | [07-reverse-proxy.md](07-reverse-proxy.md) | Proxy reverso, load balancing, health checks, streaming |
| 08 | [08-observability.md](08-observability.md) | Logging, métricas (Prometheus/OTLP), tracing, profiling |
| 09 | [09-deployment.md](09-deployment.md) | Deploy em produção, Docker, systemd, cluster, storage distribuído |
| 10 | [10-integration-patterns.md](10-integration-patterns.md) | Padrões de integração (PHP, SPA, CDN, autenticação delegada) |
| 11 | [11-extending-caddy.md](11-extending-caddy.md) | Extensão com módulos, plugins, Caddyfile customizada |
| 12 | [12-troubleshooting.md](12-troubleshooting.md) | Troubleshooting, profiling, debugging, erros comuns |

## Como usar este guia

- **Para configuração rápida**: Comece por `01-installation.md` e `02-fundamentals.md`
- **Para otimizar performance**: `05-performance.md` é o foco principal
- **Para segurança/TLS**: `06-security-tls.md`
- **Para deploy em produção**: `09-deployment.md`
- **Para integrações**: `07-reverse-proxy.md` e `10-integration-patterns.md`
- **Referência completa de diretivas**: `03-caddyfile-reference.md`
- **Monitoramento**: `08-observability.md`

Cada arquivo é auto-contido e referência cruzada com os demais quando necessário.
