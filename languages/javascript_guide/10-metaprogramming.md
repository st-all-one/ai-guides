# 10. Metaprogramming: Proxy e Reflect

## Proxy

`Proxy` permite interceptar e customizar operações fundamentais em objetos:

```js
const handler = {
  get(target, prop, receiver) {
    return prop in target ? target[prop] : 42;
  },
};
const p = new Proxy({}, handler);
p.a = 1;
console.log(p.a, p.b); // 1, 42
```

### Traps Disponíveis

| Trap | Intercepta |
|------|-----------|
| `get(target, prop, receiver)` | `obj.prop`, `obj[prop]` |
| `set(target, prop, value, receiver)` | `obj.prop = val` |
| `has(target, prop)` | `prop in obj` |
| `deleteProperty(target, prop)` | `delete obj.prop` |
| `apply(target, thisArg, args)` | `fn(args)` |
| `construct(target, args)` | `new Fn(args)` |
| `getPrototypeOf(target)` | `Object.getPrototypeOf()` |
| `setPrototypeOf(target, proto)` | `Object.setPrototypeOf()` |
| `isExtensible(target)` | `Object.isExtensible()` |
| `preventExtensions(target)` | `Object.preventExtensions()` |
| `getOwnPropertyDescriptor(target, prop)` | `Object.getOwnPropertyDescriptor()` |
| `defineProperty(target, prop, desc)` | `Object.defineProperty()` |
| `ownKeys(target)` | `Object.keys()`, `getOwnPropertyNames()` |

### Exemplos Práticos

#### Validação

```js
const usuario = new Proxy({}, {
  set(target, prop, value) {
    if (prop === "idade" && (typeof value !== "number" || value < 0)) {
      throw new TypeError("Idade inválida");
    }
    target[prop] = value;
    return true;
  },
});
```

#### Log automático

```js
function logged(obj) {
  return new Proxy(obj, {
    get(target, prop) {
      console.log(`GET ${String(prop)}`);
      return target[prop];
    },
    set(target, prop, value) {
      console.log(`SET ${String(prop)} = ${value}`);
      target[prop] = value;
      return true;
    },
  });
}
```

#### Revogável

```js
const { proxy, revoke } = Proxy.revocable(target, handler);
proxy.foo = 123;
revoke();
proxy.foo; // TypeError: proxy revogado
```

### Invariants

Proxy **não pode** violar invariantes do target. Exemplos:
- Se `target` for non-extensible, `getPrototypeOf` deve retornar o protótipo real
- Se uma propriedade for non-configurable, traps não podem mentir sobre ela

## Reflect

`Reflect` é um objeto estático com métodos que espelham os traps do Proxy:

```js
// Em vez de:
Function.prototype.apply.call(Math.floor, undefined, [1.75]);

// ✅ Reflect
Reflect.apply(Math.floor, undefined, [1.75]); // 1
```

### Métodos Principais

```js
Reflect.get(obj, prop, receiver);
Reflect.set(obj, prop, value, receiver);
Reflect.has(obj, prop);
Reflect.deleteProperty(obj, prop);
Reflect.defineProperty(obj, prop, desc);
Reflect.ownKeys(obj);
Reflect.getPrototypeOf(obj);
Reflect.setPrototypeOf(obj, proto);
Reflect.isExtensible(obj);
Reflect.preventExtensions(obj);
Reflect.getOwnPropertyDescriptor(obj, prop);
Reflect.apply(func, thisArg, args);
Reflect.construct(Fn, args, newTarget?);
```

### Por que usar Reflect?

1. **Retorno booleano** em vez de exceção (`defineProperty` retorna `true/false`)
2. **Forward correto** em traps de Proxy (inclui `receiver`)
3. **Substituto funcional** para operadores como função

```js
// Padrão correto em Proxy:
const handler = {
  get(target, prop, receiver) {
    return Reflect.get(target, prop, receiver);
  },
};
```

## Quando Usar Metaprogramming

### ✅ Casos legítimos:
- Validação de esquema de objetos
- Logging/monitoring transversal (AOP leve)
- Test doubles / mocks
- Observabilidade (Vue.js, MobX usam Proxy)
- Lazy loading de propriedades

### ❌ Evitar:
- Performance crítica (Proxy tem overhead)
- Simples getters/setters (classes resolvem melhor)
- Substituir funcionalidade normal (obscurece o código)
- Violar expectativas de semântica padrão
