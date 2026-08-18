# Pacotes PI

Pacotes PI agrupam extensoes, skills, prompts e temas para compartilhar via npm ou git.

> **Seguranca:** Pacotes PI rodam com acesso total ao sistema. Extensoes executam codigo arbitrario, skills podem instruir o agente a qualquer acao. Revise o codigo fonte antes de instalar pacotes de terceiros.

## Gerenciamento

```bash
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install https://github.com/user/repo
pi install /absolute/path/to/package
pi install ./relative/path/to/package

pi remove npm:@foo/bar
pi list
pi update              # Atualizar PI apenas
pi update --all        # Atualizar PI + packages
pi update --extensions # Atualizar packages apenas
pi update --models     # Refresh catalogs de modelos
pi config              # Habilitar/desabilitar recursos
```

Por default, `install` e `remove` escrevem em settings globais. Use `-l` para settings de projeto.

Para testar sem instalar:
```bash
pi -e npm:@foo/bar
pi -e git:github.com/user/repo
```

## Fontes

### npm
```
npm:@scope/pkg@1.2.3
npm:pkg
```

- Versoes fixadas sao puladas por updates
- Instalacoes user ficam em `~/.pi/agent/npm/`
- Instalacoes project ficam em `.pi/npm/`

### git
```
git:github.com/user/repo@v1
git:git@github.com:user/repo@v1
https://github.com/user/repo@v1
ssh://git@github.com/user/repo@v1
```

- Refs fixadas (tags ou commits)
- Clonado para `~/.pi/agent/git/<host>/<path>` (global) ou `.pi/git/<host>/<path>` (projeto)
- SSH usa chaves SSH configuradas

### Caminhos Locais
```
/absolute/path/to/package
./relative/path/to/package
```

## Criando um Pacote PI

Adicione manifest `pi` no `package.json`:

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

### Estrutura por Convencao

Sem manifest `pi`, PI auto-descobre:
- `extensions/` - arquivos `.ts` e `.js`
- `skills/` - recursivo寻找 `SKILL.md`
- `prompts/` - arquivos `.md`
- `themes/` - arquivos `.json`

### Metadados de Galeria

```json
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "video": "https://example.com/demo.mp4",
    "image": "https://example.com/screenshot.png"
  }
}
```

## Dependencias

- Dependencias runtime ficam em `dependencies`
- Pacotes core do PI ficam em `peerDependencies` com `"*"`: `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`
- Outros pacotes PI devem ser bundled em `dependencies` + `bundledDependencies`

```json
{
  "dependencies": { "shitty-extensions": "^1.0.1" },
  "bundledDependencies": ["shitty-extensions"],
  "pi": {
    "extensions": ["extensions", "node_modules/shitty-extensions/extensions"]
  }
}
```

## Filtragem de Pacotes

```json
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"],
      "themes": ["+themes/legacy.json"]
    }
  ]
}
```

- `!pattern` exclui matches
- `+path` force-inclui caminho exato
- `-path` force-exclui caminho exato

## Habilitar/Desabilitar Recursos

Use `pi config` para habilitar/desabilitar extensoes, skills, prompts e temas de pacotes instalados. Comeca em settings globais; pressione Tab para alternar para projeto.

## Escopo e Deduplicacao

Se o mesmo pacote aparece em global e projeto, o projeto vence (exceto com `autoload: false`, que aplica como delta sobre global).
