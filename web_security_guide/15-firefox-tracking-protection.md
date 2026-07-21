# Firefox Tracking Protection

Proteção contra tracking baseada em listas de domínios conhecidos por rastreamento cross-site. Ativa em **Private Browsing** e no modo **Enhanced Tracking Protection (ETP)**.

## 1. O Que é Bloqueado

Firefox bloqueia conteúdo carregado de domínios classificados como trackers (principalmente advertising e analytics).

### Feedback Visual
| Indicador | Localização |
|-----------|-------------|
| ⓘ na barra de endereço → "Blocking Tracking Cookies" | Page info popup |
| Console: `The resource at "X" was blocked because tracking protection is enabled` | Web Console |

## 2. Enhanced Tracking Protection (ETP)

Acessível em: `Settings → Privacy & Security → Enhanced Tracking Protection`

| Modo | Comportamento |
|------|--------------|
| **Standard** (padrão) | Bloqueia trackers conhecidos em janelas privativas |
| **Strict** | Bloqueia mais trackers, pode quebrar alguns sites |
| **Custom** | Usuário escolhe o que bloquear (cookies, trackers, fingerprints, cryptominers) |

Em todas as telas, o usuário pode adicionar exceções por site.

## 3. Impacto em Websites

### Sintomas de Breakage
- Conteúdo de terceiros não carrega (ads, analytics, widgets sociais)
- Callbacks que dependem de trackers não executam
- Layout pode ter "buracos" onde conteúdo foi bloqueado

### Google Analytics — Exemplo de Código Frágil
```js example-bad
function trackLink(url, event) {
  event.preventDefault();
  ga("send", "event", "outbound", "click", url, {
    transport: "beacon",
    hitCallback() {
      document.location = url;
    },
  });
}
```

### — Versão Resiliente
```js example-good
function trackLink(url, event) {
  event.preventDefault();
  if (window.ga && ga.loaded) {
    ga("send", "event", "outbound", "click", url, {
      transport: "beacon",
      hitCallback() {
        document.location = url;
      },
    });
  } else {
    document.location = url;
  }
}
```

### Regra Geral
- **Sempre** verifique se o objeto do third-party foi carregado antes de usá-lo
- Não dependa de trackers para funcionalidade crítica
- Graceful degradation: o site deve funcionar sem trackers

## 4. Como o Firefox Decide o que Bloquear

Firefox mantém uma **lista de domínios de tracking** (Disconnect list). Quando tracking protection está ativa:

1. Browser consulta a lista para cada recurso third-party
2. Se o domínio está na lista → bloqueado
3. O bloqueio inclui cookies, storage, e requests

## 5. Testing

- Testar em **Firefox Nightly** (versão mais recente das proteções)
- Reportar sites quebrados via [Bugzilla](https://bugzilla.mozilla.org/) (componente: Tracking Protection)
- Ou via Firefox: Control Center → "Report a Problem"

## 6. Resumo para Desenvolvedores

- [ ] Testar o site com ETP Strict
- [ ] Verificar se callbacks de third-parties têm fallback
- [ ] Não usar trackers para funcionalidade essencial
- [ ] Auditar dependências de advertising/analytics
- [ ] Considerar alternativas privacy-preserving (ex: analytics próprio)
