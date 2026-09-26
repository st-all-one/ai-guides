# 19. Cadeia de Protótipos e Herança

## O Essencial

Todo objeto em JS tem um **protótipo** (`[[Prototype]]`) — outro objeto do qual "herda" propriedades. Quando uma propriedade não é encontrada no objeto, JS busca na cadeia de protótipos até achar ou chegar em `null`.

```js
const obj = {};
// obj → Object.prototype → null

obj.toString();  // encontrado em Object.prototype (não em obj)
```

## `[[Prototype]]` vs `prototype`

| Conceito | O que é | Quem tem |
|----------|---------|----------|
| `[[Prototype]]` | Link interno (cadeia) | **Todo** objeto |
| `.prototype` | Propriedade normal | Só funções (usada com `new`) |

```js
function Foo() {}
const foo = new Foo();

foo.[[Prototype]]  →  Foo.prototype  →  Object.prototype  →  null
     (internal)        (não confundir com Foo.[[Prototype]]!)
```

## Acessando e Modificando o Protótipo

```js
// Leitura (preferido)
Object.getPrototypeOf(obj);

// Escrita (evite — lento)
Object.setPrototypeOf(obj, proto);

// Legado (evite)
obj.__proto__;  // getter/setter, lento, não padronizado até ES2015
```

## Property Lookup — Como JS Encontra `obj.prop`

1. **Própria?** (`Object.hasOwn(obj, "prop")`) → usa o valor
2. **No protótipo?** → busca recursivamente
3. **No protótipo do protótipo?** → ...
4. **`null`?** → retorna `undefined`

```js
const parent = { a: 1 };
const child = Object.create(parent);
child.b = 2;

child.b;  // 2 (própria)
child.a;  // 1 (no protótipo)
child.c;  // undefined (não encontrada na cadeia)
```

### Shadowing (Sobreposição)

```js
parent.a = 1;
child.a = 42;  // cria PROPRIEDADE PRÓPRIA em child
// parent.a continua 1
// A partir de child, a busca encontra child.a primeiro
```

## Object.create — Criação com Protótipo Específico

```js
const animal = {
  respirar() { return "respirando"; }
};

const cachorro = Object.create(animal);
cachorro.latir = () => "au";
cachorro.respirar();  // "respirando" (herdado)

// Objeto sem protótipo (dicionário puro)
const dict = Object.create(null);
dict.toString = "ok";  // sem conflito
```

## `hasOwnProperty` vs `in`

```js
const obj = { a: 1 };

"a" in obj;           // true (própria)
"toString" in obj;    // true (herdada de Object.prototype)

obj.hasOwnProperty("a");        // true
Object.hasOwn(obj, "a");       // true ✅ (moderno)
obj.hasOwnProperty("toString"); // false

// ⚠️ obj.hasOwnProperty pode ser sobrescrito
// ✅ Object.hasOwn é sempre seguro
```

## Constructor Functions (Pré-ES6)

```js
function Animal(nome) {
  this.nome = nome;
}
Animal.prototype.som = function() {
  return "?";
};

function Cachorro(nome) {
  Animal.call(this, nome);  // chama construtor pai
}
Cachorro.prototype = Object.create(Animal.prototype);
Cachorro.prototype.constructor = Cachorro;
Cachorro.prototype.som = function() {
  return "au";
};

const rex = new Cachorro("Rex");
console.log(rex.som());  // "au"
console.log(rex.nome);   // "Rex"
```

## Classes ES6 — Açúcar Sintático sobre Protótipos

```js
class Animal {
  constructor(nome) { this.nome = nome; }
  som() { return "?"; }
}

class Cachorro extends Animal {
  som() { return "au"; }
}

// Mesma cadeia de protótipos:
// rex → Cachorro.prototype → Animal.prototype → Object.prototype → null
```

Classes são syntactic sugar — a cadeia de protótipos é idêntica.

## `instanceof` — Verifica Cadeia de Protótipos

```js
obj instanceof Classe;
// true se Classe.prototype está na cadeia de [[Prototype]] de obj

// Funciona com herança:
rex instanceof Cachorro;   // true
rex instanceof Animal;     // true
rex instanceof Object;     // true
rex instanceof Array;      // false

// ⚠️ Não funciona entre realms diferentes (iframes, Node vm)
// ⚠️ pode ser enganado com Symbol.hasInstance
```

## Herança vs Composição

```js
// ❌ Herança profunda — frágil
class Animal { }
class Mamifero extends Animal { }
class Cachorro extends Mamifero { }
class PastorAlemao extends Cachorro { }

// ✅ Composição — flexível
const podeLatir = { latir: () => "au" };
const podeCorrer = { correr: () => "correndo" };
const rex = Object.assign({}, podeLatir, podeCorrer);
```

## Diagrama da Cadeia

```
null
  ↑
Object.prototype  ←─── toString, hasOwnProperty, etc.
  ↑
Array.prototype   ←─── map, filter, reduce, etc.
  ↑
meuArray          ←─── ["a", "b", "c"]
```

## Boas Práticas

1. **Prefira `Object.getPrototypeOf`** sobre `__proto__`
2. **`Object.hasOwn()`** para verificar propriedades próprias
3. **`Object.create(null)`** para dicionários puros
4. **`instanceof` funciona**, mas prefira duck typing ou verificação de capacidades
5. **Classes modernas** são mais limpas que constructor functions manuais
6. **Composição > herança** — prefira mixins, `Object.assign`, ou composição funcional
7. **Evite modificar protótipos de built-ins** (`Array.prototype.meuMetodo = ...`)
