# Segurança

## Templates são código, não input de usuário

Templates Eta compilam para funções JavaScript. Renderizar uma template equivale
a executar JavaScript. Portanto, **nunca** passe strings não confiáveis ou
controladas pelo usuário como template para `render()`, `renderString()` ou
qualquer método que aceite uma string de template.

```js
// PERIGOSO — equivale a eval() sobre input do usuário
const userInput = req.body.template
eta.renderString(userInput, data)

// SEGURO — dados do usuário passam pelo objeto de dados
eta.renderString("Hello <%= it.name %>!", { name: req.body.name })
```

Esse é o modelo de segurança padrão de engines de template com JS embutido
(EJS, lodash templates, doT) e de engines em outras linguagens (Jinja2, ERB,
Blade). Templates são escritas por **desenvolvedores**, não por usuários finais.

## Sandboxing

Eta **não** faz sandbox da execução de templates, e isso não é objetivo do
projeto. Se precisar renderizar templates não confiáveis, use um engine
logic-less (como Mustache) ou execute em ambiente isolado (VM isolada ou
Web Worker).

## XSS (Cross-Site Scripting)

O principal risco prático ao renderizar HTML:

| Vetor | Defesa |
|-------|--------|
| Interpolar dado do usuário com `<%~` | Use `<%=` (escapa por padrão) |
| Desligar `autoEscape` | Mantenha `autoEscape: true` |
| Passar `output()` com dado cru | Escape manualmente ou use `<%=` |
| `include()` com `<%=` | Bom para texto; partials HTML usam `<%~` com HTML confiável |
| Contexto não-HTML (JS, URL, CSS) | Escape **contextual** separado; `<%=` só cobre HTML |

### Regras práticas

1. `autoEscape: true` (padrão) e nunca desligar globalmente.
2. Use `<%= ... %>` para **todo** dado dinâmico de origem externa.
3. Reserve `<%~ ... %>` para HTML controlado pelo dev (partials, blocks, layout body).
4. Para dados em atributos/URLs/JS, faça escape específico do contexto **além**
   do escape HTML.
5. Sanitize HTML de terceiros (ex.: Markdown → HTML) com biblioteca dedicada
   antes de injetar com `<%~`.

### Exemplo

```eta
<% /* SEGURO: nome escapado */ %>
<p>Olá <%= it.name %></p>

<% /* PERIGOSO se it.bio vier do usuário */ %>
<div><%~ it.bio %></div>
```

## `filterFunction` / `autoFilter`

Filtros globais **não** substituem o escape. Mesmo com `autoFilter: true`, a
saída de `<%=` continua sendo escapada: o filtro roda **antes** do escape
(`content = e(f(content))`). Não use `autoFilter` para remover caracteres de
segurança pensando que o escape virá depois — ele só transforma valores.

> Atenção: `autoFilter` também é aplicado ao `<%~` (raw), mas **sem** escape
> posterior. Não confie no filtro como sanitização de HTML.

## Path traversal

O `resolvePath` do build Node/Deno valida que o caminho resolvido é filho de
`views` (`dirIsChild`), lançando `EtaFileResolutionError` caso contrário. Ainda
assim:

- Não monte nomes de template com input do usuário.
- Prefira passar chaves/ids e mapear para templates conhecidas no servidor.
- Lembre-se de que `@` lê do store em memória (não do disco), mas o conteúdo
  ainda é código privilegiado.

## Conteúdo de templates

- Não construa templates concatenando input de usuário.
- Carregue templates de fontes confiáveis (repo, bundler, banco controlado).
- Se templates vêm de banco/usuário-admin, trate como código privilegiado
  (revisão, versionamento, permissões).

## Checklist

- [ ] `autoEscape` habilitado em produção
- [ ] Nenhum `renderString` com input de usuário
- [ ] `<%~` apenas em conteúdo confiável
- [ ] Escape contextual para URL/JS/CSS
- [ ] Templates versionadas e revisadas
- [ ] Sem segredos hardcoded nas templates (use `it`/`functionHeader`)

Referência cruzada: [`ai-guides/web_security_guide/`](../web_security_guide/)
para CSP, XSS e modelagem de ameaças.
