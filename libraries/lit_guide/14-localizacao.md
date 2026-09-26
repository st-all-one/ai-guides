# Localização com @lit/localize

Sistema oficial de internacionalização (i18n) para Lit. Suporta runtime mode (troca de locale sem recarregar) e transform mode (build separado por locale).

---

## Instalação

```bash
npm i @lit/localize
npm i -D @lit/localize-tools  # CLI para extração e build
```

---

## Quick Start (Runtime Mode)

### 1. Configurar

```typescript
// src/localization.ts
import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales } from '../lit-localize.json';

export const { getLocale, setLocale, updateWhenLocaleChanges } = configureLocalization({
  sourceLocale: 'en',
  targetLocales: ['pt-BR', 'es', 'fr'],
  loadLocale: (locale: string) => import(`/locales/${locale}.ts`),
});
```

### 2. Extrair Mensagens

```bash
npx lit-localize extract
```

### 3. Traduzir

```typescript
// locales/pt-BR.ts (gerado automaticamente)
export const templates = {
  'hello': () => 'Olá, mundo!',
  'greeting': (name: string) => `Olá, ${name}!`,
  'item-count': (count: number) =>
    count === 1 ? '1 item' : `${count} itens`,
};
```

### 4. Usar no Componente

```typescript
import { LitElement, html } from 'lit';
import { msg, str } from '@lit/localize';
import { updateWhenLocaleChanges } from '../localization.js';

@customElement('my-greeting')
class MyGreeting extends LitElement {
  // Re-renderiza automaticamente quando o locale muda
  connectedCallback() {
    super.connectedCallback();
    updateWhenLocaleChanges(this);
  }

  @property() name = 'World';

  render() {
    return html`
      <p>${msg('Hello, world!')}</p>
      <p>${msg(str`Hello, ${this.name}!`)}</p>
      <p>${msg(html`Hello, <b>${this.name}</b>!`)}</p>
    `;
  }
}
```

---

## msg() - Tipos de Mensagem

### String Messages

```typescript
msg('Hello')                    // string literal
msg(str`Hello ${name}`)         // com interpolação (str helper)
msg(html`Hello <b>${name}</b>`) // com HTML (html helper do @lit/localize)
```

### html Helper vs lit html

```typescript
import { html } from '@lit/localize'; // ✅ helper de localização
import { html as litHtml } from 'lit'; // template do Lit

// Não confundir! O html de localização é só para msg():
msg(html`Welcome <b>${user}</b>`);
```

### Mensagens com Placeholders

```typescript
import { msg, str } from '@lit/localize';

// str — para texto simples com placeholders
msg(str`You have ${count} messages`);

// Pluralização manual
msg(str`${count} item${count === 1 ? '' : 's'}`);
```

### Mensagens com HTML

```typescript
msg(html`
  <a href="${url}" target="_blank">${label}</a>
`);
```

---

## Runtime Mode

Locale é trocado sem recarregar a página:

```typescript
import { getLocale, setLocale } from '../localization.js';

// Obter locale atual
getLocale(); // 'en'

// Trocar locale — retorna Promise que resolve quando carregado
await setLocale('pt-BR');
```

### Auto-re-render com @localized Decorator

```typescript
import { localized } from '@lit/localize';

@customElement('my-component')
@localized() // equivalente a updateWhenLocaleChanges no connectedCallback
class MyComponent extends LitElement {
  render() {
    return html`<p>${msg('Hello')}</p>`;
  }
}
```

### Status do Locale

```typescript
import { LitElement, html } from 'lit';
import { setLocale, getLocale } from '../localization.js';

@customElement('locale-picker')
class LocalePicker extends LitElement {
  @state() private _status = '';

  async switchLocale(locale: string) {
    this._status = 'loading';
    try {
      await setLocale(locale);
      this._status = `Locale changed to ${locale}`;
    } catch (e) {
      this._status = `Error: ${(e as Error).message}`;
    }
  }

  render() {
    return html`
      <p>Current: ${getLocale()}</p>
      <button @click=${() => this.switchLocale('pt-BR')}>Português</button>
      <button @click=${() => this.switchLocale('en')}>English</button>
    `;
  }
}
```

### Eventos de Status

```typescript
import { LitElement, html } from 'lit';

@customElement('status-aware-component')
class StatusAware extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('lit-localize-status', this._onStatus as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('lit-localize-status', this._onStatus as EventListener);
  }

  private _onStatus = (e: CustomEvent<{
    status: 'ready' | 'loading' | 'error';
    readyLocale?: string;
    errorMessage?: string;
  }>) => {
    console.log('Localize status:', e.detail.status, e.detail);
  };
}
```

---

## Transform Mode

Gera um bundle separado para cada locale em build time. Sem overhead de runtime.

### Configuração

```typescript
// lit-localize.json
{
  "sourceLocale": "en",
  "targetLocales": ["pt-BR", "es"],
  "tsConfig": "./tsconfig.json",
  "output": {
    "mode": "transform",
    "outputDir": "./locales-output"
  }
}
```

### Build

```bash
npx lit-localize build
```

Gera `locales-output/pt-BR/`, `locales-output/es/` com os templates traduzidos em build time.

### Rollup Integration

```typescript
// rollup.config.js
import { localeTransformers } from '@lit/localize-tools/rollup.js';

export default {
  plugins: [
    localeTransformers({
      sourceLocale: 'en',
      targetLocales: ['pt-BR', 'es'],
      // Gera um entry point por locale
    }),
  ],
};
```

### Troca de Locale (Transform Mode)

Requer recarregamento da página com URL diferente ou cookie:

```typescript
// Carregar o bundle apropriado baseado na URL/cookie/accept-language
async function init() {
  const locale = navigator.language.startsWith('pt') ? 'pt-BR' : 'en';
  await import(`/locales-output/${locale}/app.js`);
}
```

---

## Arquivo de Configuração (lit-localize.json)

```json
{
  "$schema": "node_modules/@lit/localize-tools/config.schema.json",
  "sourceLocale": "en",
  "targetLocales": ["pt-BR", "es", "fr"],
  "tsConfig": "./tsconfig.json",
  "output": {
    "mode": "runtime",
    "outputDir": "./src/generated/locales"
  },
  "interchange": {
    "format": "xliff",
    "xliffDir": "./xliff/"
  },
  "baseUnits": "relative"
}
```

### Opções

| Opção | Tipo | Descrição |
|-------|------|-----------|
| `sourceLocale` | string | Locale do código fonte |
| `targetLocales` | string[] | Locales alvo |
| `output.mode` | `runtime` / `transform` | Modo de operação |
| `output.outputDir` | string | Diretório de saída |
| `interchange.format` | `xliff` / `xlb` | Formato de intercâmbio |
| `interchange.xliffDir` | string | Diretório XLIFF |
| `baseUnits` | `relative` / `absolute` | Unidades de localização |

---

## XLIFF Workflow (Tradução Profissional)

### 1. Extrair

```bash
npx lit-localize extract
```

Gera `xliff/messages.xlf` com todas as mensagens extraídas.

### 2. Enviar para Tradução

O arquivo XLIFF pode ser enviado para tradutores profissionais ou serviços como Crowdin, Lokalise, POEditor.

```xml
<!-- xliff/messages.xlf -->
<trans-unit id="hello">
  <source>Hello, world!</source>
  <target state="new">Olá, mundo!</target>
</trans-unit>
<trans-unit id="greeting">
  <source>Hello, {name}!</source>
  <target state="new">Olá, {name}!</target>
</trans-unit>
```

### 3. Build

```bash
npx lit-localize build
```

Gera os arquivos de locale a partir dos XLIFF traduzidos.

---

## Message Descriptions e IDs

```typescript
// Descrição ajuda tradutores a entenderem o contexto
msg('Save', {
  desc: 'Button label to save current changes'
});

// ID customizado (útil para compatibilidade com traduções existentes)
msg('Welcome', {
  id: 'app.welcome.message'
});
```

---

## Boas Práticas

| Prática | Motivo |
|---------|--------|
| Usar `msg()` em vez de strings soltas | Extração automática de mensagens |
| Preferir `str` sobre concatenação manual | Placeholders são extraídos corretamente |
| Usar `html` helper para conteúdo com markup | Tradutores veem a estrutura HTML |
| Sempre fornecer `desc` em mensagens | Melhora qualidade da tradução |
| Evitar HTML complexo dentro de `msg(html\`...\`)` | Difícil traduzir, prefira slots |
| Testar com cada locale | Strings podem crescer/shrink, quebrando layout |
| Agrupar mensagens relacionadas | Facilita revisão de tradução |

### Runtime vs Transform Mode

| Característica | Runtime | Transform |
|---------------|---------|-----------|
| Troca de locale sem reload | ✅ | ❌ |
| Overhead de runtime | ~5KB + locale files | Zero |
| SEO por locale | ⚠️ Requer setup | ✅ Bundles separados |
| Complexidade | Média | Baixa |
| Bundle size | 1 bundle + locales | N bundles (1 por locale) |
| Quando usar | Apps SPA, dashboard | Sites públicos, SEO-critical |
