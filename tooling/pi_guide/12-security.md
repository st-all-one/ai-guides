# Seguranca e Containerizacao

## Seguranca

### Project Trust

Project trust controla se PI carrega configuracoes, recursos, pacotes e extensoes locais. Nao e sandbox e nao restringe o que o modelo pode pedir as tools.

Recursos que exigem trust:
- `.pi/settings.json`
- `.pi/extensions`, `.pi/skills`, `.pi/prompts`, `.pi/themes`
- `.pi/SYSTEM.md` ou `.pi/APPEND_SYSTEM.md`
- `.agents/skills` no cwd ou diretorios ancestrais

### Sem Sandbox Built-in

PI nao inclui sandbox. Ferramentas built-in leem, escrevem, editam arquivos e executam comandos shell com permissoes do processo PI. Extensoes sao modulos TypeScript que rodam com as mesmas permissoes.

Isso e intencional. PI e projetado para operar em arquivos fonte locais, invocar toolchains de projetos e integrar com ambiente de desenvolvimento existente.

### Para Trabalho com Confianca Limitada

Para repositorios nao confiaveis, codigo gerado nao monitorado, ou automatizacao sem supervisao:

1. **Container**: Execute PI dentro de container/VM
2. **Gondolin**: Roteamento de tools para micro-VM
3. **Montagem read-only**: Use montagens somente-leitura
4. **Credenciais minimas**: Passe apenas API keys necessarias
5. **Restricao de rede**: Restringe acesso quando nao necessario
6. **Review**: Revise diffs antes de copiar para sistemas confiaveis

## Containerizacao

### Padroes Disponiveis

| Padrao | O que isola | Melhor para |
|--------|-------------|-------------|
| Gondolin | Tools built-in e `!` commands | Micro-VM local mantendo auth no host |
| Docker | Processo PI inteiro | Isolamento local simples |
| OpenShell | Processo PI inteiro | Sandbox gerenciado local/remoto |

### Gondolin

Micro-VM Linux local. Monta o cwd do host em `/workspace` na VM e sobrescreve todas tools built-in.

```bash
# Setup
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts

# Uso
cd /path/to/project
pi -e ~/.pi/agent/extensions/gondolin
```

Requisitos: Node.js >= 23.6.0, QEMU.

### Docker

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

```bash
docker build -t pi-sandbox -f Dockerfile.pi .

docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

- `-v "$PWD:/workspace"`: Monta workspace (leitura e escrita no host)
- `-v pi-agent-home:/root/.pi/agent`: Volume nomeado para settings/sessoes locais
- Nao monte `~/.pi/agent` do host se nao quiser expor auth e sessoes

### OpenShell

Sandbox gerenciado com politicas de filesystem, processo, rede, credenciais e inferencia.

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
openshell sandbox create --name pi-sandbox --from pi -- pi
```

Providers OpenShell podem manter API keys fora do sandbox. Configure PI para usar endpoint OpenAI/Anthropic-compativel quando inference routing estiver configurado.

## Reportar Questoes de Seguranca

Siga o [Security Policy](https://github.com/earendil-works/pi-mono/blob/main/SECURITY.md). Nao abra issue publica para reportes sensiveis.
