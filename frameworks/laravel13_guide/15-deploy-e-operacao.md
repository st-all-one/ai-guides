# Deploy e operação — Laravel 13.x

> **Versão:** Laravel 13.x · PHP 8.3–8.5. Ciclo de deploy: `optimize` → health →
> restart de workers → observação de SLIs.

---

## 1. Sequência de deploy

```bash
# 1) modo manutenção com retry (drena tráfego)
php artisan down --retry=60

# 2) código e dependências
composer install --no-dev --prefer-dist --optimize-autoloader
npm ci --ignore-scripts && npm run build

# 3) schema (reversível, com backup prévio)
php artisan migrate --force --isolated

# 4) caches de produção
php artisan optimize                 # config + event + route + view
php artisan storage:link             # se usar disk público

# 5) processos de longa duração
php artisan queue:restart            # workers queue:work
php artisan octane:reload            # se usar Octane

# 6) volta
php artisan up
```

`optimize` agrega os quatro caches; `optimize:clear` desfaz
(`samples/doc-deployment.md`). `storage:link` e `migrate --force` devem ser
idempotentes e precedidos de backup.

> health check `/up` já está no `withRouting` do skeleton
> (`samples/samples-bootstrap-app.php:8-13`): configure o load balancer para usá-lo.

---

## 2. Processos e supervisão

| Processo | Supervisão | Restart no deploy |
|---|---|---|
| PHP-FPM/FrankenPHP | systemd/Supervisor | reload do pool |
| `queue:work` | Supervisor/systemd | `queue:restart` obrigatório (`samples/doc-queues.md:2580-2607`) |
| Octane | `--supervisor` / systemd | `octane:reload` (`samples/doc-octane.md:411-419`) |
| Scheduler | cron chamando `schedule:run` uma vez/min | sem restart |
| Horizon | supervisor do Horizon | `horizon:terminate`/restart |

Workers são processos de longa duração e **não veem mudanças de código** sem restart
(`samples/doc-queues.md:2595-2605`). Esse é o erro mais comum de deploy "que funcionou
local".

---

## 3. Config de produção e segredos

- `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` canônico com HTTPS.
- `LOG_LEVEL=info` ou superior; `LOG_STACK` com stack + agregador externo.
- `SESSION_SECURE_COOKIE=true`, `SESSION_HTTP_ONLY=true`, `SESSION_SAME_SITE=lax` (ou
  `none` apenas com HTTPS e CORS explícito).
- `CACHE_PREFIX`, `REDIS_PREFIX`, `SESSION_COOKIE` definidos explicitamente — o 13
  mudou os defaults (`samples/doc-upgrade-13.md:95-117`).
- `serializable_classes` e `session.serialization` revisados
  (`samples/samples-config-cache.php:131-134`, `samples/samples-config-session.php:219-231`).

---

## 4. Escala horizontal

- Use Redis centralizado para cache, sessão, filas e throttling — locks locais não
  funcionam entre nós (`samples/doc-cache.md:496-499`).
- Sticky sessions não são necessárias quando sessão e cache são compartilhados.
- `trustProxies(at: [...])`/`trustHosts(at: [...])` no `withMiddleware` para IP e
  HTTPS corretos atrás de LB.
- Octane: defina worker count e `--max-requests`/`--max-execution-time`
  (`samples/doc-octane.md:373-410`).

---

## 5. Runbook de incidentes

| Sintoma | Primeiro comando | Próximo passo |
|---|---|---|
| 5xx generalizado | `php artisan pail` (dev) / logs agregados | ver `withExceptions` e canal de erro |
| Fila parada | `php artisan horizon:status` ou `supervisorctl status` | `queue:restart`, ver failed jobs |
| Cache frio | checar `CACHE_PREFIX`/`REDIS_PREFIX` | comparar com config anterior |
| Sessões caindo | checar `session.serialization` e cookie | decidir reautenticação |
| Deploy sem efeito | `queue:restart` / `octane:reload` | processo long-lived com código antigo |

---

## 6. Backup e recuperação

Backup do banco **antes** de `migrate --force`, das variáveis de ambiente e dos assets
versionados. Teste restore em staging. Failed jobs devem ser preservados para auditoria
(`samples/doc-queues.md:2937-3189`) e `queue:flush` só após análise.

## Resumo de Pontos-Chave

- **`down --retry=60` → optimize → migrate → restart → `up`** é o ciclo seguro.
- **`queue:restart` e `octane:reload` são obrigatórios** após deploy de código.
- **`/up` é o health check padrão** — use no load balancer.
- **Redis centralizado** é pré-requisito de lock/throttle/sessão em múltiplos nós.
- **Proxies confiáveis** antes de limitar por IP.
- **Prefixos e serialização** são os primeiros suspeitos em incidente pós-upgrade.
- **Backup antes de migrate --force**; failed jobs são registro de auditoria.
