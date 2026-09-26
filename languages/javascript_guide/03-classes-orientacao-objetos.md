# 3. Classes e Orientação a Objetos Moderna

## Declaração de Classe

```js
class MinhaClasse {
  // Campos públicos (ES2022+)
  campo = "valor";           // instância
  static estatico = "val";   // classe

  // Campos privados (ES2022+)
  #privado = "segredo";
  static #privadoEstatico = "segredo";

  // Construtor
  constructor(param) {
    this.param = param;
  }

  // Métodos (no prototype, não na instância)
  metodo() { }

  // Accessors
  get computed() { return this.#privado; }
  set computed(v) { this.#privado = v; }

  // Métodos estáticos
  static metodoEstatico() { }

  // Bloco de inicialização estática
  static {
    // Executado uma vez na definição da classe
    // Acesso a # privado estático
  }
}
```

## Diferenças Cruciais vs Função Construtora

| Aspecto | `class` | Função Construtora |
|---------|---------|-------------------|
| Hoisting | ❌ (TDZ — como `let`) | ✅ (declaração) |
| Chamar sem `new` | ❌ `TypeError` | ✅ (polui global) |
| Strict mode | ✅ automático | ❌ (opcional) |
| Campos privados `#` | ✅ nativo | ❌ (só via WeakMap/closure) |
| Métodos no prototype | ✅ automático | ✅ manual |

## Campos Privados (`#`)

```js
class ContaBancaria {
  #saldo = 0;           // declaração OBRIGATÓRIA

  constructor(saldoInicial) {
    this.#saldo = saldoInicial;
  }

  depositar(valor) {
    this.#saldo += valor;
  }

  getSaldo() {
    return this.#saldo;
  }

  // Acesso a # de outras instâncias da MESMA classe
  transferir(para, valor) {
    this.#saldo -= valor;
    para.#saldo += valor;       // ✅ permitido
  }
}

const c = new ContaBancaria(100);
c.#saldo;                // ❌ SyntaxError — privado de verdade!
```

### Características do `#`:
- **Hard private**: não há como acessar de fora (nem `Object.keys()`, nem `Proxy`, nem `Reflect`)
- **Não deletável**: `delete obj.#x` é SyntaxError
- **Não clonável**: `structuredClone()` não copia campos `#`
- **Não herdado**: subclasse não acessa `#` da superclasse
- **Não enumerável**: invisível em `for...in`, `Object.keys()`
- **`in` operator**: `#privado in obj` testa existência sem `try/catch`

### Campos Privados vs Convenção `_`

```js
// ANTI-PADRÃO ❌ — convenção, não enforce
class Antigo {
  constructor() {
    this._saldo = 0;   // qualquer um pode acessar
  }
}

// MODERNO ✅ — enforced pelo motor JS
class Moderno {
  #saldo = 0;
}
```

## Herança com `extends`

```js
class Animal {
  #nome;
  constructor(nome) { this.#nome = nome; }
  som() { return "?"; }
}

class Cachorro extends Animal {
  constructor(nome) {
    super(nome);        // OBRIGATÓRIO antes de usar this
  }
  som() {               // override
    return super.som() + " au au";  // chama método pai
  }
}
```

### Regras:
- `super()` deve ser chamado antes de acessar `this` na subclasse
- Subclasse **não** acessa campos `#` da superclasse
- `instanceof` funciona na cadeia toda
- Só pode extender **uma** classe (herança única)
- Para múltiplas fontes: use composição ou mixins

## Por que Usar Classes?

### ✅ Bom para:
- Agrupar dados + comportamento (como `Map`, `Date`, `Error`)
- Encapsulamento real via `#`
- Namespacing natural
- Type checking com `instanceof`

### ❌ Não é bala de prata:
- Objetos simples e funções soltas são preferíveis em muitos casos (programação funcional)
- Herança profunda cria acoplamento — prefira composição
- Mutabilidade compartilhada pode dificultar raciocínio
- Considere se uma `interface` + objeto literal ou função pura resolve

## Static Initialization Blocks

```js
class Database {
  static #connection;
  static {
    // Útil para inicialização complexa
    try {
      this.#connection = initConnection();
    } catch (e) {
      console.error("Falha na conexão");
    }
  }
  static getConnection() {
    return this.#connection;
  }
}
```

Útil para:
- `try/catch` em inicialização estática
- Múltiplos campos calculados a partir de um valor
- Compartilhar acesso a `#` privado com funções externas (padrão "friend")
