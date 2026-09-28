# 24 — AI Toolkit, GenUI e ferramentas de IA

O Flutter tem duas frentes de IA: (a) **usar IA para escrever código** (ferramentas de assistente) e (b) **adicionar IA ao seu app** (AI Toolkit, GenUI). Ambas evoluem rápido; confirme a versão atual no pub.dev.

## 1. Ferramentas de IA para desenvolver (ecossistema)

Seis componentes complementares:

| Componente | Função |
|---|---|
| **Agent skills** | Blueprints de tarefas (layouts responsivos, testes) carregados sob demanda |
| **Dart/Flutter MCP server** | Diagnósticos em tempo real, resolução de símbolos, introspecção em runtime |
| **Developer Knowledge MCP server** | Busca na documentação oficial (docs.flutter.dev, dart.dev, API) |
| **Package skills** | Skills publicadas dentro de pacotes do pub.dev |
| **Specialized agents** | Personas focadas (ex.: agente de acessibilidade) |
| **Agent rules** | Regras persistentes no contexto (ex.: acionar hot reload ao editar widgets) |

### Progressive disclosure

Skills economizam contexto: na **descoberta**, o assistente lê só metadados (nome/descrição) de `.agents/skills`; na **execução**, carrega `SKILL.md` e scripts quando relevante.

### MCP servers

- **Dart/Flutter MCP**: análise estática, símbolos, introspecção de app em execução, gestão de pacotes, testes e formatação.
- **Developer Knowledge MCP**: acesso a guias, notas de migração e referência de API atualizados.

### Skills e agentes

- Repositórios oficiais: `flutter/agent-plugins` (Flutter) e `dart-lang/skills` (Dart).
- Instale skills de pacotes: `dart run skills@ get`.
- **Agente de acessibilidade** (`@flutter_a11y_agent`): inspeciona labels semânticos, valida alvos de toque ≥48×48, contraste e foco, e sugere correções idiomáticas.
- **Agent rules** estabelecem convenções do projeto.

## 2. Flutter AI Toolkit (chat no app)

Conjunto de widgets de chat. Organizado em torno de uma **API abstrata de provedor de LLM**, facilitando trocar o provedor. Por padrão, suporta **Firebase AI Logic** (Gemini).

### Recursos

- Chat multiturno, respostas em **streaming**, rich text.
- Entrada por **voz**, anexos multimídia.
- **Function calling** (tool calls).
- Estilização customizada, widgets de resposta customizados.
- Serialização/deserialização da conversa.
- Provedor de LLM plugável; suporta Android, iOS, web e macOS.

### Começando

```yaml
dependencies:
  flutter_ai_toolkit: ^latest
  firebase_ai: ^latest
  firebase_core: ^latest
```

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const App());
}

class ChatPage extends StatelessWidget {
  const ChatPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Chat')),
        body: LlmChatView(provider: FirebaseProvider(...)),
      );
}
```

Configure Firebase com `flutterfire configure`. Use o endpoint Gemini Developer API para prototipar e Firebase AI Logic em produção (chaves ficam fora do código).

### Integração de recursos

- **Welcome messages** e **suggested prompts**.
- **LLM instructions** (system prompt) para direcionar respostas.
- **Function calling** para ações no app.
- Desabilitar anexos/áudio; **speech-to-text** customizado.
- Tratamento de **cancel/erro** e gestão de **histórico**.

### Experiência do usuário

- Entrada multilinha, voz e multimídia; zoom de imagem; copiar; editar mensagem.
- Componentes Material e Cupertino.

### Provedores customizados

Implemente a interface simples do provedor para plugar **seu** LLM (`custom-llm-providers.md`), incluindo streaming e tool calls.

## 3. GenUI SDK (UI generativa)

Camada de orquestração que transforma conversa em **UI interativa**: em vez de um bloco de texto, o agente gera (ex.) botões e date pickers a partir de um catálogo de widgets existentes, usando um formato baseado em **JSON**. Estado da UI volta ao agente num loop de alta largura de banda.

> Pacote `genui` em **alpha** — sujeito a mudanças.

### Componentes

| Componente | Papel |
|---|---|
| `Conversation` | Fachada principal; gerencia histórico e orquestra o processo |
| `Catalog` / `CatalogItem` | Conjunto de widgets que a IA pode usar (nome + schema + builder) |
| `DataModel` | Store observável; widgets fazem *binding* e só os dependentes rebuildam |
| `A2uiTransportAdapter` | Converte o stream de texto do LLM em `A2uiMessage` |
| `A2uiMessage` | Comandos: `createSurface`, `surfaceUpdate`, `dataModelUpdate`, `deleteSurface` |
| `SurfaceController` | Processa mensagens, gerencia `DataModel` e estado das surfaces |

### Ciclo

1. Usuário envia prompt → `conversation.sendMessage()`.
2. `Conversation` chama o LLM.
3. LLM responde guiado pelos schemas dos widgets.
4. Stream passa pelo `A2uiTransportAdapter`.
5. `SurfaceController.handleMessage()` atualiza UI/`DataModel`.
6. `Surface` listeners rebuildam.

### Extensões

- **Widgets próprios** no catálogo.
- **Data model e data binding**.
- **Input events**: definir eventos, capturá-los nos widgets, pipeline de processamento e transmissão ao agente.
- **System instructions** para guiar o agente.

## 4. Boas práticas de IA no app

> **Lei de Morgan:** "eventualmente, por amostrar de uma distribuição de probabilidade, a IA falhará no que precisa ser feito."

Construa **guardrails**:

- **Verifique e corrija** dados gerados pela IA (ex.: permita o usuário ajustar o resultado).
- **Prompting** claro, com exemplos e formato esperado.
- **Estrutura de saída**: peça JSON/schema e valide antes de usar.
- **Tool calls** e **agentic loop**: defina ferramentas e iterações com limites.
- **Modo de interação**: escolha entre chat, formulário ou comandos conforme o caso.
- Trate alucinações, timeouts e erros com `Result` e logging (ver `08`/`10`).
- Mantenha chaves de API no servidor (Firebase AI Logic, proxy) — nunca no cliente (ver `12`).
- Cuidado com **privacidade** de dados enviados ao LLM.

## 5. Flutter Bench

Conjunto de **CUJs** (Critical User Journeys) para avaliar/benchmark de assistentes de código em tarefas Flutter. Útil para medir qualidade de geração de código e comparar agentes.

## 6. Checklist

- [ ] Ferramentas de IA configuradas (skills, MCP, rules) no repositório
- [ ] Chaves de IA fora do cliente
- [ ] Provedor de LLM abstraído e trocável
- [ ] Saída da IA validada (schema) antes de renderizar/usar
- [ ] Guardrails: usuário pode verificar/corrigir
- [ ] Tratamento de cancelamento, erro e histórico
- [ ] Acessibilidade do chat (ver `13`)
- [ ] Custo/latência de tokens monitorados
