# Instalação e Integração com o SO

## Como a Instalação Funciona

- Chromium: ícone de instalação na URL bar (quando critérios são atendidos)
- Safari macOS Sonoma+: File > Add to Dock
- Safari iOS 16.4+: Share menu > Add to Home Screen
- Firefox desktop: **não suporta** instalação via manifest (extensão PWA)
- iOS anterior a 16.4: **somente** Safari

### Requisitos de Instalação no Chromium

```json
{
  "name": "App",
  "icons": [
    { "src": "/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "start_url": "/",
  "display": "standalone",
  "prefer_related_applications": false
}
```

- `name` **ou** `short_name`
- `icons` com 192px e 512px
- `start_url`
- `display` **ou** `display_override`
- `prefer_related_applications: false`

## Evento beforeinstallprompt (Chromium-only)

```html
<button id="install" hidden>Instalar App</button>
```

```js
let installPrompt = null;
const installButton = document.querySelector("#install");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.removeAttribute("hidden");
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  const result = await installPrompt.prompt();
  console.log(result.outcome); // "accepted" | "dismissed"
  disableInstallPrompt();
});

window.addEventListener("appinstalled", () => {
  disableInstallPrompt();
});

function disableInstallPrompt() {
  installPrompt = null;
  installButton.setAttribute("hidden", "");
}
```

**Regras:**
- `event.prompt()` só pode ser chamado **uma vez** por evento
- **Não suportado no iOS** — fallback necessário
- O evento pode nunca disparar (já instalado, critérios não atendidos)

### Por que `beforeinstallprompt` Pode Não Disparar

- PWA já está instalada
- App não atende critérios de instalabilidade
- Dispositivo não suporta (ex: iOS antes de 16.4)

## Comportamento Pós-Instalação

- Ícone no dock/home screen (ao lado de apps nativos)
- Abre em janela standalone (se `display: standalone`)
- Cada navegador mantém instalação isolada
- Mesmo PWA em dois browsers = duas instâncias independentes
- Dados **não** são compartilhados entre instalações de browsers diferentes

## Distribuição em App Stores

- Google Play Store (Trusted Web Activity / PWABuilder)
- Microsoft Store
- Meta Quest Store
- iOS App Store (via PWABuilder ou wrapper)

Ferramenta: [PWABuilder](https://docs.pwabuilder.com/)

## Compartilhamento (Web Share API)

**Compartilhar de dentro do PWA:**
```js
button.addEventListener("click", async () => {
  try {
    await navigator.share({
      title: "Título",
      text: "Texto",
      url: "https://example.com",
    });
  } catch (err) {
    // usuário cancelou ou erro
  }
});
```

**Com suporte a arquivos:**
```js
if (navigator.share && navigator.canShare({ files: [file] })) {
  await navigator.share({ files: [file] });
}
```

## Receber Compartilhamento (Share Target)

Ver `02-web-app-manifest.md` para configurar o manifest.

**Text (GET):** dados na URL como query params.
**Files (POST):** processar no service worker:

```js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "POST") return;
  const url = new URL(event.request.url);
  if (url.pathname !== "/handle-files") return;

  event.respondWith(
    (async () => {
      const formData = await event.request.formData();
      const files = formData.getAll("images");
      // salvar no cache / IndexedDB
      return Response.redirect("/display-files", 303);
    })()
  );
});
```

## File Handlers (Associação de Arquivos)

Ver `02-web-app-manifest.md` para configurar.

```js
if ("launchQueue" in window) {
  launchQueue.setConsumer(async (launchParams) => {
    for (const handle of launchParams.files) {
      const file = await handle.getFile();
      // exibir no DOM
    }
  });
}
```

**Fluxo de permissão:** primeira vez que o SO redireciona arquivo → browser pergunta "Allow app to open files?" → usuário aceita → `launchQueue` callback dispara.

## Pontos de Atenção

| Situação | Ação correta |
|---|---|
| App instalado em Chrome × Edge | Dados isolados (esperado) |
| `beforeinstallprompt` no iOS | Não funciona — fallback: Share > Add to Home Screen |
| Firefox desktop | Não instala PWA — fallback: experiência web normal |
| App já instalado | Esconder botão de instalação |
