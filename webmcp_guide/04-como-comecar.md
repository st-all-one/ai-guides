# 04 — Como começar

Guia prático para ativar e habilitar o WebMCP no Chrome, com os requisitos de segurança e permissões que você precisa conhecer antes de registrar ferramentas.

## Habilite o WebMCP

### Origin trial (produção/testes controlados)

O WebMCP está em **origin trial desde o Chrome 149**:

1. Acesse [Origin Trial 4163014905550602241](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241).
2. Registre o token para o(s) seu(s) domínio(s).
3. Sirva o token em cada página que usará WebMCP:

```html
<meta http-equiv="origin-trial" content="TOKEN_AQUI">
```

Leia também: [como começar com origin trials](https://developer.chrome.com/docs/web-platform/origin-trials).

> **Edge**: a Microsoft também tem um [Origin Trial do WebMCP no Edge 150](https://developer.microsoft.com/en-us/microsoft-edge/origin-trials/trials/0b76fe60-b266-458e-a285-04e375c0c31a), referenciando o mesmo suporte de plataforma do Chrome.

### Flag local (desenvolvimento)

Para desenvolvimento local:

1. Abra `chrome://flags/#enable-webmcp-testing`.
2. Defina a flag como **Enabled**.
3. Relance o Chrome.

## As duas APIs de ferramentas

Há duas formas de configurar ferramentas no site:

- **[API Imperativa](05-api-imperativa.md)** — defina ferramentas com JavaScript padrão (entrada de formulário, navegação, gerenciamento de estado ou outras funções).
- **[API Declarativa](06-api-declarativa.md)** — adicione anotações a formulários HTML padrão para criar uma ferramenta WebMCP.

> **Framework support (experimental)**: Angular tem suporte experimental a WebMCP ([angular.dev/ai/webmcp](https://angular.dev/ai/webmcp)); React tem o pacote `usewebmcp` com hooks vinculados ao ciclo de vida de montagem/desmontagem de componentes.

## Requisitos e restrições de ambiente

### Origin isolation (obrigatório)

O WebMCP só está disponível em **documentos com origin isolation**. Isso garante que a origin do documento permaneça estável durante a vida útil da ferramenta.

- Se um documento tiver `document.domain` habilitado (por exemplo, pelo header HTTP `Origin-Agent-Cluster: ?0`), as APIs WebMCP são **desabilitadas**.
- Na prática, o algoritmo da especificação rejeita com `SecurityError` quando o agent cluster **não é origin-keyed** e o esquema da origin não é `file`.

### Permissions Policy (`tools`)

Ambas as APIs são controladas pela feature de Permissions Policy chamada **`tools`**.

- O **default allowlist é `self`**: permite o registro de ferramentas em contextos de nível superior e same-origin, e **desabilita em iframes cross-origin**.
- Para permitir WebMCP num iframe cross-origin, adicione o atributo `allow="tools"` ao iframe:

```html
<iframe src="https://chat-bot-provider.example/" allow="tools"></iframe>
```

- Chamadas a `registerTool()` retornam promise rejeitada com `NotAllowedError` quando a permissão está desabilitada (via atributo `allow` ou header `Permissions-Policy: tools=()`).

### Ambientes seguros

As APIs WebMCP são `[SecureContext]`: exigem contexto seguro (HTTPS ou localhost), além das demais portas de segurança.

## Limitações a conhecer

- **Cenários headless**: embora seja possível rodar ferramentas WebMCP em ambientes headless, a API é primariamente desenhada para **fluxos de navegador local com um humano no loop** (não é para agentes totalmente autônomos sem UI).
- **Overhead para interfaces complexas**: se o site for altamente complexo, provavelmente será necessário refatorar ou adicionar JavaScript para gerenciar o estado da aplicação e da interface.
- **Descoberta de ferramentas**: clientes e navegadores precisam **visitar o site diretamente** para saber se ele tem ferramentas chamáveis (o registro é por documento aberto; descoberta de sites não abertos depende de Service Workers — ver [guia 12](12-service-workers-e-futuro.md)).

## Depuração e inspeção

Use a **Model Context Tool Inspector Extension** ([Chrome Web Store](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd)) para:

- Ver quais ferramentas estão registradas na página, monitorando a API WebMCP.
- Chamar ferramentas manualmente e executar funções.
- Verificar se seu JSON Schema está correto e se o navegador consegue interpretar os dados como a ferramenta espera.
- Visualizar saídas estruturadas ou mensagens de erro retornadas pelas suas ferramentas.

Converse com o agente em linguagem natural para ver se ele identifica e invoca corretamente as ferramentas WebMCP. Os prompts são enviados por padrão ao modelo `gemini-3-flash-preview`.

> **Nota**: a extensão é separada dos recursos "Gemini in Chrome" (Gemini 3 Auto-Browse).

## Como verificar se está funcionando

Exemplo simples — abra o console e verifique se a API existe:

```js
if (document.modelContext) {
  console.log('WebMCP disponível neste documento');
} else {
  console.log('WebMCP indisponível (flag, origin trial, origin isolation ou permissions policy)');
}
```

## Suporte nos navegadores (resumo)

| Navegador | Status |
|---|---|
| **Chrome** | Origin trial no Chrome 149; flag `enable-webmcp-testing` para desenvolvimento |
| **Edge** | Origin trial no Edge 150 (mesmo suporte de plataforma do Chrome) |
| **Brave** | Suporte experimental adicionado ao Leo AI chat |
| **Firefox** | Posição de padrões em discussão (Bugzilla #2018306) |
| **Safari** | Posição de padrões em discussão (WebKit standards-positions #670) |

---

Próximo: **[05 — API Imperativa](05-api-imperativa.md)**.
