# Variaveis de Ambiente e Referencia

## Marcador de Processo

Variaveis definidas pelo CLI/RPC e herdadas por processos filhos:

| Variavel | Descricao |
|----------|-----------|
| `AI_AGENT=pi` | Marcador generico para identificar PI |
| `PI_CODING_AGENT=true` | Especifico do PI |

## Ambiente da Bash Tool

Comandos executados pela bash tool recebem:

| Variavel | Descricao |
|----------|-----------|
| `PI_SESSION_ID` | ID da sessao atual |
| `PI_SESSION_FILE` | Caminho absoluto do arquivo JSONL (unset para efemeros) |
| `PI_PROVIDER` | Provider selecionado |
| `PI_MODEL` | Modelo selecionado |
| `PI_REASONING_LEVEL` | Nivel de reasoning efetivo: off, minimal, low, medium, high, xhigh, max |

Valores sao resolvidos no inicio de cada comando. Trocar modelo afeta o proximo bash command.

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

**Nao injetados** em comandos `!` ou `!!` do usuario.

## Configuracao do Processo PI

| Variavel | Descricao |
|----------|-----------|
| `PI_CODING_AGENT_DIR` | Override do diretorio de config (default `~/.pi/agent`) |
| `PI_CODING_AGENT_SESSION_DIR` | Override de armazenamento de sessoes |
| `PI_PACKAGE_DIR` | Override do diretorio de pacotes (util para Nix/Guix) |
| `PI_OFFLINE` | Desabilita operacoes de rede na inicializacao |
| `PI_SKIP_VERSION_CHECK` | Desabilita verificacao de versao |
| `PI_TELEMETRY` | Override de telemetria: `1`/`true`/`yes` ou `0`/`false`/`no` |
| `PI_CACHE_RETENTION` | `long` para cache extendido de providers |
| `PI_SHARE_VIEWER_URL` | Override da URL base do `/share` |
| `PI_HARDWARE_CURSOR` | `1` para mostrar cursor de hardware |
| `PI_TUI_ESC_TIMEOUT` | Timeout apos ESC solitario (ms). Default: 100 (SSH), 10 (outros) |
| `VISUAL`, `EDITOR` | Fallback do editor externo |
| `HTTP_PROXY`, `HTTPS_PROXY` | Proxy HTTP de saida |

## Variaveis de Provider

| Provider | Variavel |
|----------|----------|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Hugging Face | `HF_TOKEN` |
| Amazon Bedrock | `AWS_BEARER_TOKEN_BEDROCK` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` |
| Cloudflare AI Gateway | `CLOUDFLARE_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |

## llama.cpp

| Variavel | Descricao |
|----------|-----------|
| `LLAMA_BASE_URL` | URL do router (default `http://127.0.0.1:8080`) |
| `LLAMA_API_KEY` | API key opcional do router |

## Azure OpenAI

| Variavel | Descricao |
|----------|-----------|
| `AZURE_OPENAI_API_KEY` | Chave de API |
| `AZURE_OPENAI_BASE_URL` | URL base do recurso |
| `AZURE_OPENAI_RESOURCE_NAME` | Nome do recurso (alternativa a base URL) |
| `AZURE_OPENAI_API_VERSION` | Versao da API |
| `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` | Mapeamento de modelo para deployment |

## Amazon Bedrock

| Variavel | Descricao |
|----------|-----------|
| `AWS_PROFILE` | Perfil AWS |
| `AWS_ACCESS_KEY_ID` | Chave de acesso IAM |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta IAM |
| `AWS_BEARER_TOKEN_BEDROCK` | Token bearer |
| `AWS_REGION` | Regiao (default: us-east-1) |
| `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` | URL de proxy Bedrock |
| `AWS_BEDROCK_SKIP_AUTH` | `1` para pular auth no proxy |
| `AWS_BEDROCK_FORCE_HTTP1` | `1` para forcar HTTP/1.1 |
| `AWS_BEDROCK_FORCE_CACHE` | `1` para forcar cache em application inference profiles |

## Google Vertex AI

| Variavel | Descricao |
|----------|-----------|
| `GOOGLE_CLOUD_PROJECT` | ID do projeto |
| `GOOGLE_CLOUD_LOCATION` | Regiao |
| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho para service account key |

## Cloudflare

| Variavel | Descricao |
|----------|-----------|
| `CLOUDFLARE_API_KEY` | Chave de API |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta |
| `CLOUDFLARE_GATEWAY_ID` | ID do gateway |

## Git (para CI)

| Variavel | Descricao |
|----------|-----------|
| `GIT_TERMINAL_PROMPT=0` | Desabilitar prompts de credencial |
| `GIT_SSH_COMMAND` | Comando SSH customizado |

## Referencia Completa

### CLI Reference

```bash
pi [opcoes] [@arquivos...] [mensagens...]
```

### Modos

| Flag | Descricao |
|------|-----------|
| default | Modo interativo |
| `-p`, `--print` | Imprimir resposta e sair |
| `--mode json` | Eventos JSON lines |
| `--mode rpc` | RPC sobre stdin/stdout |
| `--export <in> [out]` | Exportar sessao para HTML |

### Package Commands

```bash
pi install <fonte> [-l]     # Instalar pacote
pi remove <fonte> [-l]      # Remover pacote
pi update [fonte|self|pi]   # Atualizar
pi update --all             # Atualizar tudo
pi update --extensions      # Atualizar packages
pi update --models          # Refresh catalogs
pi list                     # Listar pacotes
pi config                   # Habilitar/desabilitar recursos
```
