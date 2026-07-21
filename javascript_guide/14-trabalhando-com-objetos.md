# 14. Trabalhando com Objetos

## Object Literal — Sintaxe Moderna

```js
const nome = "Ana";
const obj = {
  nome,                          // shorthand property
  saudacao() { },               // shorthand method
  ["chave_" + id]: valor,       // computed property
  __proto__: pai,               // prototype assignment (no literal)
};
```

## Property Accessors

```js
obj.prop;     // dot notation — nome literal, estático
obj["prop"];  // bracket notation — expressão dinâmica
```

| Notação | Quando usar |
|---------|-------------|
| `.` | Nome de propriedade conhecido, válido como identificador |
| `[]` | Nome dinâmico, contém hífen/espaço, ou número |

```js
const key = "nome";
obj.key;        // ❌ acessa propriedade "key"
obj[key];       // ✅ acessa obj.nome
obj["my-prop"]; // ✅ necessário para nomes não válidos
```

## Property Descriptors

Toda propriedade de objeto tem um **descriptor** com atributos:

| Atributo | Padrão | Significado |
|----------|--------|-------------|
| `value` | `undefined` | Valor da propriedade |
| `writable` | `false` | Pode ser reatribuída? |
| `enumerable` | `false` | Aparece em `for...in`, `Object.keys()`? |
| `configurable` | `false` | Pode ser deletada ou ter descriptor alterado? |
| `get` | `undefined` | Getter function |
| `set` | `undefined` | Setter function |

```js
const obj = {};

// Object.defineProperty (cria ou modifica)
Object.defineProperty(obj, "constante", {
  value: 42,
  writable: false,
  enumerable: true,
  configurable: false,
});
obj.constante = 99;  // ❌ silenciosamente ignora (strict: TypeError)

// Múltiplas de uma vez
Object.defineProperties(obj, {
  a: { value: 1, writable: true },
  b: { value: 2, writable: true },
});
```

### getters/setters via defineProperty

```js
Object.defineProperty(obj, "nomeCompleto", {
  get() { return `${this.nome} ${this.sobrenome}`; },
  set(valor) {
    [this.nome, this.sobrenome] = valor.split(" ");
  },
  enumerable: true,
  configurable: true,
});
```

## Principais Métodos de Object

### Criação e Clonagem

```js
Object.create(proto, descriptors);   // cria com protótipo específico
Object.assign(target, ...sources);   // copia propriedades enumeráveis próprias

// Clonagem
const clone = Object.assign({}, obj);       // superficial
const clone = JSON.parse(JSON.stringify(obj)); // profunda (perde funções, undefined, Symbol)
const clone = structuredClone(obj);          // ✅ profunda (ES2023+)
```

### Congelamento e Prevenção

```js
Object.preventExtensions(obj);  // não permite NOVAS propriedades
Object.seal(obj);               // preventExtensions + configurable:false
Object.freeze(obj);             // seal + writable:false (imutável)

// Testes
Object.isExtensible(obj);
Object.isSealed(obj);
Object.isFrozen(obj);
```

### Enumeração e Propriedades

```js
Object.keys(obj);                     // próprias enumeráveis (strings)
Object.values(obj);                   // valores das próprias enumeráveis
Object.entries(obj);                  // pares [key, value]
Object.getOwnPropertyNames(obj);       // todas as próprias (strings)
Object.getOwnPropertySymbols(obj);    // todas as próprias (Symbol)
Object.getOwnPropertyDescriptors(obj);// todas com descriptors
Object.hasOwn(obj, prop);             // ✅ própria (substituto de hasOwnProperty)
```

### Outros

```js
Object.getPrototypeOf(obj);
Object.setPrototypeOf(obj, proto);    // ⚠️ lento, prefira Object.create
Object.getOwnPropertyDescriptor(obj, "prop");
Object.groupBy(array, callback);       // ES2024 — agrupa array por chave
```

## Enumerabilidade e Ownership

| Método | Próprias | Enumeráveis | Strings | Symbols |
|--------|----------|-------------|---------|---------|
| `Object.keys()` | ✅ | ✅ | ✅ | ❌ |
| `Object.values()` | ✅ | ✅ | ✅ | ❌ |
| `Object.entries()` | ✅ | ✅ | ✅ | ❌ |
| `for...in` | ❌ (inclui prototype) | ✅ | ✅ | ❌ |
| `Object.getOwnPropertyNames()` | ✅ | ❌ | ✅ | ❌ |
| `Object.getOwnPropertySymbols()` | ✅ | ❌ | ❌ | ✅ |
| `Object.getOwnPropertyDescriptors()` | ✅ | ❌ | ✅ | ✅ |
| `Object.hasOwn()` | ✅ | ❌ | ✅ | ✅ |
| `Reflect.ownKeys()` | ✅ | ❌ | ✅ | ✅ |

```js
// Verificar se propriedade existe
"prop" in obj;              // prototype chain incluída ✅
obj.hasOwnProperty("prop"); // ❌ pode ser sobrescrita
Object.hasOwn(obj, "prop"); // ✅ ES2022, seguro
```

## Object.groupBy (ES2024)

```js
const produtos = [
  { nome: "maçã", tipo: "fruta" },
  { nome: "cenoura", tipo: "legume" },
  { nome: "banana", tipo: "fruta" },
];

const agrupado = Object.groupBy(produtos, p => p.tipo);
// { fruta: [maçã, banana], legume: [cenoura] }
```

## Padrão: Objeto como Dicionário (EVITAR)

```js
// ❌ Objeto como Map
const dicionario = {};
dicionario["toString"] = "valor";  // sobrescreve método do prototype
"toString" in dicionario;          // true (herdado!)
dicionario.__proto__;              // Object.prototype

// ✅ Map é a ferramenta certa para dicionários
const mapa = new Map();
mapa.set("toString", "valor");
mapa.has("toString");              // true (próprio)
```

## Objetos com Protótipo null

```js
// Para dicionários "puros" em código legado
const dict = Object.create(null);
dict.toString = "ok";   // sem conflito com prototype
// Mas ainda prefira Map
```

## Boas Práticas

1. **Prefira spread** `{ ...obj }` sobre `Object.assign()` para clonagem
2. **Use `Object.hasOwn()`** em vez de `hasOwnProperty()` ou `in` para propriedades próprias
3. **`for...in` sempre com `Object.hasOwn()` check** se usá-lo
4. **Prefira getters/setters de classe** (`get`/`set`) sobre `Object.defineProperty`
5. **`Object.freeze()`** para objetos de configuração que não devem mudar
6. **Use `Map`** para dicionários dinâmicos; objetos são para **structs fixos**
