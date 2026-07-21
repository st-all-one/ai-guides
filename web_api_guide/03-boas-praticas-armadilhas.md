# Boas Práticas e Armadilhas na Documentação de Web APIs

## 1. BOAS PRÁTICAS

### 1.1 Separação Clara entre Overview e Guia

**Certo**: Overview explica conceitos e lista interfaces; guia ensina passo-a-passo.

```markdown
# Overview (web-api-overview)
## Concepts and usage
A Fetch API fornece uma interface para buscar recursos...

## Interfaces
- {{DOMxRef("Request")}} — representa uma requisição
```

```markdown
# Guide (page-type: guide)
## Making a GET request
Para fazer uma requisição GET, chame fetch():
\`\`\`js
const response = await fetch('https://api.example.com/data');
\`\`\`
```

**Errado**: Overview com tutorial de 200 linhas embutido. Veja WebGPU API (638 linhas) como contra-exemplo — contém tutoriais completos de render pipeline que deveriam ser guias separados.

### 1.2 Exemplos Funcionais com EmbedLiveSample

Sempre que possível, usar `{{EmbedLiveSample}}` para que o leitor possa ver o resultado:

```markdown
\`\`\`html
<button id="fetch">Fetch data</button>
<pre id="result"></pre>
\`\`\`

\`\`\`js
document.querySelector('#fetch').addEventListener('click', async () => {
  const response = await fetch('/data.json');
  const data = await response.json();
  document.querySelector('#result').textContent = JSON.stringify(data);
});
\`\`\`

{{EmbedLiveSample('...')}}
```

### 1.3 Explicar o "Porquê" Antes do "Como"

Antes de mostrar código, explicar o problema que a API resolve:

```markdown
## Concepts and usage

O problema: aplicações web precisam fazer requisições HTTP,
mas XMLHttpRequest usa callbacks e não suporta streams...

A solução: Fetch API usa Promises e integra com Service Workers...
```

### 1.4 Documentar Alternativas

Na seção "See also", incluir APIs concorrentes ou complementares:

```markdown
## See also

- [WebSocket API](/en-US/docs/Web/API/WebSockets_API) — alternativa full-duplex
- [Server-Sent Events](/en-US/docs/Web/API/Server-Sent_Events) — streaming one-way
- [WebTransport API](/en-US/docs/Web/API/WebTransport_API) — alternativa moderna
```

### 1.5 Usar Badges de Contexto Corretamente

```markdown
# Exemplo completo e correto
{{DefaultAPISidebar("WebCodecs API")}}{{AvailableInWorkers("window_and_dedicated")}}{{securecontext_header}}{{SeeCompatTable}}
```

Ordem: sidebar → badges de contexto → badges de status.

### 1.6 Documentar Segurança Proativamente

Para APIs que exigem HTTPS, permissoes ou CSP:

```markdown
## Security requirements

- [Secure context](/en-US/docs/Web/Security/Secure_Contexts): a API está disponível apenas em {{Glossary("HTTPS")}}.
- {{httpheader("Permissions-Policy")}}: a diretiva `compute-pressure` controla o acesso.
```

### 1.7 Código com Tratamento de Erros

Todo exemplo deve incluir tratamento de erro:

```markdown
\`\`\`js
async function getData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}
\`\`\`
```

### 1.8 Manter Dados de Compatibilidade Precisos

Usar `browser-compat` em vez de tabelas manuais. Tabelas HTML manuais desatualizam rápido e dão falsa impressão de precisão.

## 2. ARMADILHAS A EVITAR

### 2.1 Overview Monolítica (Anti-Pattern #1)

**Problema**: Uma única página tenta ser overview + tutorial + referência.

**Exemplo real**: `webgpu_api/index.md` (638 linhas) contém:
- Conceitos de GPU (ok para overview)
- Pipeline de renderização completo com shaders (deveria ser guia separado)
- Pipeline de compute completo com buffers (deveria ser guia separado)
- Lista de todas as interfaces (ok)

**Solução**: Extrair tutoriais para subpastas `using_webgpu/`, `basic_render_pipeline/`, etc.

### 2.2 Conteúdo Duplicado (Anti-Pattern #2)

**Problema**: Mesmo tema aparece em múltiplos lugares.

**Exemplo real**: Conteúdo de streaming fragmentado em:
- `media/guides/streaming/` (28 linhas, raso)
- `media/guides/delivery/live_streaming/` (streaming ao vivo)
- `media/guides/delivery/setting_up_adaptive_streaming/` (DASH/HLS)

**Solução**: Centralizar ou criar cross-links claros com `{{See also}}`.

### 2.3 Páginas Incompletas (Anti-Pattern #3)

**Problema**: Esqueleto sem conteúdo real.

**Exemplo real**: `media/guides/formats/support_issues/index.md` (52 linhas) — seções definidas mas sem conteúdo.

**Solução**: Não publicar páginas incompletas. Usar `rgh` ou branches para WIP.

### 2.4 Tabelas de Compatibilidade Faltando Dados (Anti-Pattern #4)

**Problema**: Tabelas HTML com células vazias.

**Exemplo real**: `media/guides/formats/containers/index.md` — células para Chrome, Edge e Safari vazias (apenas Firefox preenchido).

**Solução**: Usar `{{Compat}}` que puxa dados do browser-compat-data, ou preencher completamente as tabelas manuais.

### 2.5 Conteúdo Legado Desproporcional (Anti-Pattern #5)

**Problema**: Páginas inteiras dedicadas a tecnologias obsoletas.

**Exemplo real**: `media/guides/formats/configuring_servers_for_ogg_media/index.md` (100 linhas) — Ogg é formato legado.

**Solução**: Condensar para um parágrafo ou mover para seção histórica.

### 2.6 Strings Base64 Embutidas no CSS (Anti-Pattern #6)

**Problema**: Ícones base64 (~50KB+) poluem a documentação.

**Exemplo real**: `media/guides/audio_and_video_delivery/adding_captions_and_subtitles_to_html5_video/index.md` — CSS com base64 embutido.

**Solução**: Usar SVG inline ou links para assets externos.

### 2.7 Lista Excessiva de spec-urls (Anti-Pattern #7)

**Problema**: Front matter com dezenas de URLs de especificação.

**Exemplo real**: `performance_api/index.md` lista 14 spec-urls diferentes.

**Solução**: Agrupar specs relacionadas sob um URL umbrella quando possível.

### 2.8 Usar browser-compat como Lista sem Necessidade (Anti-Pattern #8)

**Problema**: Lista de compat keys quando uma única bastaria.

**Exemplo real**: `credential_management_api/` e `notifications_api/` listam múltiplas keys.

**Solução**: Usar chave consolidada quando a API tem um ponto de entrada único.

## 3. CHECKLIST DE QUALIDADE

### Para cada página de API:

- [ ] Front matter completo (title, slug, page-type)
- [ ] browser-compat definido (ou justificado sua ausência)
- [ ] spec-urls definido (opcional, mas recomendado)
- [ ] Sidebar correta ({{DefaultAPISidebar}} ou {{APIRef}})
- [ ] Badges de contexto precisos (secure_context, workers, etc.)
- [ ] Badges de status corretos (experimental, deprecated, non-standard)
- [ ] Seção "Concepts and usage" explica o problema e a solução
- [ ] Seção "Interfaces" lista e categoriza
- [ ] Exemplos funcionais com tratamento de erro
- [ ] {{Specifications}} e {{Compat}} no final
- [ ] Seção "See also" com links para APIs relacionadas
- [ ] Slug consistente com estrutura de pastas

### Para cada guia:

- [ ] page-type: guide
- [ ] Slug segue Web/API/Nome_Da_API/Nome_Guia
- [ ] Auto-contido (não depende de outros guias)
- [ ] Código funcional com {{EmbedLiveSample}} quando possível
- [ ] Explica "porquê" antes de mostrar código

### Para evitar:

- [ ] Overview com tutorial completo embutido
- [ ] Conteúdo duplicado em múltiplos locais
- [ ] Páginas com esqueleto vazio
- [ ] Dados de compatibilidade incompletos em tabelas manuais
- [ ] Conteúdo legado com espaço desproporcional
