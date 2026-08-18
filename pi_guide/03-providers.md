# Providers e Autenticacao

## Providers por Assinatura

Use `/login` no modo interativo e selecione o provider:

| Provider | Como configurar |
|----------|----------------|
| **ChatGPT Plus/Pro (Codex)** | `/login` > selecionar |
| **Claude Pro/Max** | `/login` > selecionar |
| **GitHub Copilot** | `/login` > Enter para github.com ou Enterprise Server |
| **xAI (Grok/X)** | `/login xai` > "Use a subscription" |
| **OpenRouter** | `/login openrouter` > "Sign in with OpenRouter" |
| **Radius** | `/login radius` |

### Notas especificas

**GitHub Copilot**: Se receber "model not supported", habilite no VS Code: Copilot Chat > model selector > selecionar modelo > "Enable".

**Claude Pro/Max**: Uso por terceiros retira de [extra usage](https://claude.ai/settings/usage) e e cobrado por token, nao contra limites do plano.

**OpenRouter**: Em maquinas remotas/HEADLESS onde o browser nao alcanca o callback loopback, cole a URL final de redirect (ou o authorization code) no prompt de login.

## Providers por API Key

### Variaveis de Ambiente

| Provider | Variavel | auth.json key |
|----------|----------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic` |
| OpenAI | `OPENAI_API_KEY` | `openai` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek` |
| Google Gemini | `GEMINI_API_KEY` | `google` |
| NVIDIA NIM | `NVIDIA_API_KEY` | `nvidia` |
| Mistral | `MISTRAL_API_KEY` | `mistral` |
| Groq | `GROQ_API_KEY` | `groq` |
| Cerebras | `CEREBRAS_API_KEY` | `cerebras` |
| xAI | `XAI_API_KEY` | `xai` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` |
| Fireworks | `FIREWORKS_API_KEY` | `fireworks` |
| Together AI | `TOGETHER_API_KEY` | `together` |
| Hugging Face | `HF_TOKEN` | `huggingface` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` |
| Cloudflare AI Gateway | `CLOUDFLARE_API_KEY` | `cloudflare-ai-gateway` |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY` | `cloudflare-workers-ai` |

### auth.json com env scoping

```json
{
  "cloudflare-ai-gateway": {
    "type": "api_key",
    "key": "$CLOUDFLARE_API_KEY",
    "env": {
      "CLOUDFLARE_API_KEY": "...",
      "CLOUDFLARE_ACCOUNT_ID": "account-id",
      "CLOUDFLARE_GATEWAY_ID": "gateway-id"
    }
  }
}
```

### Ordem de Resolucao

1. Flag `--api-key` no CLI
2. Entrada em `auth.json`
3. Variavel de ambiente
4. Chaves customizadas de `models.json`

## Cloud Providers

### Azure OpenAI

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://seu-resource.ai.azure.com
# ou
export AZURE_OPENAI_RESOURCE_NAME=seu-resource

# Opcional
export AZURE_OPENAI_API_VERSION=2024-02-01
export AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-4=my-gpt4,gpt-4o=my-gpt4o
```

### Amazon Bedrock

```bash
# Opcao 1: AWS Profile
export AWS_PROFILE=seu-profile

# Opcao 2: IAM Keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# Opcao 3: Bearer Token
export AWS_BEARER_TOKEN_BEDROCK=...

# Opcional (default: us-east-1)
export AWS_REGION=us-west-2

pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

Para application inference profiles:
```bash
export AWS_BEDROCK_FORCE_CACHE=1
```

Para proxy Bedrock:
```bash
export AWS_ENDPOINT_URL_BEDROCK_RUNTIME=https://meu-proxy/bedrock
export AWS_BEDROCK_SKIP_AUTH=1       # se proxy nao precisa auth
export AWS_BEDROCK_FORCE_HTTP1=1     # se proxy so suporta HTTP/1.1
```

### Google Vertex AI

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=seu-projeto
export GOOGLE_CLOUD_LOCATION=us-central1
```

### Cloudflare AI Gateway

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...
pi --provider cloudflare-ai-gateway --model "claude-sonnet-4-5"
```

Modos de autenticacao upstream:
- **Workers AI**: Cloudflare token apenas
- **Unified billing**: Cloudflare token apenas
- **Stored BYOK**: Cloudflare token, provider keys no dashboard
- **Inline BYOK**: Cloudflare token + Authorization header do upstream

### Cloudflare Workers AI

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
pi --provider cloudflare-workers-ai --model "@cf/moonshotai/kimi-k2.6"
```

## llama.cpp

PI suporta o router server do llama.cpp:

```bash
# Iniciar o router
llama-server \
  --models-dir ~/models \
  --no-models-autoload \
  --jinja \
  --host 127.0.0.1 \
  --port 8080 \
  -ngl 999 \
  -c 32768

# Configurar PI
/login llama.cpp
# ou
export LLAMA_BASE_URL=http://127.0.0.1:8080
export LLAMA_API_KEY=opcional

# Gerenciar modelos
/llama    # Baixar/carregar/descarregar modelos
/model    # Selecionar modelo carregado
```

## Providers Customizados

### Via models.json

Adicione Ollama, LM Studio, vLLM ou qualquer provider que fale uma API suportada:

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

### Via extensao

Para providers com OAuth ou APIs customizadas, crie uma extensao. Veja [07-extensions.md](07-extensions.md) para detalhes.
