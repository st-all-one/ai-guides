# Tutorial: CycleTracker — Sua Primeira PWA do Zero

## Visão Geral

App de rastreamento menstrual que começa como um site comum e é progressivamente melhorado até virar PWA instalável e offline.

**Stack:** HTML + CSS + JavaScript (vanilla, sem frameworks)  
**Armazenamento:** localStorage (dados 100% no dispositivo, sem servidor)  
**Código fonte:** https://github.com/mdn/pwa-examples/tree/main/cycletracker  
**Live demo:** https://mdn.github.io/pwa-examples/cycletracker/service_workers/

---

## Passo 1: HTML + CSS (Shell Estático)

### Estrutura do HTML

```html
<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Cycle Tracker</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>Period tracker</h1>
  <form>
    <fieldset>
      <legend>Enter your period start and end date</legend>
      <p>
        <label for="start-date">Start date</label>
        <input type="date" id="start-date" required />
      </p>
      <p>
        <label for="end-date">End date</label>
        <input type="date" id="end-date" required />
      </p>
    </fieldset>
    <p>
      <button type="submit">Add Period</button>
    </p>
  </form>
  <section id="past-periods"></section>
  <script src="app.js" defer></script>
</body>
</html>
```

### CSS

```css
body {
  margin: 1vh 1vw;
  background-color: #eeffee;
}
ul, fieldset, legend {
  border: 1px solid;
  background-color: white;
}
ul {
  padding: 0;
  font-family: monospace;
}
li, legend {
  list-style-type: none;
  padding: 0.2em 0.5em;
  background-color: #ccffcc;
}
li:nth-of-type(even) {
  background-color: inherit;
}
```

---

## Passo 2: Servidor Local (HTTPS)

PWAs exigem HTTPS. Para desenvolvimento:

```bash
# Opção 1: Python
python3 -m http.server 8080

# Opção 2: npx http-server
npx http-server . -p 8080

# Opção 3: HTTPS local com certificado embutido
npm install -g local-web-server
ws --https
```

`localhost` e `127.0.0.1` são tratados como seguros mesmo sem HTTPS real.

---

## Passo 3: JavaScript + localStorage

### app.js completo

```js
const newPeriodFormEl = document.getElementsByTagName("form")[0];
const startDateInputEl = document.getElementById("start-date");
const endDateInputEl = document.getElementById("end-date");
const pastPeriodContainer = document.getElementById("past-periods");
const STORAGE_KEY = "period-tracker";

newPeriodFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const startDate = startDateInputEl.value;
  const endDate = endDateInputEl.value;
  if (checkDatesInvalid(startDate, endDate)) return;
  storeNewPeriod(startDate, endDate);
  renderPastPeriods();
  newPeriodFormEl.reset();
});

function checkDatesInvalid(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    newPeriodFormEl.reset();
    return true;
  }
  return false;
}

function storeNewPeriod(startDate, endDate) {
  const periods = getAllStoredPeriods();
  periods.push({ startDate, endDate });
  periods.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
}

function getAllStoredPeriods() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function renderPastPeriods() {
  const periods = getAllStoredPeriods();
  if (periods.length === 0) return;
  pastPeriodContainer.textContent = "";
  const header = document.createElement("h2");
  header.textContent = "Past periods";
  const list = document.createElement("ul");
  periods.forEach((period) => {
    const li = document.createElement("li");
    li.textContent = `From ${formatDate(period.startDate)} to ${formatDate(period.endDate)}`;
    list.appendChild(li);
  });
  pastPeriodContainer.appendChild(header);
  pastPeriodContainer.appendChild(list);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", { timeZone: "UTC" });
}

renderPastPeriods();
```

**Nesse ponto você tem uma web app funcional, mas ainda não é uma PWA.**

---

## Passo 4: Manifest (Torna Instalável)

### cycletracker.json

```json
{
  "name": "CycleTracker: Period Tracking app",
  "short_name": "CT",
  "description": "Securely track your menstrual cycle. Data stays on your device.",
  "start_url": "./",
  "theme_color": "#eeffee",
  "background_color": "#eeffee",
  "display": "standalone",
  "icons": [
    { "src": "circle.ico", "sizes": "48x48" },
    { "src": "icons/circle.svg", "sizes": "72x72 96x96", "purpose": "maskable" },
    { "src": "icons/tire.svg", "sizes": "128x128 256x256" },
    { "src": "icons/wheel.svg", "sizes": "512x512" }
  ]
}
```

### Link no HTML

```html
<link rel="manifest" href="cycletracker.json" />
<link rel="icon" href="icons/circle.svg" />
```

### Debugging

- **Chrome/Edge DevTools** → Application → Manifest — mostra todos os membros, erros e warnings
- **Firefox DevTools** → Application → Manifest — também suportado
- Use o painel para validar icons maskable e ver o safe area (80% central)

---

## Passo 5: Service Worker (Torna Offline)

### sw.js completo

```js
const VERSION = "v1";
const CACHE_NAME = `period-tracker-${VERSION}`;
const APP_STATIC_RESOURCES = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./cycletracker.json",
  "./icons/wheel.svg",
];

// Install — precaching dos recursos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RESOURCES);
    })()
  );
});

// Activate — limpa caches de versões antigas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
      await clients.claim();
    })()
  );
});

// Fetch — sempre responde do cache, nunca da rede
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(caches.match("./"));
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request.url);
      return cached || new Response(null, { status: 404 });
    })()
  );
});
```

### Registro no HTML

Adicione no `index.html` antes de `</body>`:

```html
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
</script>
```

---

## Versionamento

A única forma de forçar atualização no usuário é alterar `sw.js`. Padrão:

```
VERSION = "v1" → VERSION = "v2"
```

Isso cria um novo cache (`period-tracker-v2`) e o `activate` deleta o antigo.

---

## Debugging Durante Desenvolvimento

| Técnica | Como fazer |
|---|---|
| Hard refresh | Ctrl+Shift+R (Win) / Shift+Cmd+R (Mac) |
| DevTools "Update on reload" | Re-registra SW a cada reload |
| DevTools "Bypass for network" | Ignora SW, carrega tudo da rede |
| Unregister manual | Application → Service Workers → Unregister |
| Atualizar VERSION | Só para produção; não precisa no dia-a-dia |

---

## Distribuição

- GitHub Pages: `https://<username>.github.io/<repo>/`
- Dados ficam no localStorage do usuário (não no servidor)
- GitHub Pages é **público** mesmo em repo privado
