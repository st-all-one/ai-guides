# Qualidade de Código: Lint, Formatação e Análise Estática — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **como usar e integrar** ao projeto:
> Pint (formatação), análise estática e ganchos de CI/commit.
> Pint é a ferramenta **oficial**; a seção 3 lista o ecossistema (não-oficial) mais usado.

---

## 1. Laravel Pint (lint + fmt oficial)

Pint é o formatador **opinativo** do Laravel (baseado no PHP CS Fixer). Já vem instalado em
apps novos; segue o estilo Laravel sem configuração.

```bash
# instalação (apenas se o app for antigo)
composer require laravel/pint --dev
```

### 1.1 Rodando

```bash
./vendor/bin/pint                     # corrige todo o projeto
./vendor/bin/pint app/Models          # só um diretório
./vendor/bin/pint app/Models/User.php # só um arquivo
./vendor/bin/pint -v                  # mostra detalhes das mudanças
./vendor/bin/pint --parallel          # modo paralelo
./vendor/bin/pint --parallel --max-processes=4

# CI: apenas inspeciona (exit code != 0 se houver erro de estilo)
./vendor/bin/pint --test

# apenas arquivos que diferem de um branch / não commitados
./vendor/bin/pint --diff=main
./vendor/bin/pint --dirty

# corrige e ainda falha se corrigiu algo (útil em CI)
./vendor/bin/pint --repair
```

Integre ao `composer.json`:

```json
{
    "scripts": {
        "lint": "pint --parallel",
        "lint:test": "pint --test",
        "post-update-cmd": ["@php artisan vendor:publish --tag=laravel-assets --ansi --force"]
    }
}
```

### 1.2 Configuração (`pint.json` na raiz)

```json
{
    "preset": "laravel",
    "rules": {
        "simplified_null_return": true,
        "array_indentation": false,
        "new_with_parentheses": {
            "anonymous_class": true,
            "named_class": true
        },
        "Pint/phpdoc_type_annotations_only": true
    },
    "exclude": ["my-specific/folder"],
    "notName": ["*-generated.php"],
    "notPath": ["path/to/excluded-file.php"]
}
```

- **Presets**: `laravel` (padrão), `per`, `psr12`, `symfony`, `empty`.
  `./vendor/bin/pint --preset psr12`
- **Regras**: qualquer regra do PHP CS Fixer + regras `Pint/*` (ex.: 
  `Pint/phpdoc_type_annotations_only`, que mantém só anotações `@param`/`@return`/`@var`).
- Preserve um comentário específico prefixando com `@note`, `@warning` ou `@todo`.

### 1.3 CI (GitHub Actions)

```yaml
# .github/workflows/lint.yml
name: Fix Code Style
on: [push]
jobs:
  lint:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: true
      matrix:
        php: [8.4]
    steps:
      - uses: actions/checkout@v5
      - uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          tools: pint
      - run: pint
      - uses: stefanzweifel/git-auto-commit-action@v6
```

> Em CI, prefira `pint --test` (não altera arquivos) ou `--repair` se quiser corrigir e falhar.

### 1.4 Ganchos de pré-commit

```bash
# .git/hooks/pre-commit (ou via captainhook/husky)
./vendor/bin/pint --dirty
```

---

## 2. `.editorconfig` (alinhar editor ao preset)

```ini
root = true

[*.php]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{json,yml,yaml}]
indent_size = 2
```

---

## 3. Ecossistema (não-oficial, mas comum em produção)

> Estas ferramentas **não** fazem parte do framework; são complementos. Use conforme o projeto.

| Ferramenta | Uso | Comando |
|---|---|---|
| **Larastan** (PHPStan p/ Laravel) | análise estática com tipos do framework | `./vendor/bin/phpstan analyse` / `./vendor/bin/phpstan --memory-limit=2G` |
| **PHPStan** | análise estática genérica (níveis 0–10) | `composer require --dev phpstan/phpstan` |
| **Rector** | refatoração/upgrade automático de código | `./vendor/bin/rector process` |
| **PHP CS Fixer** | base do Pint; use se precisar de regras muito específicas | `./vendor/bin/php-cs-fixer fix` |
| **Laravel IDE Helper** | gera `_ide_helper.php` para autocomplete | `php artisan ide-helper:generate` / `:models` |
| **barryvdh/laravel-debugbar** | inspeção em dev | — |

Integração em `composer.json`:

```json
{
    "scripts": {
        "analyse": "phpstan analyse",
        "refactor": "rector process",
        "check": ["@lint:test", "@analyse"]
    }
}
```

`phpstan.neon` mínimo:

```neon
includes:
    - vendor/larastan/larastan/extension.neon
parameters:
    paths:
        - app
    level: 6
```

`rector.php` mínimo:

```php
use Rector\Config\RectorConfig;
use Rector\Laravel\Set\LaravelSetList;

return RectorConfig::configure()
    ->withPaths([__DIR__.'/app', __DIR__.'/routes'])
    ->withSets([LaravelSetList::LARAVEL_120]);
```

---

## 4. Fluxo recomendado

1. **Local:** `pint --dirty` antes de commitar; PHPStan no editor (integração LSP).
2. **Pré-commit:** Pint + PHPStan nos arquivos alterados.
3. **CI:** `pint --test` + `phpstan analyse --no-progress` + `php artisan test --parallel`.
4. **Deploy:** nada de lint em produção; apenas `composer install --no-dev` e `php artisan optimize`.

```bash
# pipeline de qualidade local
./vendor/bin/pint --test
./vendor/bin/phpstan analyse --no-progress
php artisan test --parallel
```

---

## Resumo de Pontos-Chave

- **Pint** é o formatador oficial: `./vendor/bin/pint` corrige, `--test` só verifica.
- Presets: `laravel` (padrão), `per`, `psr12`, `symfony`, `empty`.
- Configure com `pint.json` (rules/exclude/notName/notPath) e integre ao CI (GitHub Actions).
- `--dirty`/`--diff=main` aceleram no dia a dia e no CI.
- Análise estática (**Larastan/PHPStan**) e **Rector** são complementos valiosos.
- Padronize via `composer scripts` e `.editorconfig`.
