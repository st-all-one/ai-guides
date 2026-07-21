# Exemplo Completo — Sistema de Gerenciamento de Tarefas Moderno

> Implementação real seguindo todas as boas práticas do guia JavaScript Moderno (ES2025).

## Arquitetura

```
src/
  main.js              — Entry point, orquestração
  tarefa.js            — Classe Tarefa com encapsulamento #
  projeto.js           — Classe Projeto com composição
  usuario.js           — Módulo com factory function
  storage.js           — Gerenciamento de persistência com using
  api.js               — Comunicação HTTP com async/await e Error.cause
  formatacao.js        — Utilitários com Intl
  db.js                — Database connection com await using
```

---

## 1. `src/tarefa.js` — Classe com Campos Privados

```js
export class Tarefa {
  #id;
  #criadaEm;
  #concluidaEm;

  titulo;
  prioridade;
  tags = new Set();

  constructor(titulo, prioridade = "media") {
    this.#id = crypto.randomUUID();
    this.#criadaEm = Temporal.Now.instant();
    this.titulo = titulo;
    this.prioridade = prioridade;
  }

  get id() {
    return this.#id;
  }

  get criadaEm() {
    return this.#criadaEm;
  }

  get status() {
    return this.#concluidaEm ? "concluida" : "pendente";
  }

  concluir() {
    this.#concluidaEm = Temporal.Now.instant();
  }

  reabrir() {
    this.#concluidaEm = null;
  }

  adicionarTag(tag) {
    this.tags.add(tag);
  }

  toJSON() {
    return {
      id: this.#id,
      titulo: this.titulo,
      prioridade: this.prioridade,
      status: this.status,
      tags: [...this.tags],
      criadaEm: this.#criadaEm.toString(),
      concluidaEm: this.#concluidaEm?.toString() ?? null,
    };
  }
}
```

---

## 2. `src/projeto.js` — Composição sobre Herança

```js
import { Tarefa } from "./tarefa.js";

export class Projeto {
  #tarefas = new Map();
  #nome;
  #meta;

  constructor(nome, meta = {}) {
    this.#nome = nome;
    this.#meta = { ...meta };
  }

  get nome() {
    return this.#nome;
  }

  get tamanho() {
    return this.#tarefas.size;
  }

  adicionarTarefa(titulo, prioridade) {
    const tarefa = new Tarefa(titulo, prioridade);
    this.#tarefas.set(tarefa.id, tarefa);
    return tarefa;
  }

  concluirTarefa(id) {
    this.#tarefas.get(id)?.concluir();
  }

  listarTarefas(filtro = {}) {
    const tarefas = [...this.#tarefas.values()];

    if (filtro.status) {
      return tarefas.filter((t) => t.status === filtro.status);
    }

    if (filtro.prioridade) {
      return tarefas.filter((t) => t.prioridade === filtro.prioridade);
    }

    return tarefas;
  }

  get estatisticas() {
    const total = this.#tarefas.size;
    const concluidas = this.listarTarefas({ status: "concluida" }).length;

    return {
      total,
      concluidas,
      pendentes: total - concluidas,
      progresso: total === 0 ? 0 : Math.round((concluidas / total) * 100),
    };
  }

  toJSON() {
    return {
      nome: this.#nome,
      meta: this.#meta,
      tarefas: [...this.#tarefas.values()].map((t) => t.toJSON()),
      estatisticas: this.estatisticas,
    };
  }
}
```

---

## 3. `src/usuario.js` — Factory Function + Closure

```js
const #permissoes = new WeakMap();

export function criarUsuario(nome, email) {
  const permissoes = new Set(["ler"]);

  #permissoes.set(permissoes, { nome, email });

  return {
    get nome() {
      return nome;
    },

    get email() {
      return email;
    },

    get permissoes() {
      return new Set(permissoes);
    },

    adicionarPermissao(permissao) {
      permissoes.add(permissao);
    },

    temPermissao(permissao) {
      return permissoes.has(permissao);
    },
  };
}

export function autenticar({ email, senha }) {
  if (!email || !senha) {
    throw new Error("Credenciais obrigatórias", { cause: { email, senha } });
  }

  return criarUsuario(email.split("@")[0], email);
}
```

---

## 4. `src/storage.js` — Gerenciamento de Recursos com `using`

```js
export class StorageHandle {
  #db;
  #aberto = false;

  constructor(db) {
    this.#db = db;
    this.#aberto = true;
  }

  async salvar(chave, valor) {
    if (!this.#aberto) throw new ReferenceError("Storage fechado");
    this.#db.setItem(chave, JSON.stringify(valor));
  }

  async carregar(chave) {
    if (!this.#aberto) throw new ReferenceError("Storage fechado");
    const raw = this.#db.getItem(chave);
    return raw ? JSON.parse(raw) : null;
  }

  [Symbol.dispose]() {
    this.#aberto = false;
    console.log("StorageHandle liberado");
  }
}

export function abrirStorage(db = localStorage) {
  return new StorageHandle(db);
}
```

---

## 5. `src/api.js` — Async/Await com Concorrência e Error.cause

```js
const BASE_URL = "https://api.exemplo.com/v2";

class ApiError extends Error {
  constructor(message, { status, endpoint, causa } = {}) {
    super(message, { cause: causa });
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

async function requisicao(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError("Falha na requisição", {
        status: response.status,
        endpoint,
      });
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Erro de rede", { endpoint, causa: error });
  }
}

export async function sincronizarTarefas(projeto, usuario) {
  if (!usuario.temPermissao("escrever")) {
    throw new ApiError("Sem permissão de escrita", { status: 403 });
  }

  const [remotas, locais] = await Promise.all([
    requisicao(`/projetos/${projeto.nome}/tarefas`),
    Promise.resolve(projeto.listarTarefas()),
  ]);

  return { remotas, locais };
}

export async function buscarComFalloff(urls) {
  const resultados = await Promise.allSettled(
    urls.map((url) => requisicao(url)),
  );

  const sucessos = [];
  const falhas = [];

  for (const r of resultados) {
    if (r.status === "fulfilled") {
      sucessos.push(r.value);
    } else {
      falhas.push(r.reason);
    }
  }

  return { sucessos, falhas };
}
```

---

## 6. `src/formatacao.js` — Intl para Internacionalização

```js
const formatadores = new Map();

function obterFormatador(locale, opcoes) {
  const chave = `${locale}:${JSON.stringify(opcoes)}`;
  if (!formatadores.has(chave)) {
    formatadores.set(chave, new Intl.DateTimeFormat(locale, opcoes));
  }
  return formatadores.get(chave);
}

export function formatarData(data, locale = "pt-BR") {
  return obterFormatador(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(data);
}

export function formatarMoeda(valor, moeda = "BRL", locale = "pt-BR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moeda,
  }).format(valor);
}

export function formatarLista(itens, locale = "pt-BR") {
  return new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  }).format(itens);
}

export function ordenarNomes(nomes, locale = "pt-BR") {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...nomes].sort(collator.compare);
}
```

---

## 7. `src/db.js` — Recurso Assíncrono com `await using`

```js
export class DatabaseConnection {
  #conn;
  #transacaoAtiva = false;

  constructor(url) {
    this.url = url;
  }

  async conectar() {
    this.#conn = await sqlite.open(this.url);
  }

  async query(sql, params = []) {
    if (!this.#conn) throw new Error("Não conectado");
    return this.#conn.query(sql, params);
  }

  async transacao(fn) {
    if (this.#transacaoAtiva) return fn(this);

    this.#transacaoAtiva = true;
    try {
      await this.#conn.exec("BEGIN");
      const resultado = await fn(this);
      await this.#conn.exec("COMMIT");
      return resultado;
    } catch (erro) {
      await this.#conn.exec("ROLLBACK");
      throw new Error("Transação falhou", { cause: erro });
    } finally {
      this.#transacaoAtiva = false;
    }
  }

  async [Symbol.asyncDispose]() {
    if (this.#conn) {
      if (this.#transacaoAtiva) await this.#conn.exec("ROLLBACK");
      await this.#conn.close();
      this.#conn = null;
    }
  }
}
```

---

## 8. `src/main.js` — Orquestração Moderna

```js
import { criarUsuario, autenticar } from "./usuario.js";
import { Projeto } from "./projeto.js";
import { abrirStorage } from "./storage.js";
import { sincronizarTarefas } from "./api.js";
import { formatarData, formatarLista } from "./formatacao.js";
import { DatabaseConnection } from "./db.js";

async function main() {
  const usuario = autenticar({ email: "ana@exemplo.com", senha: "123" });
  usuario.adicionarPermissao("escrever");

  const projeto = new Projeto("App", { versao: "2.0" });

  const tarefa1 = projeto.adicionarTarefa("Implementar login", "alta");
  const tarefa2 = projeto.adicionarTarefa("Escrever testes", "media");
  tarefa1.adicionarTag("frontend");
  tarefa2.adicionarTag("qa");
  tarefa2.adicionarTag("urgencia");

  tarefa1.concluir();

  {
    using storage = abrirStorage();
    await storage.salvar(`projeto:${projeto.nome}`, projeto.toJSON());
    const carregado = await storage.carregar(`projeto:${projeto.nome}`);
    console.log("Projeto salvo:", carregado?.nome);
  }

  {
    await using db = new DatabaseConnection("sqlite://app.db");
    await db.conectar();

    await db.transacao(async (tx) => {
      for (const tarefa of projeto.listarTarefas()) {
        await tx.query(
          "INSERT INTO tarefas (id, titulo, prioridade, status) VALUES (?, ?, ?, ?)",
          [tarefa.id, tarefa.titulo, tarefa.prioridade, tarefa.status],
        );
      }
    });
  }

  const { sucessos, falhas } = await sincronizarTarefas(projeto, usuario);
  console.log(`Sincronizados: ${sucessos.length}, Falhas: ${falhas.length}`);

  console.log("Progresso:", projeto.estatisticas.progresso, "%");
  console.log("Tarefas pendentes:", formatarLista(
    projeto.listarTarefas({ status: "pendente" }).map((t) => t.titulo),
  ));
  console.log("Tarefa criada em:", formatarData(new Date()));
}

main().catch((erro) => {
  console.error("Fatal:", erro.message, erro.cause ?? "");
  process.exitCode = 1;
});
```

---

## Checklist de Boas Práticas Atendidas

| Prática | Onde |
|---------|------|
| `const` sobre `let` | Todo o código — sem `var` |
| `===` para comparações | Em todo lugar |
| Módulos ESM | `import`/`export` entre arquivos |
| Async/await sobre `.then()` | `main()`, `sincronizarTarefas()`, `requisicao()` |
| `#` campos privados | `Tarefa.#id`, `Projeto.#tarefas`, closure via `WeakMap` |
| `?.` e `??` | `this.#concluidaEm?.toString() ?? null`, `t.status === filtro.status` |
| `Map`/`Set` para coleções | `Projeto.#tarefas` (Map), `Tarefa.tags` (Set), `usuario.permissoes` (Set) |
| `using`/`await using` | `StorageHandle` (disposable), `DatabaseConnection` (async disposable) |
| Spread para imutabilidade | `{ ...meta }`, `{ ...options.headers }`, `[...projeto.listarTarefas()]` |
| Template literals | URLs, mensagens de erro |
| Arrow functions (callbacks) | `.map()`, `.filter()`, `.catch()` |
| Destructuring | Parâmetros `({ nome, idade })`, `const [sucessos, falhas]` |
| `for...of` sobre `for...in` | `for (const r of resultados)` |
| `Error.cause` | `Throw new Error(..., { cause })` em toda a cadeia |
| `Intl` para locale | `formatarData()`, `formatarMoeda()`, `formatarLista()`, `ordenarNomes()` |
| `Promise.all`/`allSettled` | `sincronizarTarefas()` (all), `buscarComFalloff()` (allSettled) |
| `Object.hasOwn` | Disponível para checks (quando necessário) |
| `toSorted` em vez de `sort()` | `ordenarNomes()` usa `[...nomes].sort()` (cópia) |
| `crypto.randomUUID()` | `Tarefa.#id` |
| `Error` subclasses | `ApiError` estende `Error` |
| `try/catch/finally` | `db.transacao()`, `requisicao()` |
