# Boas Práticas e O Que Evitar

## Cross-Browser

- Teste em **todos** os browsers que seu público usa
- Use **feature detection** (nunca user-agent sniffing)
- Implemente **Progressive Enhancement** na ordem correta
- Safari tem suporte parcial a várias APIs — sempre verifique

| API | Chrome | Edge | Safari | Firefox |
|---|---|---|---|---|
| SW + Cache | ✅ | ✅ | ✅ | ✅ |
| Manifest | ✅ | ✅ | ✅ | ✅ |
| beforeinstallprompt | ✅ | ✅ | ❌ | ❌ |
| Web Share API | ✅ | ✅ | ✅ | ✅ |
| Share Target | ✅ | ✅ | ❌ | ❌ |
| Badging API | ✅* | ✅* | iOS 16.4+ | ❌ |
| File Handlers | ✅ | ✅ | ❌ | ❌ |
| Background Sync | ✅ | ✅ | ❌ | ❌ |
| Periodic Sync | ✅ | ✅ | ❌ | ❌ |
| Background Fetch | ✅ | ✅ | ❌ | ❌ |

*\*Chromium badges: Windows + macOS apenas (não Linux)*

## Performance

- `font-family: system-ui` — nativa, sem download
- Precaching da UI principal reduz drasticamente o carregamento
- Lazy loading de imagens com `loading="lazy"` + Intersection Observer
- `defer` em scripts não-críticos
- Dynamic import para módulos pesados
- Placeholder de imagens para evitar reflow

## Deep Links

- **Cada view do app deve ter uma URL única**
- Benefícios: bookmarks, compartilhamento, SEO
- Isso é um **superpoder da web** que PWAs não devem abandonar

## Acessibilidade

- HTML semântico (`<button>`, `<form>`, `<nav>`) — já suporta todos os inputs nativamente
- ARIA quando necessário
- Acessibilidade é **requisito legal** em muitas jurisdições
- Beneficia todos os usuários (deficiências temporárias, permanentes, situacionais)

## Aparência de App Nativo

- `display: standalone` — janela própria
- Ícones em múltiplos tamanhos + `purpose: maskable`
- `theme_color` + `background_color` combinando com CSS
- Suporte a `prefers-color-scheme` para tema claro/escuro
- Badge no ícone do app
- Registrar como share target / file handler
- Headers/footers compactos (não como site tradicional)

## Experiência Offline

- **Mínimo:** página offline customizada (em vez do erro genérico do browser)
- **Ideal:** app funciona offline com dados cacheados
- **Avançado:** background sync para ações pendentes

## ❌ O Que Evitar

### Arquitetura

| O que evitar | Alternativa correta |
|---|---|
| Achar que SW é obrigatório para PWA | Só manifest + HTTPS |
| SW acessando DOM | Comunicação via `postMessage()` |
| Cache sem estratégia | Use cache-first, network-first, ou stale-while-revalidate |
| Ignorar `event.waitUntil()` | SW pode ser morto antes da operação terminar |
| Cache de POST requests | POST não é idempotente |
| Operações longas sem `waitUntil` | Browser pode matar o SW |

### Manifest

| O que evitar | Alternativa correta |
|---|---|
| `prefer_related_applications: true` | Impede instalação no Chromium |
| Faltar ícone 192/512px | Chromium exige ambos |
| `start_url` inconsistente | Caminho absoluto ou relativo consistente |
| Manifest em uma página só | Referenciar em **todas** as páginas |
| `scope` sem trailing `/` | Prefix match pode capturar paths indesejados |

### Instalação

| O que evitar | Alternativa correta |
|---|---|
| Assumir `beforeinstallprompt` no iOS | Fallback: Share > Add to Home Screen |
| Esperar instalação cross-browser | Cada browser isola instalação |

### Background

| O que evitar | Alternativa correta |
|---|---|
| Background Sync para downloads grandes | Background Fetch |
| Background Fetch para tarefas curtas | Background Sync |
| Silent push | Nenhum browser suporta |
| Assumir periodic sync roda no intervalo | Browser decide frequência |

## Checklist Completo

### 🟢 Essencial (Mínimo para PWA)
- [ ] Manifest: `name`, `icons` (192+512), `start_url`, `display`
- [ ] HTTPS
- [ ] Página offline customizada
- [ ] Design responsivo

### 🟡 Recomendado (Boa Experiência)
- [ ] SW com estratégia de cache
- [ ] Precaching da UI principal
- [ ] Cache first para assets estáticos
- [ ] Deep links para todas as seções
- [ ] Testado em Chrome, Safari, Firefox
- [ ] `prefer_related_applications: false`
- [ ] Limpeza de cache no `activate`
- [ ] Feature detection + progressive enhancement
- [ ] Acessibilidade básica (HTML semântico)

### 🔵 Avançado (Experiência Nativa)
- [ ] Background Sync para ações pendentes
- [ ] Periodic Background Sync
- [ ] Push notifications (com consentimento)
- [ ] Background Fetch para downloads grandes
- [ ] `system-ui` para tipografia nativa
- [ ] Suporte a `prefers-color-scheme`
- [ ] Badge no ícone
- [ ] Share target / file handler
- [ ] Distribuição em app store (PWABuilder)
- [ ] Botão de instalação customizado (`beforeinstallprompt`)

## Segurança

- `start_url` **não** deve conter fingerprinting (`?user=123`)
- Push sempre com VAPID (criptografia + assinatura)
- `crossorigin="use-credentials"` se manifest requer auth
- CSP `img-src` adequada para fetch de ícones
- Dados de `share_target` devem ser validados (como form submission)
- GitHub Pages para dados sensíveis: **não recomendado** (público mesmo em repo privado)
