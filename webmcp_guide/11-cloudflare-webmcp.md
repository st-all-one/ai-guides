# 11 — Cloudflare WebMCP e ecossistema

Este guia detalha a **implementação da Cloudflare** do WebMCP — um developer preview que oferece ferramentas WebMCP para qualquer site na Cloudflare **com um simples interruptor e sem código**, — e como isso se encaixa no ecossistema.

> Fonte: [blog.cloudflare.com/webmcp](https://blog.cloudflare.com/webmcp/) — developer preview.

## Visão geral

A Cloudflare lançou um **developer preview de WebMCP**: ao ativá-lo, **agentes de navegador podem começar a trabalhar com o seu site** — sem código e sem mudanças na sua origin. A Cloudflare adiciona uma **ponte pequena (bridge)** às suas páginas, que registra um conjunto de ferramentas para o agente do visitante usar.

Contexto do problema (reforçando a motivação do [guia 02](02-motivacao-atuacao-vs-tools.md)):

- A web foi construída na suposição de que há uma **pessoa na outra ponta**.
- Agora, cada vez mais visitas vêm de **agentes de IA**, numa internet feita para humanos.
- A abordagem usual — crawlers que copiam conteúdo para um servidor — dá pouco tráfego e crédito ao site original.
- **WebMCP** permite que sites exponham ferramentas para agentes rodando no navegador; agentes não precisam mais adivinhar o caminho por uma página feita para humanos e usam tokens em **tarefas, não em navegação**.

*"O problema: o site tem que implementar."* — é exatamente isso que o preview da Cloudflare resolve.

## Como funciona: duas partes, ambas na frente da sua origin

A implementação tem duas partes que ficam **na frente da sua origin**. Nenhuma toca no código do seu site, e ambas funcionam igualmente para sites estáticos ou SPAs.

### Parte 1 — Injeção na borda (edge)

Quando o site tem WebMCP ativado no Dashboard da Cloudflare, a Cloudflare usa **HTMLRewriter** para adicionar **uma linha** a cada resposta HTML: uma referência a um script de ponte (bridge) que ela também serve. Tanto a tag quanto o script vêm da borda, **same-origin**, então nada mais na página muda:

```html
<!-- Cloudflare injeta isso na borda. Same origin, e seu HTML permanece intocado. -->
<script type="module"
        src="/.webmcp/bridge.js"
        data-packs="c2pa,mcp-server-client"
        data-mcp-url="/mcp"></script>
```

- **`data-packs`** — a lista de packs a ativar.
- **`data-mcp-url`** — se você já tem um servidor MCP (Model Context Protocol), aponta para o seu próprio servidor MCP (padrão: mesmo origin `/mcp`).

### Parte 2 — A ponte (bridge)

O script roda na página e **encontra a superfície WebMCP**:

1. Se o navegador **não tem** WebMCP (`document.modelContext` ausente), a bridge **retorna e não faz nada** — a página se comporta exatamente como antes.
2. Caso contrário, a bridge **compõe os packs** nomeados em `data-packs` numa lista única de ferramentas e registra cada uma com **`.registerTool()`**.

**Pack** = um conjunto de descritores de ferramentas MCP + seus handlers.

- **Packs estáticos** (ex.: Content Credentials) declaram suas ferramentas de antemão.
- **Packs dinâmicos** (ex.: Site MCP Server) **descobrem suas ferramentas no boot** antes de registrar qualquer coisa.

### Execução 100% no navegador do visitante

Neste preview, **todas as ferramentas rodam inteiramente no navegador do visitante** — sem round-trip para um servidor da Cloudflare:

- O pack **Content Credentials** busca uma imagem e parseia localmente os **primeiros kilobytes de metadados de proveniência** (provenance) do conteúdo.
- O pack **Site MCP Server** fala **direto com o endpoint MCP do seu servidor**, a partir da página, **na origin do visitante e com a sessão existente dele**.

O código da bridge é servido por um worker na borda, deixando espaço para crescer: packs futuros poderão chamar esse worker para tarefas que a página não consegue fazer sozinha (ex.: resumir um sitemap com **Workers AI** ou consultar um índice de **AI Search**).

## Para o agente, tudo é MCP comum

Uma decisão de design importante: **todos esses são "MCP tools" ordinários para o agente**. A Cloudflare usa os tipos `Tool` e `CallToolResult` do próprio Model Context Protocol, então um agente que já fala com servidores MCP consegue dirigir uma página **sem nada especial** — *"o navegador é apenas mais um lugar onde o MCP roda."*

O exemplo abaixo mostra como a bridge transforma uma das suas próprias ferramentas MCP numa ferramenta que o agente do visitante pode chamar:

```js
// Para cada ferramenta que o servidor MCP do site anuncia (via tools/list),
// registra um proxy cujo execute() chama o site de volta na origin do
// visitante, com a sessão dele.
document.modelContext.registerTool({
  name: tool.name,                 // ex.: "search_products"
  description: tool.description,
  inputSchema: tool.inputSchema,   // direto do tools/list
  execute: async (args) => {
    const res = await fetch(mcpUrl, {   // same-origin /mcp
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: tool.name, arguments: args },
      }),
    });
    const { result } = await res.json();
    return result;   // um MCP CallToolResult, passado direto
  },
});
```

## Packs incluídos no preview

### 1. Content Credentials (C2PA)

A Cloudflare também desenvolve packs para ler **diferentes tipos de metadados**. Por exemplo, credenciais de participantes do programa **C2PA** podem ser recuperadas com o pack Content Credentials.

**`scan_images_c2pa`** varre todas as imagens e retorna um resumo curto de cada uma:

```json
{
  "imageCount": 12,
  "scanned": 12,
  "withC2pa": 8,
  "results": [
    {
      "src": "https://example.com/hero.jpg",
      "hasC2pa": true,
      "format": "image/jpeg",
      "manifestCount": 1,
      "claimGenerator": "Adobe Firefly",
      "title": "sunrise over the bay",
      "signedBy": "Adobe Inc."
    },
    { "src": "https://example.com/logo.png", "hasC2pa": false, "format": "image/png" }
  ]
}
```

**`inspect_image_c2pa`** decodifica o **manifesto completo** de uma imagem: histórico de edição, autor declarado e certificado de assinatura. É um leitor TypeScript simples que toca apenas **alguns kilobytes de metadados no início da imagem**, não a imagem em si.

> **Importante**: por enquanto ele **lê e reporta a credencial, mas não verifica criptograficamente**. Cada resultado carrega `signatureVerified: false`, para que um agente não confunda uma reivindicação decodificada com uma verificada.

### 2. Site MCP Server

Fala com o seu endpoint MCP (padrão `/.webmcp` ou `/mcp`) na origin do visitante, como no exemplo acima.

## Como ativar e verificar

1. Vá em **Agent Readiness → WebMCP** no Dashboard da Cloudflare.
2. Ative o WebMCP para um domínio e escolha os packs:
   - **Content Credentials** e **Site MCP Server** vêm ativados por padrão.
   - Mais packs aparecerão conforme forem publicados.
3. Não há nada para deployar e nada para mudar na origin — o próximo HTML que seu site enviar incluirá a bridge.

Para confirmar que está ativo, peça qualquer página HTML e procure a linha injetada:

```bash
curl -s https://your-site.example | grep webmcp
```

### Testando sem ter seu próprio agente

Aponte o **BrowserRun** (o navegador remoto da Cloudflare) para a sua URL: ele descobrirá e chamará as ferramentas que seus packs registraram, exatamente como o agente de um visitante faria.

*"Esse é o loop completo: o BrowserRun dá aos agentes um navegador para agir; este preview dá ao seu site as ferramentas para ser agido; e eles se encontram usando o padrão aberto. As ferramentas se comportam da mesma forma, quer o navegador esteja no laptop de alguém ou rodando headless na nuvem."*

## Por que a Cloudflare construiu isso

- Ajudar domínios a interagir com **novos visitantes — agentes de IA — sem rebuild completo**.
- É um passo em direção a uma web que pode prosperar quando os visitantes nem sempre são humanos.
- Apoia o ecossistema **em ambas as pontas**: o BrowserRun (navegador remoto) já tem suporte WebMCP; o Cloudflare Radar oferecerá ferramentas WebMCP próprias.

## Ecossistema em resumo

| Ator | Papel |
|---|---|
| **Google/Chromium** | Origin trial do padrão; flag local; docs e demos (GoogleChromeLabs/webmcp-tools). |
| **Microsoft Edge** | Origin trial (Edge 150); editores no grupo W3C. |
| **Cloudflare** | Preview: bridge edge + packs (C2PA, MCP Server Client); BrowserRun; Radar em breve. |
| **Angular / React** | Suporte experimental via `angular.dev/ai/webmcp` e pacote `usewebmcp`. |
| **GoogleChromeLabs** | Demos: zaMaker (imperativa), react-flightsearch (imperativa), french-bistro (declarativa), page-agent. |
| **Inspector Extension** | Extensão "Model Context Tool Inspector" para testar agentes nas suas páginas. |

Este é um **developer preview** — a Cloudflare pede feedback: ative, teste contra o seu site e conte como foi no Discord de desenvolvedores da Cloudflare ou no fórum da comunidade.

---

Próximo: **[12 — Service workers e direções futuras](12-service-workers-e-futuro.md)**.
