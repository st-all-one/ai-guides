# 15. Internacionalização (Intl.*)

Intl é a API nativa para localização de dados: datas, números, listas, ordenação.

## Intl.DateTimeFormat — Datas Localizadas

```js
const date = new Date("2024-12-31T10:30:00");

// Formato curto
new Intl.DateTimeFormat("pt-BR").format(date);    // "31/12/2024"
new Intl.DateTimeFormat("en-US").format(date);    // "12/31/2024"
new Intl.DateTimeFormat("de-DE").format(date);    // "31.12.2024"

// Opções
const fmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",       // "long" | "short" | "narrow"
  year: "numeric",       // "numeric" | "2-digit"
  month: "long",         // "long" | "short" | "narrow" | "numeric" | "2-digit"
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
fmt.format(date);        // "terça-feira, 31 de dezembro de 2024 às 10:30"
```

### formatRange

```js
const start = new Date("2024-01-01");
const end = new Date("2024-12-31");
new Intl.DateTimeFormat("pt-BR").formatRange(start, end);
// "01/01/2024 a 31/12/2024"
```

## Intl.NumberFormat — Números e Moedas

```js
const value = 1234567.89;

new Intl.NumberFormat("pt-BR").format(value);
// "1.234.567,89"

new Intl.NumberFormat("en-US").format(value);
// "1,234,567.89"

// Moeda
new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);
// "R$ 1.234.567,89"

new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format(value);
// "$1,234,567.89"

// Percentual
new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
}).format(0.256);
// "25,6%"

// Unidade
new Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "kilometer",
  unitDisplay: "long",
}).format(42);
// "42 kilometers"
```

## Intl.Collator — Ordenação Localizada

```js
// Ordenação que respeita regras do locale
const nomes = ["Álvaro", "ana", "Beatriz", "çarlos"];

// ❌ Ordenação padrão (código Unicode)
nomes.sort();                     // ["Beatriz", "ana", "Álvaro", "çarlos"]

// ✅ Ordenação localizada
const collator = new Intl.Collator("pt-BR");
nomes.sort(collator.compare);     // ["ana", "Álvaro", "Beatriz", "çarlos"]
```

| Opção | Efeito |
|-------|--------|
| `sensitivity: "base"` | Ignora acentos e case (`a` == `á` == `A`) |
| `sensitivity: "accent"` | Considera acentos, ignora case (`a` == `A`, `a` ≠ `á`) |
| `sensitivity: "case"` | Considera case, ignora acentos (`a` ≠ `A`, `a` == `á`) |
| `sensitivity: "variant"` | Tudo importa (default) |
| `numeric: true` | Ordenação numérica (`"2" < "10"`) |
| `caseFirst: "upper"` | Upper case primeiro |

```js
// Busca com collator
const str = "coração";
str.includes("cora");                 // true
collator.compare("coração", "cora");  // 1 (coração é maior)

// Comparação "base" para fuzzy search
const fuzzy = new Intl.Collator("pt-BR", { sensitivity: "base" });
fuzzy.compare("coração", "CORACAO");  // 0 (iguais)
```

## Intl.ListFormat — Listas Formatadas

```js
const items = ["maçã", "banana", "laranja"];

new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(items);
// "maçã, banana e laranja"

new Intl.ListFormat("en-US", { style: "short", type: "disjunction" }).format(items);
// "maçã, banana, or laranja"
```

| type | Conjunção | Disjunção |
|------|-----------|-----------|
| `"conjunction"` | "A, B e C" (and) | — |
| `"disjunction"` | — | "A, B ou C" (or) |

## Intl.RelativeTimeFormat — Tempo Relativo

```js
const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

rtf.format(-1, "day");    // "ontem"
rtf.format(-3, "day");    // "há 3 dias"
rtf.format(1, "hour");    // "em 1 hora"
rtf.format(-30, "minute");// "há 30 minutos"
```

| `numeric: "auto"` | Usa "ontem"/"hoje" quando possível |
| `numeric: "always"` | Sempre númerico ("há 1 dia") |

## Intl.DisplayNames — Nomes Traduzidos

```js
const dn = new Intl.DisplayNames("pt-BR", { type: "region" });
dn.of("BR");    // "Brasil"
dn.of("US");    // "Estados Unidos"

const lang = new Intl.DisplayNames("pt-BR", { type: "language" });
lang.of("en");  // "inglês"
lang.of("pt");  // "português"
```

## Intl.Segmenter — Segmentação de Texto

```js
const segmenter = new Intl.Segmenter("ja-JP", { granularity: "grapheme" });
const segments = [...segmenter.segment("ありがとう")];
// Cada segmento é um grafema (caractere percebido)

// Granularidade: "grapheme" | "word" | "sentence"
const wordSeg = new Intl.Segmenter("pt-BR", { granularity: "word" });
for (const { segment, isWordLike } of wordSeg.segment("Olá mundo!")) {
  console.log(segment, isWordLike);
}
```

## Métodos `toLocaleString()` — Acesso Rápido

```js
(1234567.89).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// "R$ 1.234.567,89"

new Date().toLocaleString("pt-BR");
// "31/12/2024 10:30:00"

new Date().toLocaleDateString("en-US");
// "12/31/2024"

new Date().toLocaleTimeString("de-DE");
// "10:30:00"
```

## Guia Rápido — Locale vs Opções

```js
// Locale "fallback": o runtime usa o mais próximo disponível
new Intl.DateTimeFormat(["pt-BR", "pt", "en"]).format(date);

// Opções comuns
const opts = {
  style: "decimal" | "currency" | "percent" | "unit",
  currency: "BRL" | "USD" | "EUR" | "JPY" | ...,
  notation: "standard" | "scientific" | "engineering" | "compact",
  compactDisplay: "short" | "long",
};
```

## Boas Práticas

1. **Crie o formatador uma vez e reuse** — `Intl.*` construtores são caros
2. **Use `Intl` em vez de bibliotecas** para casos simples (moment/luxon desnecessários se Intl basta)
3. **Sempre especifique locale** — nunca dependa do locale padrão do runtime
4. **`formatRange`** em vez de concatenar duas datas manualmente
5. **`Collator`** para qualquer ordenação de texto que envolva usuário
