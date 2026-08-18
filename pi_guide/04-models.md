# Modelos Customizados

Adicione providers e modelos customizados (Ollama, vLLM, LM Studio, proxies) via `~/.pi/agent/models.json`.

## Exemplo Minimal

Para modelos locais, apenas `id` e necessario:

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

`apiKey` e um placeholder (Ollama ignora). PI trata modelos como requerendo auth. Solucoes:
1. Manter valor dummy
2. Salvar key com `/login`
3. Passar `--api-key` ao selecionar

Alguns servidores OpenAI-compatíveis nao entendem o role `developer`. Para esses:

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        {
          "id": "gpt-oss:20b",
          "reasoning": true
        }
      ]
    }
  }
}
```

## Exemplo Completo

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        {
          "id": "llama3.1:8b",
          "name": "Llama 3.1 8B (Local)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 128000,
          "maxTokens": 32000,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

O arquivo recarrega ao abrir `/model`. Edite durante a sessao sem reiniciar.

## APIs Suportadas

| API | Descricao |
|-----|-----------|
| `openai-completions` | OpenAI Chat Completions (mais compativel) |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic Messages API |
| `google-generative-ai` | Google Generative AI |

## Configuracao do Provider

| Campo | Descricao |
|-------|-----------|
| `baseUrl` | URL do endpoint da API |
| `api` | Tipo da API |
| `apiKey` | Chave de API (resolucao de valor suportada) |
| `headers` | Headers customizados |
| `authHeader` | Se true, adiciona `Authorization: Bearer <apiKey>` |
| `models` | Array de definicoes de modelo |
| `modelOverrides` | Overrides por modelo para modelos built-in |

## Configuracao do Modelo

| Campo | Obrigatorio | Default | Descricao |
|-------|-------------|---------|-----------|
| `id` | Sim | - | Identificador do modelo |
| `name` | Nao | `id` | Label legivel |
| `reasoning` | Nao | `false` | Suporta extended thinking |
| `input` | Nao | `["text"]` | Tipos de entrada: `["text"]` ou `["text", "image"]` |
| `contextWindow` | Nao | `128000` | Tamanho do context window |
| `maxTokens` | Nao | `16384` | Maximo de tokens de saida |
| `samplingParams` | Nao | - | Parametros de sampling mergeados no request body |
| `cost` | Nao | zeros | Taxas por milhao de tokens |
| `compat` | Nao | provider `compat` | Overrides de compatibilidade |

## Exemplo Google AI Studio

```json
{
  "providers": {
    "my-google": {
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
      "api": "google-generative-ai",
      "apiKey": "$GEMINI_API_KEY",
      "models": [
        {
          "id": "gemma-4-31b-it",
          "name": "Gemma 4 31B",
          "input": ["text", "image"],
          "contextWindow": 262144,
          "reasoning": true
        }
      ]
    }
  }
}
```

## thinkingLevelMap

Mapeie niveis de thinking do PI para valores do provider:

```json
{
  "id": "deepseek-v4-pro",
  "reasoning": true,
  "thinkingLevelMap": {
    "minimal": null,
    "low": null,
    "medium": null,
    "high": "high",
    "xhigh": null,
    "max": "max"
  }
}
```

Valores: string (envia ao provider), `null` (nivel nao suportado).

## Sampling Parameters

`samplingParams` e um objeto mergeado verbatim no request body. Apenas APIs OpenAI-compatíveis aplicam:

```json
{
  "id": "deepseek-v4-flash",
  "samplingParams": {
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 0,
    "min_p": 0.0
  }
}
```

## Sobrescrevendo Providers Built-in

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://meu-proxy.example.com/v1"
    }
  }
}
```

Todos os modelos Anthropic continuam disponiveis. Modelos customizados sao mergeados por `id`:

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://meu-proxy.example.com/v1",
      "apiKey": "$ANTHROPIC_API_KEY",
      "models": [
        {
          "id": "claude-opus-4-7",
          "reasoning": true,
          "input": ["text", "image"]
        }
      ]
    }
  }
}
```

## modelOverrides

Customize modelos built-in sem redefinir a lista completa:

```json
{
  "providers": {
    "openrouter": {
      "modelOverrides": {
        "anthropic/claude-sonnet-4": {
          "name": "Claude Sonnet 4 (Bedrock Route)",
          "compat": {
            "openRouterRouting": {
              "only": ["amazon-bedrock"]
            }
          }
        }
      }
    }
  }
}
```

## Compatibilidade OpenAI

Para providers com compatibilidade parcial:

```json
{
  "providers": {
    "local-llm": {
      "baseUrl": "http://localhost:8080/v1",
      "api": "openai-completions",
      "compat": {
        "supportsStore": true,
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false,
        "supportsUsageInStreaming": false,
        "maxTokensField": "max_tokens",
        "thinkingFormat": "deepseek"
      },
      "models": [...]
    }
  }
}
```

`thinkingFormat` suporta: `reasoning_effort`, `openrouter`, `deepseek`, `together`, `baseten`, `zai`, `qwen`, `chat-template`, `qwen-chat-template`.

## Compatibilidade Anthropic

Para providers Anthropic-compatíveis:

```json
{
  "providers": {
    "anthropic-proxy": {
      "baseUrl": "https://proxy.example.com",
      "api": "anthropic-messages",
      "compat": {
        "supportsEagerToolInputStreaming": false,
        "supportsLongCacheRetention": true,
        "forceAdaptiveThinking": true,
        "allowEmptySignature": true,
        "supportsStrictTools": true
      }
    }
  }
}
```

## Exemplo OpenRouter

```json
{
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "$OPENROUTER_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "openrouter/anthropic/claude-3.5-sonnet",
          "name": "OpenRouter Claude 3.5 Sonnet",
          "compat": {
            "openRouterRouting": {
              "allow_fallbacks": true,
              "order": ["anthropic", "amazon-bedrock", "google-vertex"],
              "only": ["anthropic", "amazon-bedrock"],
              "data_collection": "deny"
            }
          }
        }
      ]
    }
  }
}
```
