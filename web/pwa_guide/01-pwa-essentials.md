# PWA Essentials — Conceitos Fundamentais

## O Que É Uma PWA

Progressive Web App = site construído com tecnologias web que adquire superpoderes de app nativo.

### Espectro de Aplicações

| Tipo | Instalação | Offline | Background | Exemplo |
|---|---|---|---|---|
| Site tradicional | Não | Não | Não | Site informativo |
| PWA | Sim (ícone no SO) | Sim | Sim | App de chat, música |
| App nativo | Sim (app store) | Sim | Sim | iOS/Android SDK |

### Dois Únicos Requisitos Obrigatórios para Instalação

1. **Web App Manifest** — informações mínimas para instalação
2. **HTTPS** (ou `localhost`/`127.0.0.1` para dev)

### Características de App Nativo

- Ícone próprio no dispositivo
- Execução em janela própria (standalone)
- Operação offline e em background
- Push messages e notificações do sistema
- Share target / file handler
- Distribuição via app stores

## Arquitetura Bipartida

```
┌──────────────────────────────────────┐
│         MAIN THREAD (UI)             │
│  HTML, CSS, JS da interface          │
│  Acesso ao DOM, window, document     │
└────────────┬─────────────────────────┘
             │ (comunicação via postMessage)
┌────────────▼─────────────────────────┐
│      SERVICE WORKER (Background)     │
│  Cache e offline                     │
│  Background sync                     │
│  Push notifications                  │
│  SEM acesso ao DOM                   │
└──────────────────────────────────────┘
```

**Regra semântica:** SW **não** tem acesso a `window`/`document`. Roda em thread separada com escopo global `self`.

## Ciclo de Vida do Service Worker

```
Download → Install → Activate → (idle) → Terminate
                ↓              ↓
          Precaching     Limpeza de caches antigos
```

- `install`: precaching de recursos estáticos
- `activate`: limpeza de caches de versões anteriores
- `fetch`: interceptação de requisições de rede
- Eventos de background: `sync`, `push`, `periodicsync`, `backgroundfetch*`

## Progressive Enhancement (Ordem Correta)

1. HTML semântico (funciona sem JS)
2. CSS (layout responsivo)
3. JS (interatividade)
4. Service worker (offline)
5. Manifest (instalação)

## Mapa de Dependências

```
Manifest → Precisa de HTTPS → Permite Instalação
SW → Precisa de HTTPS → Permite Cache, Offline, Background
Cache API → SW ou Main thread → Cache.put/match/open
Background Sync → SW → Tarefas curtas (~5min)
Background Fetch → SW + Permissão → Downloads longos
Periodic Sync → SW + Permissão → Intervalos (browser decide)
Push API → SW + Permissão + VAPID → Notificações do servidor
```
