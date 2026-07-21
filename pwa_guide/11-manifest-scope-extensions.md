# Manifest: `scope_extensions` — Múltiplos Domínios como um Único App

**Status:** Experimental  
**Compat:** https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope_extensions#browser_compatibility

## O Que Resolve

Por padrão, um PWA só controla páginas dentro do seu `scope` (mesma origem).  
`scope_extensions` permite que o PWA se estenda para incluir **outras origens** (subdomínios ou domínios diferentes).

### Casos de Uso

- Subdomínios: `support.exemplo.com`, `shop.exemplo.com`
- Localização: `uk.exemplo.com`, `de.exemplo.com`
- Domínios parceiros: `exemplo.jp`, `parceiro.com`

## Estrutura no Manifest

```json
{
  "id": "https://exemplo.com/app",
  "name": "Meu App",
  "start_url": "/app/index.html",
  "scope": "/app",
  "display": "standalone",
  "scope_extensions": [
    { "type": "origin", "origin": "https://help.exemplo.com" },
    { "type": "origin", "origin": "https://shop.exemplo.com" }
  ]
}
```

### Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `type` | String | Sim | Atualmente sempre `"origin"` |
| `origin` | String | Sim | URL da origem (protocolo + host + porta opcional) |

## Opt-in via `.well-known`

A origem estendida **precisa concordar** com a associação.  
Crie o arquivo `/.well-known/web-app-origin-association` no servidor da origem estendida:

```json
{
  "https://exemplo.com/app": {
    "scope": "/"
  }
}
```

A chave é o `id` do manifest do PWA que está estendendo o escopo.  
O valor dentro do objeto é o path exato que ficará dentro do escopo.

### Exemplo Múltiplo

```json
{
  "https://exemplo.com/app": {
    "scope": "/"
  },
  "https://beta.exemplo.com/app": {
    "scope": "/"
  }
}
```

> **Nota:** Não é possível ter entradas duplicadas para o mesmo web app id.

## Efeito em Produção

- Links dentro do escopo estendido abrem **dentro da janela do app** (não em aba externa)
- Links fora do escopo abrem externamente (comportamento normal)

## Exemplo Completo

### Manifest do app principal (`https://exemplo.com/app`)

```json
{
  "id": "https://exemplo.com/app",
  "name": "My App",
  "icons": [{ "src": "icon/hd_hi", "sizes": "128x128" }],
  "start_url": "/app/index.html",
  "scope": "/app",
  "display": "standalone",
  "scope_extensions": [
    { "type": "origin", "origin": "https://exemplo.co.uk" },
    { "type": "origin", "origin": "https://help.exemplo.com" }
  ]
}
```

### `.well-known/web-app-origin-association` em `https://exemplo.co.uk`

```json
{
  "https://exemplo.com/app": {
    "scope": "/"
  }
}
```

### `.well-known/web-app-origin-association` em `https://help.exemplo.com`

```json
{
  "https://exemplo.com/app": {
    "scope": "/"
  }
}
```

## Relação com `scope`

- `scope` continua definindo o escopo **da própria origem**
- `scope_extensions` adiciona **outras origens** ao escopo total
- Se um link leva a `https://help.exemplo.com/some-page` e está no `scope_extensions`, abre dentro do app
- Se leva a `https://outro-site.com`, abre externamente
