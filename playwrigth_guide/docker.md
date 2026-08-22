---
id: docker
title: "Docker"
---

## Introdução

O [Dockerfile.noble] pode ser usado para rodar scripts do Playwright em ambiente Docker. Essa imagem inclui os [navegadores do Playwright](./browsers.md#instalar-navegadores) e as [dependências de sistema dos navegadores](./browsers.md#instalar-dependências-do-sistema). O pacote do Playwright **não** está incluído na imagem e deve ser instalado separadamente.

:::info
Esta imagem Docker é destinada apenas para testes e desenvolvimento. Não é recomendado usar esta imagem para visitar sites não confiáveis.
:::

## Uso

A imagem Docker é publicada no [Microsoft Artifact Registry].

### Puxar a imagem (pull)

<Tabs groupId="js-package-manager" defaultValue="npm" values={[{label: 'npm', value: 'npm'}, {label: 'yarn', value: 'yarn'}, {label: 'pnpm', value: 'pnpm'}]}>
<TabItem value="npm">

```bash
docker pull mcr.microsoft.com/playwright:v%%VERSION%%-noble
```

</TabItem>
<TabItem value="yarn">

```bash
docker pull mcr.microsoft.com/playwright:v%%VERSION%%-noble
```

</TabItem>
<TabItem value="pnpm">

```bash
docker pull mcr.microsoft.com/playwright:v%%VERSION%%-noble
```

</TabItem>
</Tabs>

### Rodar a imagem (run)

Por padrão, a imagem Docker usa o usuário `root` para rodar os navegadores. Isso desabilita o sandbox do Chromium, que não está disponível com root. Se você roda código confiável (ex.: testes end-to-end) e quer evitar o trabalho de gerenciar um usuário separado, o root pode ser aceitável. Para web scraping ou crawling, recomendamos criar um usuário separado dentro do container e usar o perfil seccomp.

#### Testes end-to-end

Em sites confiáveis, você pode evitar criar um usuário separado e usar root, já que confia no código que rodará nos navegadores.

```bash
docker run -it --rm --ipc=host mcr.microsoft.com/playwright:v%%VERSION%%-noble /bin/bash
```

#### Crawling e scraping

Em sites não confiáveis, recomenda-se usar um usuário separado para lançar os navegadores em combinação com o perfil seccomp. Dentro do container ou se você usa a imagem como base, use `adduser`.

```bash
docker run -it --rm --ipc=host --user pwuser --security-opt seccomp=seccomp_profile.json mcr.microsoft.com/playwright:v%%VERSION%%-noble /bin/bash
```

[`seccomp_profile.json`](https://github.com/microsoft/playwright/blob/main/utils/docker/seccomp_profile.json) é necessário para rodar o Chromium com sandbox. É um [perfil seccomp padrão do Docker](https://github.com/docker/engine/blob/d0d99b04cf6e00ed3fc27e81fc3d94e7eda70af3/profiles/seccomp/default.json) com permissões extras de clonagem de user namespace:

```json
{
  "comment": "Allow create user namespaces",
  "names": [
    "clone",
    "setns",
    "unshare"
  ],
  "action": "SCMP_ACT_ALLOW",
  "args": [],
  "includes": {},
  "excludes": {}
}
```

### Configuração Docker recomendada

Ao rodar o Playwright em Docker, recomenda-se:

1. **Usar o flag [`--init`](https://docs.docker.com/reference/cli/docker/container/run/#init)** para evitar tratamento especial para processos com PID=1. Essa é uma causa comum de processos zumbi.
2. **Usar `--ipc=host`** quando usar Chromium. Sem isso, o Chromium pode ficar sem memória e travar. Veja mais em [Docker docs](https://docs.docker.com/reference/cli/docker/container/run/#ipc).
3. **Se vir erros estranhos ao lançar o Chromium**, tente rodar o container com `docker run --cap-add=SYS_ADMIN` durante o desenvolvimento local.

### Uso em CI

Veja nossos [guias de Continuous Integration](./ci.md) para configs de exemplo.

### Conexão remota (Remote Connection)

Você pode rodar o Playwright Server em Docker enquanto mantém seus testes rodando no host ou em outra máquina. Isso é útil para rodar testes em distribuições Linux não suportadas ou em cenários de execução remota.

#### Rodando o Playwright Server

```bash
docker run -p 3000:3000 --rm --init -it --workdir /home/pwuser --user pwuser mcr.microsoft.com/playwright:v%%VERSION%%-noble /bin/sh -c "npx -y playwright@%%VERSION%% run-server --port 3000 --host 0.0.0.0"
```

#### Conectando ao Server

Existem duas formas de conectar ao server remoto do Playwright:

1. Usando variável de ambiente com `@playwright/test`:

```bash
PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3000/ npx playwright test
```

2. Usando a API [`method: BrowserType.connect`] para outras aplicações:

```js
const { chromium } = require('playwright');
const browser = await chromium.connect('ws://127.0.0.1:3000/');
```

#### Configuração de rede

Se precisar acessar servidores locais de dentro do container Docker:

```bash
docker run --add-host=hostmachine:host-gateway -p 3000:3000 --rm --init -it --workdir /home/pwuser --user pwuser mcr.microsoft.com/playwright:v%%VERSION%%-noble /bin/sh -c "npx -y playwright@%%VERSION%% run-server --port 3000 --host 0.0.0.0"
```

Isso faz `hostmachine` apontar para o localhost do host. Seus testes devem usar `hostmachine` em vez de `localhost` ao acessar servidores locais.

:::note
Ao rodar testes remotamente, garanta que a versão do Playwright nos testes corresponda à versão rodando no container Docker.
:::

### Conectando via noVNC e GitHub Codespaces

Para ambientes Docker e GitHub Codespaces, você pode visualizar e gerar testes usando o viewer `noVNC` embutido na imagem Docker. Para que o webviewer VNC fique acessível fora do container, habilite o feature `desktop-lite` e especifique o `webPort` no seu `.devcontainer/devcontainer.json`:

```json
{
  "image": "mcr.microsoft.com/playwright:v1.57.0",
  "forwardPorts": [6080],
  "features": {
    "desktop-lite": {
      "webPort": "6080"
    }
  }
}
```

Uma vez habilitado, abra a porta especificada numa nova aba do navegador e você terá acesso ao viewer `noVNC`. Isso permite gravar testes, escolher seletores e usar o codegen diretamente no container.

## Tags de imagem

Veja [todas as tags de imagem disponíveis].

Publicamos imagens com as seguintes tags:
- `:v%%VERSION%%` - imagem Docker do release v%%VERSION%% baseada no Ubuntu 24.04 LTS (Noble Numbat).
- `:v%%VERSION%%-noble` - imagem Docker do release v%%VERSION%% baseada no Ubuntu 24.04 LTS (Noble Numbat).
- `:v%%VERSION%%-jammy` - imagem Docker do release v%%VERSION%% baseada no Ubuntu 22.04 LTS (Jammy Jellyfish).
- `:v%%VERSION%%-resolute` - imagem Docker do release v%%VERSION%% baseada no Ubuntu 26.04 LTS (Resolute Raccoon).

:::note
Recomenda-se sempre fixar (pin) sua imagem Docker numa versão específica. Se a versão do Playwright na imagem Docker não corresponder à versão do seu projeto/testes, o Playwright será incapaz de localizar os executáveis dos navegadores.
:::

### Imagens base

Publicamos imagens baseadas nas seguintes versões do [Ubuntu](https://hub.docker.com/_/ubuntu):
- **Ubuntu 26.04 LTS** (Resolute Raccoon), tags incluem `resolute`
- **Ubuntu 24.04 LTS** (Noble Numbat), tags incluem `noble`
- **Ubuntu 22.04 LTS** (Jammy Jellyfish), tags incluem `jammy`

#### Alpine

Builds de navegador para Firefox e WebKit são feitos para a biblioteca [glibc](https://en.wikipedia.org/wiki/Glibc). Alpine Linux e outras distribuições baseadas na biblioteca padrão [musl](https://en.wikipedia.org/wiki/Musl) não são suportadas.

## Construir sua própria imagem

Para rodar o Playwright dentro do Docker, você precisa ter Node.js, [navegadores do Playwright](./browsers.md#instalar-navegadores) e [dependências de sistema dos navegadores](./browsers.md#instalar-dependências-do-sistema) instalados. Veja o Dockerfile a seguir:

```Dockerfile
FROM node:20-bookworm

RUN npx -y playwright@%%VERSION%% install --with-deps
```

### Boas práticas

- Sempre fixe a versão da imagem (`v%%VERSION%%-noble`) para evitar dessincronização com os binários de navegador.
- Use `--init` e `--ipc=host` conforme a configuração recomendada.
- Para testes confiáveis, prefira rodar como `pwuser` (não root) sempre que possível.

### Quando usar

- **CI Linux**: a imagem oficial já traz navegadores + dependências, eliminando o passo `install --with-deps`.
- **Ambientes efêmeros / containers**: garante consistência entre máquinas.
- **Execução remota**: combine com `run-server` e `PW_TEST_CONNECT_WS_ENDPOINT`.

### Armadilhas comuns

- Usar imagem com versão diferente da do `@playwright/test` no projeto → navegadores não encontrados.
- Esquecer `--ipc=host` → Chromium sem memória e crash.
- Rodar sites não confiáveis como root sem seccomp → risco de segurança.
- Tentar usar Alpine → não suportado para Firefox/WebKit.
