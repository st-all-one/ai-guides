# 4. ES Modules (ESM)

## Conceito

Cada arquivo é um módulo com seu próprio escopo. Tudo é privado por padrão — só o que é `export` fica acessível.

```html
<script type="module" src="main.js"></script>
```

### Características dos Módulos:
- ✅ Strict mode automático
- ✅ Defer automático (executa após parsing do HTML)
- ✅ Escopo fechado (nada vaza para global)
- ✅ Executado **uma única vez** (cached)
- ❌ Requer servidor HTTP (CORS bloqueia `file://`)
- ❌ `import`/`export` só em módulos

## Named Exports

```js
// lib.js
export const PI = 3.14;
export function area(r) { return PI * r * r; }
export class Circulo { }

// OU agrupado
export { PI, area, Circulo };
```

```js
// main.js
import { PI, area, Circulo } from "./lib.js";
import { area as areaCirculo } from "./lib.js"; // renomeando
```

## Default Export

```js
// utils.js
export default function formatDate(date) { ... }

// Ou: export { formatDate as default };

// main.js
import formatDate from "./utils.js";        // sem {}
import { default as format } from "./utils.js"; // equivalente
```

- Apenas **um** `default export` por módulo
- Importado sem `{}`

## Module Object (Namespace)

```js
import * as Lib from "./lib.js";
console.log(Lib.PI);
Lib.area(5);
```

## Re-exportação (Aggregation)

```js
// shapes/index.js — barrel file
export { Square } from "./shapes/square.js";
export { Circle } from "./shapes/circle.js";
export { Triangle } from "./shapes/triangle.js";

// main.js — import único
import { Square, Circle } from "./shapes/index.js";
```

## Dynamic Import

```js
// Carregamento sob demanda
button.addEventListener("click", async () => {
  const { exportSVG } = await import("./export.js");
  exportSVG();
});
```

- Retorna `Promise<Module>`
- Pode ser usado em scripts normais (não só módulos)
- Base para code-splitting

## Top-Level Await

```js
// config.js
const response = await fetch("/config.json");
export default await response.json();

// main.js
import config from "./config.js";
// Aguarda config.js resolver antes de continuar
```

- Não bloqueia módulos irmãos de carregar
- Só funciona em módulos

## Import Maps

```html
<script type="importmap">
{
  "imports": {
    "lodash": "/node_modules/lodash-es/lodash.js",
    "lodash/": "/node_modules/lodash-es/"
  }
}
</script>
<script type="module">
  import _ from "lodash";
  import fp from "lodash/fp.js";
</script>
```

Use `scopes` para versionamento:

```json
{
  "imports": {
    "cool-module": "/node_modules/cool-module/index.js"
  },
  "scopes": {
    "/node_modules/dependency/": {
      "cool-module": "/node_modules/other-version/index.js"
    }
  }
}
```

## Import Attributes

```js
import data from "./data.json" with { type: "json" };
import styles from "./styles.css" with { type: "css" };
```

## Boas Práticas

1. **Sempre use paths relativos** (`./` ou `../`) para módulos locais
2. **Coloque imports no topo do arquivo** (são hoisted, mas legibilidade importa)
3. **Prefira named exports** sobre default — melhor para tree-shaking e autocomplete
4. **Evite cyclic imports** — refatore módulo compartilhado em terceiro
5. **Use barrel files** (`index.js`) para organizar diretórios de módulos
6. **Prefira `.js`** para portabilidade (`.mjs` pode ter problemas de MIME type em servidores)

## ESM vs CommonJS

| Aspecto | ESM | CommonJS |
|---------|-----|----------|
| Sintaxe | `import`/`export` | `require()`/`module.exports` |
| Carregamento | Assíncrono | Síncrono |
| Escopo | Módulo | Módulo |
| Strict mode | ✅ Sempre | ❌ Opcional |
| Top-level await | ✅ | ❌ |
| Árvore estática | ✅ (tree-shaking) | ❌ |
| Runtime | Browser + Node | Node apenas |
