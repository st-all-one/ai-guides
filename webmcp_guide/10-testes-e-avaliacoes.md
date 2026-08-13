# 10 — Testes e avaliações (evals)

O WebMCP dá suporte a agentes que usam **modelos de IA generativa**. Para testar qualquer sistema com IA generativa, seus testes precisam suportar **resultados probabilísticos**: uma entrada pode levar a milhares de respostas com graus variados de precisão. Essa técnica de teste é chamada de **avaliações (evals)**.

Antes de lançar ferramentas em produção, confirme que os agentes entendem **quando** chamar a ferramenta, **como** executá-la e **quais respostas são aceitáveis**. Aborde oportunidades de falha antes que elas aconteçam.

## O que avaliar (pontos de contato com o LLM)

Escreva avaliações para testar:

1. Se o modelo **entende a finalidade** da ferramenta com base na descrição e no schema.
2. Se o modelo **escolhe a ferramenta certa** com os parâmetros corretos para atender à intenção do usuário.
3. Se o modelo **age com base nas informações recebidas** (ex.: usar uma informação para chamar outra ferramenta).
4. Se as **jornadas do usuário** foram bem-sucedidas: considerando a intenção, um agente consegue concluir a jornada com as ferramentas fornecidas?

Continue escrevendo **testes determinísticos clássicos** para qualquer interação do sistema que não se comunique com o modelo.

## Modos de falha

No WebMCP, a **ferramenta em si pode falhar**, e os **agentes podem não conseguir usá-la como esperado**. Exemplo: usuário quer adicionar uma camiseta ao carrinho.

### O agente não seleciona a ferramenta correta / chama a ferramenta errada

*Ex.: o agente pula `addToCart` e vai direto para `checkout`.*

Verifique:
- A `description` da ferramenta é clara, completa e reflete com precisão o que ela faz?
- O `functionName` é intuitivo e descritivo?
- A ferramenta está exposta corretamente ao LLM no estado/contexto atual?
- O schema dessa ferramenta é muito parecido com o de outra, causando ambiguidade nas chamadas?

### O agente chama as ferramentas na ordem errada

*Ex.: o agente chama `checkout` e depois `addToCart`.*

Verifique:
- As descrições das ferramentas se sobrepõem, confundindo o LLM sobre a sequência necessária?
- A saída de uma ferramenta anterior fornece o contexto necessário para a próxima chamada?
- O estado é atualizado corretamente e novas ferramentas são expostas ao LLM conforme esperado?
- O caso de uso ponta a ponta continua correto se certas ferramentas forem chamadas em ordem diferente?
- Você testou a **cadeia de chamadas isoladamente**, forçando as chamadas anteriores para confirmar se o LLM escolhe a próxima etapa correta?

### O agente chama a ferramenta com argumentos incorretos

*Ex.: o agente chama `addToCart`, mas adiciona sapatos em vez de uma camiseta.*

Verifique:
- O `inputSchema` está claramente definido, incluindo **valores de enum** e uma boa `description` para cada propriedade?
- Todos os parâmetros obrigatórios estão marcados e verificados explicitamente?
- A descrição do argumento orienta explicitamente o LLM sobre como **mapear a entrada do usuário** para os dados estruturados esperados (como um ID ou formato específico)?

### A saída da ferramenta está incorreta ou não informa algo

*Ex.: o usuário pede `viewCart`, mas o agente informa o custo total, em vez dos nomes dos produtos e preços individuais.*

Verifique:
- A lógica da ferramenta tem bugs (teste com testes determinísticos)?
- O estado da interface foi atualizado corretamente? O agente recebeu as informações certas sobre o efeito colateral?
- Se a saída for usada pelo LLM para chamadas subsequentes, ela está **formatada claramente para ingestão pelo LLM**?
- A saída é muito detalhada? Contém apenas a **informação essencial mínima** de que o LLM precisa para a próxima ação?

### Falhas genéricas de JavaScript

Uma ferramenta pode falhar de qualquer maneira que o JavaScript falha. Investigue:

- O código processa corretamente todos os possíveis erros e exceções de runtime?
- O erro é informado ao agente e ao modelo de forma adequada?
- As APIs/serviços externos dos quais a ferramenta depende estão funcionando?
- A estrutura de erros é clara o suficiente para o modelo diferenciar entre **problema temporário (nova tentativa)** e **falha crítica**?

## Testar ferramentas de forma isolada

Se um agente não conseguir descobrir qual ferramenta chamar para "Quero uma pizza pequena", ele não terá chance numa jornada complexa. Ao testar ferramentas isoladamente, você pode **otimizar schemas e descrições** antes de rodar uma simulação de navegador.

> **Dica**: você pode acionar uma chamada de ferramenta WebMCP diretamente com `document.modelContext.executeTool(...)`.

### Medir a acurácia das chamadas

Demo de referência: **WebMCP zaMaker** (pizza). Para o usuário dizer "Quero uma pizza pequena", você espera uma resposta do modelo indicando a intenção de fazer a chamada `set_pizza_size` com `{ "size": "Small" }`.

A função **`expectedCall`** define a função e o argumento esperados. Essa abordagem confirma que o agente escolherá a ferramenta correta com base no schema fornecido:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "I'd like a small pizza."
    }
  ],
  "expectedCall": [
    {
      "functionName": "set_pizza_size",
      "arguments": { "size": "Small" }
    }
  ]
}
```

O `expectedCall` é usado para realizar um teste **determinístico baseado em regras**.

### Vincule ferramentas ao ciclo de vida de estado

Como é possível vincular ferramentas ao ciclo de vida de um componente, você precisa testar quando o **estado da aplicação** corresponde ao que o WebMCP espera. Forneça uma **lista completa de ferramentas relevantes** para o estado que você quer avaliar. Por exemplo, ao abrir o zaMaker, o WebMCP expõe `add_topping`, `set_pizza_size` e `set_pizza_style`; inclua todas elas para criar um estado simulado completo:

```json
[
  ...
  {
    "name": "add_topping",
    "description": "Add one or more toppings to the pizza",
    ...
  },
  {
    "name": "set_pizza_size",
    "description": "Set the pizza size directly.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "size": {
          "type": "string",
          "enum": [ "Small", "Medium", "Large", "Extra Large" ],
          "description": "The specific size name."
        }
      }
    }
  },
  {
    "name": "set_pizza_style",
    "description": "Set the style of the pizza (colors/theme)",
    ...
  },
  ...
]
```

> **Observação**: um agente pode ter acesso a outras ferramentas, mas o melhor que você pode fazer é **avaliar as ferramentas que você fornece**.

## Dois tipos de teste

### Testes determinísticos

Como as ferramentas WebMCP são criadas com JavaScript ou como anotações HTML, você pode escrever testes determinísticos para:

- Verificar a **lógica da ferramenta**.
- Confirmar que **dependências** foram chamadas corretamente.
- Confirmar que a **UI foi atualizada** conforme o esperado, além de outros efeitos colaterais intencionais.
- Verificar se as **informações retornadas** correspondem ao valor esperado.
- **Validar os parâmetros** de teste.

Exemplo: se a ferramenta usa uma `SearchComponent`, teste passando uma **simulação** (mock) da `SearchComponent`. Simule o ambiente em que a ferramenta opera para ter os melhores resultados — a mesma técnica de um teste de integração de aplicação.

### Testes probabilísticos

Se você precisa de uma saída do modelo para chamar as próximas ferramentas corretamente, escreva **avaliações (evals)**.

Os usuários podem fazer **consultas diretas** ("Adicione pepperoni à minha pizza") ou **consultas ambíguas** que implicam o uso de uma ferramenta ("Quero todas as carnes na minha pizza" — exige que o modelo entenda que precisa de `add_topping` e quais coberturas contam como carne).

Ao criar conjuntos de dados, inclua **consultas diretas** (testam a execução de base da ferramenta) e **consultas abertas** (testam o raciocínio do modelo e a lógica de seleção de ferramentas).

**Exemplo**: cafeteria que ajuda usuários a reordenar o mesmo café do mês passado. Escreva `OrderHistoryService` (busca pedidos anteriores) e `order_product`. Para testar, envie uma simulação que retorna um ID de produto de café. Você avalia se o modelo entende a intenção, escolhe a ferramenta certa e usa a informação adequada — se ele não chamar `get_order_history`, não saberá qual `item_id` usar em `order_product`.

## Testes de ponta a ponta (e2e)

Testes e2e garantem que usuários e agentes concluam jornadas com sucesso, incluindo **ações multi-etapa na ordem correta**.

**Exemplo**: loja de roupas online. O usuário pergunta: *"Quero comprar uma jaqueta preta e um par de jeans. Pode fornecer um detalhamento dos materiais usados?"*

Uma jornada de agente bem-sucedida:

1. Navegar até a categoria de roupas.
2. Encontrar um dos itens solicitados (a ordem não importa).
3. Encontrar um item específico (`search_clothes`).
4. Receber os detalhes do produto com a lista de materiais (`get_product_details`).
5. Repetir os passos 2–4 para cada item solicitado.

Da etapa 2 em diante, a sequência precisa ser seguida em ordem. Avaliação e2e com `expectedCall` (suporta `ordered`/`unordered`):

```json
{
  "messages": [
    {
      "role": "user",
      "content": "I am looking to buy a black jacket and a pair of jeans.
        Could you provide a breakdown of the materials used ?"
    }
  ],
  "expectedCall": [
    {
      "functionName": "navigate_to_category",
      "arguments": { "category": "clothes" }
    },
    {
      "unordered": [
        {
          "ordered": [
            { "functionName": "search_clothes", "arguments": { "query": "black jacket" } },
            { "functionName": "get_product_details", "arguments": { "productId": "JACKET002" } }
          ]
        },
        {
          "ordered": [
            { "functionName": "search_clothes", "arguments": { "query": "jeans" } },
            { "functionName": "get_product_details", "arguments": { "productId": "JEANS001" } }
          ]
        }
      ]
    }
  ]
}
```

## Avaliar falhas no meio da cadeia

Às vezes um agente precisa chamar várias ferramentas em sequência. O que acontece se uma falhar no meio?

**Exemplo**: usuário pede *"Quero uma pizza pequena de pesto. Use meu código promocional, FreePizza"*. A cadeia: `start_pizza_creator` → `set_pizza_style` → `set_pizza_size` → `start_checkout` → `add_discount_coupon` → `complete_checkout`. Se `add_discount_coupon` falhar mas o processo continuar, o usuário pagou preço cheio.

Para testar `add_discount_coupon`:
1. Execute **manualmente** a sequência de chamadas, **sem interagir com um modelo** (simule o cenário).
2. Coloque o aplicativo no **estado onde você prevê que a ferramenta vai falhar** (aqui, depois de `start_checkout`).
3. Avalie `add_discount_coupon` **isoladamente**.

## Desenvolvimento orientado por avaliação (EDD)

Para construir bons evals, siga o fluxo: **defina o problema → inicialize um valor de referência → crie o sistema de avaliação → avalie e otimize**.

### Defina o problema

Enquadre como um **contrato de API**: tipo de entrada, formato de saída e restrições. Exemplo:

```
Tipo de entrada: rascunho de postagem do blog
Formato da saída: matriz JSON com três títulos de postagens
Restrições: menos de 128 caracteres, usando um tom amigável
```

Colete exemplos de entradas: inclua exemplos **ideais** e entradas **reais e confusas** (emojis, estrutura aninhada, muitos trechos de código).

### Inicialize um valor de referência

Comece com **zero-shot**: instruções claras, formato de saída e um placeholder para a entrada.

### Crie o sistema de avaliação

**Métricas** podem ser deterministas (JSON válido, número correto de itens) ou **subjetivas/qualitativas** (qualidade, utilidade, tom, criatividade). Evite depender de comparativos públicos (MMLU-Pro, SEED-Bench) — não são representativos da sua base de usuários.

**Escolha seus juízes:**

| Juiz | Quando usar |
|---|---|
| **Verificações baseadas em código** | Saídas determinísticas/baseadas em regras (palavras a evitar, contagem de caracteres, validação de JSON). Rápidas, repetíveis. |
| **Feedback humano** | Qualidades subjetivas (tom, clareza, utilidade). Essencial no início; **não escala**. In-app signals (estrelas) são ruidosos. |
| **LLM como juiz** | Escalável para critérios subjetivos, pontuando/criticando saídas com outro modelo. Cuidado: pode **perpetuar e reforçar vieses e lacunas de conhecimento do modelo**. |

Priorize **qualidade sobre quantidade**: para IA generativa, crowdsourcing de anotadores geralmente não tem contexto de domínio.

### Automatize seu pipeline (LLMOps)

- **Controle de versões**: guarde prompts, métricas e entradas de teste como código.
- **Avaliações em lote automatizadas**: workflows (ex.: GitHub Actions) que rodam evals a cada atualização de prompt e geram relatórios de comparação.
- **CI/CD para prompts**: testes determinísticos, pontuações LLM-as-a-judge, bloqueio de merge quando a qualidade cai.
- **Observabilidade em produção**: capture entradas, saídas, erros, latência e uso de tokens; monitore desvios, padrões inesperados, picos de falha.
- **Ingestão de feedback**: transforme problemas recorrentes dos usuários em novos casos de teste.
- **Rastreamento de experimentos**: versões de prompts, configurações de modelo e resultados de avaliação.

### Itere com mudanças pequenas e direcionadas

Comece melhorando a **linguagem do prompt** (instruções mais específicas, esclarecer intenção, remover ambiguidades). **Cuidado com overfitting**: em vez de proibir explicitamente uma frase ("O guia definitivo..."), abstráia o problema e ajuste a instrução de nível superior (enfatize originalidade, variedade ou estilo editorial).

Escolha a técnica perguntando: essa tarefa é melhor resolvida por **analogia** (few-shot), **raciocínio passo a passo** (chain-of-thought) ou **refinamento iterativo** (autoavaliação)?

## Teste o WebMCP

Comece testando evals para ferramentas isoladas e avalie seus próprios sites habilitados com WebMCP usando qualquer agente compatível:

- Baixe as ferramentas de avaliação experimentais no [GitHub](https://github.com/webmachinelearning/webmcp).
- Consulte o curso [Criar avaliações de IA](https://developer.chrome.com/docs/ai/evals).

---

Próximo: **[11 — Cloudflare WebMCP e ecossistema](11-cloudflare-webmcp.md)**.
