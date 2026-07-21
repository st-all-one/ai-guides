# Convenções para `{{EmbedLiveSample}}`

## Visão Geral

`{{EmbedLiveSample}}` é a macro principal para incorporar exemplos interativos na documentação. A macro busca um bloco de código pelo `id` do cabeçalho da seção e renderiza executável.

## Sintaxe

```
{{EmbedLiveSample("id_da_secao", largura, altura, "caption")}}
```

### Parâmetros

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `"id_da_secao"` | Sim | ID do cabeçalho da seção (slugified) |
| `largura` | Não | Largura em px (padrão: 100%) |
| `altura` | Não | Altura em px (padrão: 150) |
| `"caption"` | Não | Texto alternativo para acessibilidade |

## Mecanismo de ID

O ID usado por `{{EmbedLiveSample}}` corresponde ao **slug do cabeçalho** da seção — a versão slugified do texto.

### Como o ID é gerado

1. O texto do cabeçalho é convertido para lowercase
2. Espaços são substituídos por `_` (underscore)
3. Pontuação e caracteres especiais são removidos
4. Palavras são separadas por `_`

### Exemplos

| Texto do Cabeçalho | ID Gerado |
|--------------------|-----------|
| `## Examples` | `examples` |
| `## Simple request` | `simple_request` |
| `## Playback rate` | `playback_rate` |
| `## Audio filter` | `audio_filter` |
| `## Creating a POST request` | `creating_a_post_request` |

## Padrões de Uso

### Padrão 1: Código após cabeçalho (mais comum)

```markdown
## Examples

### Simple request

```js
fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data));
```

{{EmbedLiveSample("Simple_request")}}
```

**ID**: `Simple_request` (slug do cabeçalho `### Simple request`)

### Padrão 2: Código no início da seção

```markdown
## Examples

```js
fetch('https://api.example.com/data')
  .then(response => response.json())
```

{{EmbedLiveSample("Examples")}}
```

**ID**: `Examples` (slug do cabeçalho `## Examples`)

### Padrão 3: Múltiplos exemplos na mesma seção

```markdown
## Examples

### GET request

```js
fetch('/data')
```

{{EmbedLiveSample("GET_request")}}

### POST request

```js
fetch('/submit', { method: 'POST' })
```

{{EmbedLiveSample("POST_request")}}
```

## Convenções Observadas no Repositório

### Media guides (longas, arquivos completos)

Em `media/guides/audio_and_video_manipulation/index.md`:

```
'playback-rate'
'audio-filter'
'geometry'
```

IDs em snake_case, correspondendo a seções `### Playback rate`, `### Audio filter`.

### API overviews (exemplos curtos)

Em `api/fetch_api/` e similares:

```
'Simple_request'
'POST_request'
```

IDs em Title_Case (primeira letra de cada palavra maiúscula), correspondendo a seções `### Simple request`.

## Boas Práticas

1. **Nomear a seção antes do código**: Sempre colocar o código após um cabeçalho `###`, cujo slug vira o ID
2. **Usar IDs autoexplicativos**: `Simple_request` é melhor que apenas `Example`
3. **Manter IDs curtos**: Preferir `Playback_rate` a `Playback_rate_example_with_audio_element`
4. **Consistência de capitalização**: O ID no `EmbedLiveSample` deve corresponder exatamente ao slug do cabeçalho (case-sensitive)
5. **Altura adequada**: Exemplos simples: 150-250px; exemplos com UI: 300-500px; exemplos complexos: 500-800px

## Anti-patterns

### ❌ ID que não corresponde ao cabeçalho

```markdown
### Exemplo simples

```js
console.log('hello');
```

{{EmbedLiveSample("exemplo-simples")}}
```

**Problema**: O slug real é `Exemplo_simples` (underscore), não `exemplo-simples` (hífen). O exemplo não será encontrado.

### ✅ ID correto

```
{{EmbedLiveSample("Exemplo_simples")}}
```

### ❌ Seção sem cabeçalho antes do código

```markdown
```js
console.log('hello');
```

{{EmbedLiveSample("exemplo")}}
```

**Problema**: Não há cabeçalho com ID `exemplo` na página. O exemplo não renderiza.

### ✅ Correção

```markdown
### Exemplo

```js
console.log('hello');
```

{{EmbedLiveSample("Exemplo")}}
```

### ❌ Múltiplos cabeçalhos com mesmo texto

```markdown
### Exemplo

### Exemplo
```

**Problema**: IDs duplicados. `{{EmbedLiveSample("Exemplo")}}` captura apenas o primeiro.

### ✅ Correção

```markdown
### Exemplo 1

### Exemplo 2
```

## Resumo: Sequência Correta

```
### Nome do exemplo em sentence case

(código HTML/CSS/JS)

{{EmbedLiveSample("Nome_do_exemplo_em_sentence_case", largura, altura)}}
```

Onde:
- `### Nome do exemplo` → gera ID `Nome_do_exemplo`
- `{{EmbedLiveSample("Nome_do_exemplo")}}` → encontra o cabeçalho pelo ID
- O código entre o cabeçalho e a macro é capturado como o conteúdo do exemplo
