# 12 — Service workers e direções futuras

Este guia cobre o **WebMCP para Service Workers** (explicador suplementar) e as **direções futuras / perguntas em aberto** do padrão, além do status de implementação nos navegadores.

## Parte 1 — WebMCP para Service Workers

O WebMCP original cobre páginas que já estão sendo navegadas. Mas às vezes o agente precisa de contexto e ferramentas de um site que **o usuário não tem aberto** — ex.: o usuário está vendo um acampamento no mapa e quer que o agente faça uma reserva **sem navegar a aba**.

**TL;DR**: este explicador descreve como sites registram **service workers como provedores WebMCP**. As chamadas de ferramenta são tratadas no script do service worker, **sem abrir nenhuma janela**. Se uma ferramenta exigir interação do usuário (ex.: pagamento), o `execute` pode **abrir uma janela** e se comunicar com ela via `postMessage`.

### Caso de uso — Produtividade

**Sarah** trabalha no laptop e precisa capturar tarefas sem interromper o fluxo. Não está no app de lista de tarefas, mas o app registrou ferramentas WebMCP via service worker:

> **Sarah**: Adicione "Buscar roupas na lavanderia" e "Ligar para o dentista" à minha lista de tarefas.

O agente reconhece que `todoapp.example` registrou ferramentas via service worker — ex.: `addTodoItem(item, priority, due_date)`. O service worker:
1. Atualiza os dados locais da lista.
2. Sincroniza com a API backend se houver rede.
3. Mostra notificações do sistema.

O service worker age como um **serviço MCP local sempre disponível** que gerencia estado e dá feedback via notificações.

### Caso de uso — Compra de mantimentos

**Mike** quer delegar planejamento de refeições e compras, mas **revisar e completar o pagamento manualmente**. O service worker do `freshmart.example` expõe `searchProducts`, `addToCart`, `placeOrder`.

O agente planeja as refeições, chama `searchProducts`/`addToCart` para cada ingrediente; `placeOrder()` no service worker:
1. Verifica se há pagamento salvo.
2. Como não há, **abre uma janela** para `freshmart.example/checkout` com carrinho e preferências de entrega pré-populados, deixando os campos de pagamento vazios.
3. Mike preenche o pagamento com segurança; a janela sinaliza o service worker via `postMessage` para completar `placeOrder()`.

**Resultado**: o agente nunca vê nem manipula credenciais de pagamento; a automação cobre as partes tediosas.

### Descoberta e instalação

- Service workers são instalados normalmente via `navigator.serviceWorker.register()` quando o usuário visita o site.
- Para descoberta sob demanda, o manifest do web app pode usar o campo experimental **`serviceworker`** (da Payment Handler API) para **instalação Just-In-Time (JIT)** — o navegador busca o script diretamente sem o usuário navegar:

```json
{
  "name": "Example App",
  "description": "This is an example WebMCP app.",
  "start_url": "/",
  "serviceworker": {
    "src": "service-worker.js",
    "scope": "/",
    "use_cache": false
  }
}
```

- Um novo campo no manifest poderia indicar que o app **suporta WebMCP**, ajudando diretórios/APIs de busca a descobrirem sites com ferramentas relevantes.

### Registro e uso de ferramentas

- Service workers ganham um objeto **`agent`** no escopo global; ao ativar, o script registra ferramentas com o navegador.
- **Escopo**: ferramentas são escopadas ao service worker + origin que as criou — um app não pode "esquatar" nomes comuns como `search` ou `add-to-cart`.
- Cada conversa deve ter um **conjunto limitado de service workers conectados** relevantes ao tópico, para não dar privilégios demais ao agente e preservar a janela de contexto do LLM.
- Se dois service workers com ferramentas similares estiverem ativos, o agente pode pedir ao usuário para escolher e lembrar a preferência (como escolher navegador padrão no SO).

Fluxo completo (com JIT): usuário → prompt ao agente → agente consulta a camada de descoberta → recomendações → solicitação de instalação → (1ª vez) permissão ao usuário → busca do manifest + script → evento `install` → ativação → `Provide tools` → agente atualiza lista de ferramentas → chamadas → resultados renderizados ao usuário.

### Roteamento (ambiguidade de múltiplos "servidores")

| Arquitetura | Descrição |
|---|---|
| **Aba única com ferramentas on-page** | Mapeamento 1:1. Todas as chamadas vão para a página ativa. |
| **Somente service worker** | Um "servidor" WebMCP; qualquer número de agentes (in-browser, externos) pode conectar; todas as chamadas vão para o worker. |
| **Abas + service worker** | Ambiguidade se um agente estiver conectado aos dois. Decisão fica com o cliente/agente (ex.: pedir ao usuário, ou escolher com memória/contexto — se o usuário já começou a rascunhar um e-mail na aba aberta, o agente pode "ver" e usar a tool da aba). |

Uma única chamada de ferramenta **nunca é roteada para mais de um servidor**, mesmo conectado a vários que tenham a ferramenta com o mesmo nome.

### Gerenciamento de sessão

Tool calls de múltiplas conversas são tratadas no mesmo script do worker. Para fluxos multi-etapas com estado por cliente, adicione um **Session ID** às chamadas, disponível para a função `execute`:

```js
self.agent.provideContext({
  tools: [
    {
      name: "add-to-cart",
      description: "Add an item to the user's shopping cart.",
      inputSchema: { /* ... */ },
      async execute(params, clientInfo) {
        // busca o carrinho desta sessão
        const cart = carts.get(clientInfo.sessionId);
        cart.add(params.itemId);
      }
    }
  ]
})
```

### Segurança (Service Workers)

Acesso a dados privados + exposição a conteúdo não confiável + comunicação externa = a **"Lethal Trifecta"** dos agentes de IA. Mitigações potenciais:

- **Limitar uma sessão/conversa a um único origin/scope**: assim que um agente acessa as ferramentas de um service worker, limita-se o acesso apenas às ferramentas daquele escopo.
- **Desabilitar web search e outras comunicações externas** pelo resto da conversa, mitigando exfiltração de dados.
- Uso de ferramentas multi-origin é importante, mas a segurança ainda não está resolvida — input da comunidade é bem-vindo.

### Descoberta (Apêndice A)

Antes de interagir, o agente precisa descobrir o site. Mecanismos possíveis: PWAs instaláveis, busca web, diretórios curados, links diretos. Um *tool manifest* estático tem a limitação de não refletir estado dinâmico (ex.: comando `undo` só deve existir se um documento estiver aberto com edições). A abordagem mais flexível: sites publicam **descrições de alto nível das capacidades** (em manifest ou markup), e o registro real (contexto-dependente) acontece quando o agente instala e ativa o service worker.

## Parte 2 — Perguntas em aberto da especificação

A proposta continua evoluindo; estas são as discussões ativas registradas no explainer:

- **I/O multimodal**: como ferramentas podem consumir mídia binária como entrada e retorná-la como saída (áudio, streams, media blobs). (Issues #41, #86, #81; Prompt API: multimodal inputs)
- **Resposta cross-document**: como lidar com respostas de ferramentas quando a execução (ex.: submissão de formulário) navega a página para outro documento. (Issue #135)
- **Exposição a agentes embutidos por padrão**: o `exposedTo` hoje só aceita origins; considera-se um keyword tipo `native-agent`. A ideia corrente: no documento top-level, um `exposedTo` ausente exporia as ferramentas ao agente embutido; em iframes, um `exposedTo` ausente **não** as exporia.
- **Inputs/outputs transferíveis ou streamable**: habilitar streaming sem bloqueio em cópias grandes. (Issue #82)
- **Validação de schema de entrada/saída**: validação nativa contra os JSON Schemas declarados antes de invocar o callback JS ou deixar a saída chegar ao modelo. (Issue #92)
- **Skills Integration**: expor uma "skill" de nível superior para o agente coordenar múltiplas ferramentas relacionadas numa jornada. (Issue #161)
- **Output schema**: contratos `outputSchema` estruturados (complementando `inputSchema`) para raciocínio confiável sobre valores de retorno. (Issue #9)
- **Prompting e elicitação do usuário**: forma de a ferramenta pedir confirmação ao usuário quando requer autorização explícita (via agente/harness ou diálogo nativo fora do loop do agente). (Issues #165, #50 — interface `ModelContextClient`)
- **Relato de progresso**: para tarefas longas, rastrear progresso (interseção com o MCP Progress). 
- **Integração com service workers**: o explicador acima.
- **Declarativo**: síntese de JSON Schema, exposição de tools declarativas a interfaces JS, `outputSchema` declarativo, para onde os eventos `toolactivated`/`toolcanceled` devem apontar. (Issues #22, #135, #126, #51, #9)
- **Consent management** cross-party. (Issue #176)

## Parte 3 — Status de implementação nos navegadores

| Navegador | Status |
|---|---|
| **Chrome** | Origin trial no **Chrome 149**; [early preview program](https://developer.chrome.com/docs/ai/join-epp); Chrome Status #5117755740913664. |
| **Edge** | Origin trial no **Edge 150**; mesmo suporte de plataforma do Chrome. |
| **Brave** | Suporte experimental no **Leo AI chat** (Issue 55232). |
| **Firefox** | Discussão de posição de padrões (standards-positions #1412; Bugzilla #2018306). |
| **Safari** | Discussão de posição de padrões (WebKit standards-positions #670). |

Recursos de acompanhamento:

- Explainer: https://github.com/webmachinelearning/webmcp
- Especificação: https://webmachinelearning.github.io/webmcp
- Chrome Status: https://chromestatus.com/feature/5117755740913664
- Origin trial: https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241
- Tipos TypeScript: `webmcp-types` (npm)
- Demos: https://github.com/GoogleChromeLabs/webmcp-tools
- Feedback de bugs do Chromium: `crbug.com/new?component=2021259`

> O WebMCP está em discussão ativa e sujeito a mudanças. Se você testar as APIs, o grupo quer seu feedback via GitHub, Chrome Status e Chromium bugs.
