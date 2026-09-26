# WebMCP — PHP (backend + formulário declarativo)

O WebMCP roda no navegador (JS); o PHP participa como **renderizador de páginas** e **backend das ferramentas**. Este exemplo mostra as duas formas de expor ferramentas:

1. **Declarativa**: o PHP renderiza um `<form>` anotado (`toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`). O navegador sintetiza o JSON Schema sozinho.
2. **Imperativa**: um pequeno script JS registra `search_products`, cujo `execute()` chama o endpoint PHP `api/products.php` (mesmo origin, com a sessão do visitante).

Quando o formulário declarativo submete (`toolautosubmit`) e a página navega para `search.php`, o navegador usa o **primeiro `<script type="application/ld+json">`** como resposta estruturada ao agente.

## Como rodar

```bash
php -S localhost:8000
```

Acesse `http://localhost:8000` no Chrome 149+ (flag `enable-webmcp-testing`). Teste com a [Model Context Tool Inspector Extension](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) ou com um agente compatível.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.php` | Página com formulário declarativo + registro imperativo de `search_products` |
| `api/products.php` | Endpoint JSON chamado pelo `execute` da ferramenta imperativa |
| `search.php` | Destino do formulário declarativo; responde com JSON-LD (estrutura para o agente) |
