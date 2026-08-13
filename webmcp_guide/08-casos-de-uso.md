# 08 — Casos de uso e jornadas críticas (CUJ)

Este guia apresenta como **implementar o WebMCP na prática** a partir da perspectiva do usuário e do agente, com recomendações de ferramentas para apoiar uma **jornada crítica do usuário (CUJ — Critical User Journey)**.

> **Termo-chave — CUJ**: define o caminho de um usuário para alcançar um objetivo, incluindo qualquer contexto necessário. Para um exercício completo de criação de CUJ, veja o [design sprint kit de User Journey Mapping](https://designsprintkit.withgoogle.com/methodology/phase1-understand/user-journey-mapping).

## 1. Ajudar usuários a fazer compras

Lojas de varejo são ótimos candidatos para WebMCP. Embora haja circunstâncias em que o usuário queira escolher item a item (ex.: a peça que falta na coleção), em outras a tarefa só precisa ser concluída: lista semanal de compras, planejamento de festa ou recompra de favoritos.

**Persona**: Jesse — não quer gastar tempo procurando entre categorias. Depende do agente do navegador para compras, achando itens mais rápido e fazendo checkout mais rapidamente.

### Apoiar jornada de compras

Jesse está comprando suprimentos para a festa de aniversário de 10 anos do filho (tema: espaço sideral). Pergunta ao agente:

> "Encontre os melhores preços para os produtos da minha lista em duas ou três lojas locais. Monte minha wishlist para eu finalizar o checkout. Me avise se houver produtos que não possam ser encontrados."

Assunções de Jesse: o agente não adiciona o mesmo item em múltiplos carrinhos; se duas lojas têm o item, o agente escolhe a de menor custo; "lojas locais" = Springfield.

Ferramentas sugeridas (para uma loja local OU uma grande rede):

```js
await document.modelContext.registerTool({
  name: 'search_products',
  description: 'Find products in a category that match expectations.',
  inputSchema: {
    type: 'object',
    properties: {
      productType: { type: 'string', description: 'Type of product, e.g. "wall-decorations".' },
      category: { type: 'string', description: 'Category, e.g. "planets".' },
      age: { type: 'string', description: 'Target audience age, e.g. "child".' },
    },
  },
  async execute({ productType, category, age }) { /* busca */ },
});

await document.modelContext.registerTool({
  name: 'add_to_wishlist',
  description: 'Add items to the wishlist for review before checkout.',
  inputSchema: {
    type: 'object',
    properties: {
      productId: { type: 'string' },
      quantity: { type: 'number' },
    },
  },
  execute: async ({ productId, quantity }) => { /* adiciona à wishlist */ },
});

await document.modelContext.registerTool({
  name: 'refine_search',
  description: 'Refine product search by price range.',
  inputSchema: {
    type: 'object',
    properties: {
      priceRange: { type: 'string', description: 'e.g. "0-49.99".' },
    },
  },
  execute: async ({ priceRange }) => { /* aplica filtro */ },
});
```

### Apoiar recompra

Jesse adorou os cheese sticks da "Example Grocery Company", mas não lembra a marca:

> "Pode reordenar os cheese sticks que comprei no mês passado?"

Se você não tem serviço de assinatura, ainda pode ajudar clientes a reordenar o mesmo produto com o agente:

```js
await document.modelContext.registerTool({
  name: 'get_order_history',
  description: 'Returns details of products ordered with date and delivery status.',
  inputSchema: {
    type: 'object',
    properties: {
      startdate: { type: 'string', description: 'Start date (YYYY-MM-DD).' },
      enddate: { type: 'string', description: 'End date (YYYY-MM-DD).' },
    },
  },
  execute: async ({ startdate, enddate }) => { /* histórico */ },
});

await document.modelContext.registerTool({
  name: 'delivery',
  description: 'Set delivery method.',
  inputSchema: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['pickup', 'delivery'] },
    },
  },
  execute: async ({ method }) => { /* define método */ },
});
```

O agente responde: *"Encontrei seu pedido de Cheddar Peelers de 7 de março. Adicionei um pacote ao seu carrinho. Gostaria de prosseguir para o checkout?"*

## 2. Ajudar usuários a preencher formulários

O preenchimento automático (autofill), bem aplicado, pode [reduzir a taxa de abandono de formulários em 75%](https://developer.chrome.com/blog/autofill-insights-2024). Com o WebMCP, os agentes dos usuários preenchem formulários longos de forma rápida e correta.

**Persona**: Charlie — trabalha em TI num escritório de advocacia; contratou um freelancer para o site novo. Gerenciar despesas e timesheets é doloroso.

### Gerenciar trabalho (timesheet)

Você trabalha numa empresa de software de gestão de trabalho. Adicione uma ferramenta WebMCP para que contratados e advogados usem um agente para registrar tarefas diárias de timesheet com o contexto correto (para cobrar o valor certo no departamento certo). A API declarativa é perfeita aqui — ver o [exemplo completo de timesheet no guia 06](06-api-declarativa.md).

### Comprar um carro

Charlie quer um carro usado com requisitos específicos:

> "Pode me ajudar a encontrar um carro de família? Precisa ter 7 lugares, usar gasolina comum e ser de modelo dos últimos 10 anos."

Se o site já tem um formulário com campos obrigatórios e opcionais, **bastam dois passos** para transformá-lo numa ferramenta WebMCP.

**HTML:**

```html
<form toolname="search_cars"
  tooldescription="Search for cars based on various criteria such as type, seats, year, fuel, and features."
  toolautosubmit>

  <fieldset>
    <label for="car_type">Car Type</label>
    <select id="car_type" name="car_type" toolparamdescription="Type of car">
      <option value="">Any</option>
      <option value="family">Family Car</option>
      <option value="suv">SUV</option>
      <option value="sedan">Sedan</option>
    </select>

    <label for="seats">Min Seats</label>
    <input type="number" id="seats" name="seats" min="1" max="9"
      toolparamdescription="Minimum number of seats required"
      placeholder="7">

    <label for="min_year">Minimum Year</label>
    <input type="number" id="min_year" name="min_year" min="1900" max="2026"
      toolparamdescription="Find cars made after a specific year"
      placeholder="2016">
  </fieldset>

  <fieldset>
    <legend>Preferences</legend>

    <label for="fuel_type">Fuel Type</label>
    <select id="fuel_type" name="fuel_type" toolparamdescription="Preferred fuel type">
      <option value="">Unleaded regular</option>
      <option value="diesel">Diesel</option>
      ...
    </select>

    <div>
      <input type="checkbox" id="has_ac" name="has_ac" value="true"
        toolparamdescription="Check if air conditioning is required">
      <label for="has_ac">Air Conditioning (AC)</label>
    </div>
  </fieldset>

  <button type="submit">Search Cars</button>
</form>
```

**JavaScript equivalente (o que o agente chama):**

```js
search_cars({ car_type, seats, min_year, fuel_type, has_ac, ... });
```

### Reclamação de garantia

Charlie quer abrir uma reclamação de garantia da TV. Ele aterrissa na página principal do site onde comprou e declara a intenção ao agente:

> "Vá para a página de suporte e abra uma reclamação de garantia para minha TV. A tela não liga. O número de série é XYZ-987. Use meus dados salvos para o resto."

Ferramentas que ajudam o agente a navegar sem que Charlie precise entender a estrutura do site:

```js
await document.modelContext.registerTool({
  name: 'start_claim_process',
  description: 'Navigate to the correct claim form.',
  execute: async () => { /* navega/foca no formulário */ },
});

await document.modelContext.registerTool({
  name: 'populate_product_details',
  description: 'Input the specific product and date information.',
  inputSchema: {
    type: 'object',
    properties: {
      serial_number: { type: 'string' },
      purchase_date: { type: 'string' },
    },
  },
  execute: async ({ serial_number, purchase_date }) => { /* preenche */ },
});

await document.modelContext.registerTool({
  name: 'describe_issue',
  description: 'Fill the long-text field with the fault description.',
  inputSchema: {
    type: 'object',
    properties: { issue_description: { type: 'string' } },
  },
  execute: async ({ issue_description }) => { /* preenche */ },
});

await document.modelContext.registerTool({
  name: 'populate_contact_info',
  description: 'Fill contact information.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
    },
  },
  execute: async ({ name, email, phone }) => { /* preenche */ },
});
```

Se o agente precisar de mais informações, ele pode pedir ao usuário que as forneça ou preencha o formulário manualmente.

### Pedido de serviços para eventos

Charlie e Jesse vão se casar em setembro e querem contratar um caterer:

> "Pode enviar uma consulta para caterers em Springfield, para nosso casamento em 8 de setembro de 2026? Queremos menu vegetariano para 100 convidados. Dois convidados têm restrições alimentares e precisarão de refeições especiais, incluindo uma refeição kosher e uma sem glúten. Queremos incluir apenas cerveja e vinho."

Ferramentas sugeridas:

```js
// start_event_request()
// create_wedding_reception(guests=100, date="September 8, 2026")
// add_dietary_restrictions(restrictions=["kosher","gluten-free"], guests=2)
// select_drink_package(package="Light")
// submit_event_request()
```

## 3. Ajudar usuários a filtrar informações

Sites com grandes coleções de itens e filtros complexos (aluguel de imóveis, hotéis, ingressos) se beneficiam enormemente.

**Persona**: Dana — encontra opções relevantes para preferências específicas.

### Encontrar imóveis

> "Mostre apartamentos para alugar em Brooklyn a menos de 10 minutos a pé de uma estação de trem A, e a menos de uma hora de Tribeca. O apartamento precisa ter pelo menos três quartos e lava-louças. Seria bom ter máquina de lavar e secar no apartamento ou no prédio. Nosso orçamento é de $4500."

Ferramentas sugeridas:

```
search(
  max-price=4500,
  location="Brooklyn",
  features=["dishwasher"],
  rooms=3,
  optionalFeatures=["washer-dryer"]
)

apply_filters(
  transit="train",
  max_time="1 hour",
  destination="Tribeca"
)
```

O agente usa essas funções para analisar metadados dos imóveis e garantir que os resultados atendam a todos os requisitos. Em resposta, retorna um mapa com pins linkados às listagens e a distância total de Tribeca; pins com cor diferente para o recurso opcional (máquina de lavar e secar).

### Reservar viagem

> "Encontre alguns hotéis em Berlim, Alemanha, por menos de $300 a noite, com piscina e café da manhã incluído."

Ferramentas sugeridas:

```
search_hotels(location="Berlin", guests=2)
filter_search_results(max_price=300, amenities=["pool","restaurant"])
```

O agente retorna três hotéis que atendem aos critérios e pergunta: *"Gostaria de ver mais opções? Ou há critérios adicionais a considerar?"*

## 4. Casos de uso da especificação (use cases do explainer)

### Design gráfico criativo

**Jen** quer criar um panfleto de yard sale em `easely.example`. O site registrou `filter-templates(description)` — filtra templates por descrição visual em linguagem natural — e `edit-design(instructions)` — aplica edições em lote como mudanças "não commitadas" na UI. Quando Jen quer finalizar, o site registra `order-prints(copies, pageSize)` dinamicamente, e o agente oferece imprimir, navegando até o checkout seguro onde Jen conclui com um clique.

### E-commerce e compras sob medida

**Maya** está procurando vestidos em `wildebloom.example/shop`. O site registra `get-dresses(size, color)` (retorna JSON com id, descrição, preço, foto), `show-dresses(...)` (atualiza a UI) e `filter-products(...)`. O agente traduz automaticamente o tamanho de Maya para o tamanho EU a partir do perfil do navegador, filtra por critérios de "vestido de casamento cocktail", e até usa capacidades de visão para comparar a foto de um vestido favorito com os produtos e atualizar a grade da loja.

### Fluxos de trabalho de desenvolvedor

**John** faz code review no **Gerrit**. O site registra `get-trybot-statuses()` e `get-trybot-failure-snippet(botName)`. O agente consulta os status, obtém os snippets de log de cada bot falho e reporta as causas ("Out of Space" no Mac; símbolo ausente `gfx::DisplayCompositor` no Android). John pede uma correção e o agente usa `add-suggested-edit(filename, patch)` para aplicar o diff, que o Gerrit exibe como sugestão para John aceitar, modificar ou rejeitar.

### Agentes e extensões

WebMCP é útil para agentes em **extensões**: agentes podem usar `document.modelContext` (via content scripts) para descobrir e executar ferramentas. Extensões com `host_permission` já poderiam manipular a página com JavaScript customizado, mas com WebMCP têm acesso estruturado.

## Boas práticas derivadas dos casos

- **Descreva com precisão**: a `description` deve refletir exatamente o que a ferramenta faz, para que o LLM escolha a ferramenta certa (ver [guia 09](09-seguranca.md) para orçamentos de caracteres).
- **Exponha ferramentas dinamicamente conforme o estado**: ferramentas como `undo` só fazem sentido se um documento está aberto com edições; registre/desregistre conforme o estado da aplicação.
- **Reutilize o código client-side existente**: qualquer ação que o usuário pode fazer pela UI pode virar uma ferramenta reutilizando a lógica da página.
- **Para ações sensíveis, mantenha o humano no loop**: confirmação do usuário antes de compras/checkout.
- **Combine com autofill**: WebMCP complementa (não substitui) boas práticas de formulário com autofill.

---

Próximo: **[09 — Segurança e privacidade](09-seguranca.md)**.
