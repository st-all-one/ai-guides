# Web App Manifest — Referência Completa

## Declaração no HTML

```html
<link rel="manifest" href="manifest.json" />
<link rel="manifest" href="/app.webmanifest" crossorigin="use-credentials" />
```

Cada página do PWA **deve** referenciar o manifest. Tipo MIME: `application/manifest+json`.

## Configuração Mínima para PWA Instalável

```json
{
  "name": "Meu App",
  "short_name": "App",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "start_url": "/",
  "display": "standalone",
  "prefer_related_applications": false
}
```

## Membros Essenciais

| Membro | Tipo | Obrigatório? | Função |
|---|---|---|---|
| `name` | String | Recomendado | Nome completo, accessible label do app instalado |
| `short_name` | String | Opcional | Versão curta (home screen, app switcher) |
| `id` | String (URL) | Opcional | ID único do app. Fallback: `start_url`. Mesma origem que `start_url` |
| `start_url` | String (URL) | Recomendado | URL ao lançar o app. Deve ser same-origin |
| `scope` | String (URL) | Opcional | Path das páginas do app. Sempre terminar com `/` |
| `display` | Keyword | Recomendado | Modo de exibição |
| `icons` | Array | Obrigatório | Ícones (192px + 512px exigidos pelo Chromium) |

## Display Modes

| Valor | Efeito |
|---|---|
| `standalone` | Janela própria, sem chrome do navegador |
| `browser` | Aba normal (fallback) |
| `fullscreen` | Tela cheia (jogos, mídia) |
| `minimal-ui` | UI mínima do navegador |

**CSS detection:** `@media (display-mode: standalone) { }`
**JS detection:** `window.matchMedia("(display-mode: standalone)").matches`

## Identidade Visual

### icons

```json
{
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- `purpose`: `any` (default), `maskable` (adaptável), `monochrome`
- `maskable`: conteúdo importante dentro de 80% do diâmetro central
- Sempre especificar `type` para performance

### screenshots

```json
{
  "screenshots": [
    { "src": "ss-wide.png", "sizes": "1280x720", "type": "image/png", "label": "Dashboard view", "form_factor": "wide" }
  ]
}
```

- `label`: obrigatório para acessibilidade
- `form_factor`: `narrow` (mobile) ou `wide` (desktop)
- `platform`: `android`, `ios`, `windows`, etc.

### theme_color / background_color

```json
{
  "theme_color": "#663399",
  "background_color": "#ffffff"
}
```

- `theme_color`: toolbar, status bar, task switcher. Fully opaque recomendado.
- `background_color`: splash screen + fundo durante carregamento. Deve combinar com CSS `background-color`.
- `theme_color` pode ser sobrescrito por `<meta name="theme-color" content="...">` (suporta `prefers-color-scheme`)

## Metadado

```json
{
  "description": "Descrição do app para app stores",
  "categories": ["productivity", "finance"]
}
```

## Shortcuts (Menu de Contexto)

```json
{
  "shortcuts": [
    {
      "name": "New item",
      "short_name": "New",
      "description": "Create a new item",
      "url": "/new",
      "icons": [{ "src": "icons/new.png", "sizes": "96x96" }]
    }
  ]
}
```

- `name` e `url` são obrigatórios
- `url` deve estar dentro do `scope`
- Aparece no clique direito / long-press do ícone do app instalado

## Integração com SO

### share_target (Receber Compartilhamento)

```json
{
  "share_target": {
    "action": "/handle-share",
    "method": "GET",
    "params": { "text": "description", "url": "link" }
  }
}
```

Para arquivos (POST + multipart):

```json
{
  "share_target": {
    "action": "/handle-files",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "files": [{ "name": "images", "accept": ["image/*"] }]
    }
  }
}
```

**Text (GET):** dados via `URLSearchParams` na página.
**Files (POST):** processar no SW via `event.request.formData()`.

### file_handlers (Abrir Arquivos do SO)

```json
{
  "file_handlers": [
    {
      "action": "/",
      "accept": { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] }
    }
  ]
}
```

Processar no JS:

```js
if ("launchQueue" in window) {
  launchQueue.setConsumer(async (launchParams) => {
    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      // processar arquivo
    }
  });
}
```

### protocol_handlers

```json
{
  "protocol_handlers": [
    { "protocol": "mailto", "url": "/handle-mail?to=%s" }
  ]
}
```

## Outros Membros

### display_override

Substitui a cadeia de fallback do `display`:

```json
{
  "display_override": ["window-controls-overlay", "tabbed", "standalone"]
}
```

### launch_handler (Experimental)

```json
{
  "launch_handler": { "client_mode": "focus-existing" }
}
```

### note_taking (Experimental)

```json
{
  "note_taking": { "new_note_url": "/new-note" }
}
```

### orientation

```json
{ "orientation": "portrait" }
```

Valores: `any`, `natural`, `portrait-primary`, `landscape-primary`, etc.

### related_applications + prefer_related_applications

```json
{
  "related_applications": [{ "platform": "play", "id": "com.example.app" }],
  "prefer_related_applications": false
}
```

**No Chromium:** `prefer_related_applications` deve ser `false` ou omitido para o PWA ser instalável.

## Localização (`*_localized`)

```json
{
  "name": "My App",
  "name_localized": {
    "pt-BR": "Meu App",
    "fr": "Mon App"
  },
  "shortcuts": [{
    "name": "Settings",
    "name_localized": { "pt-BR": "Configurações" },
    "url": "/settings"
  }]
}
```

Membros localizáveis: `name`, `short_name`, `description`, `icons`, e dentro de `shortcuts`.
Browser busca tag mais específica (`fr-CA` → `fr` → fallback não-localizado).

## Regras Importantes

| Regra | Explicação |
|---|---|
| `prefer_related_applications: true` | Impede instalação do PWA no Chromium |
| Sem ícone 192px ou 512px | Chromium não instala |
| Manifest em uma página só | Outras páginas não são reconhecidas como parte do PWA |
| `id` mudou = app diferente | Pode instalar lado a lado com versão anterior |
| `start_url` relativo | Resolvido contra URL do manifest; usar caminho consistente |
| `scope` sem trailing `/` | Prefix match pode capturar paths indesejados |
