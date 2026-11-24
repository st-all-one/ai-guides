# MANIFEST — samples verbatim

Cada arquivo abaixo é uma cópia **byte a byte** da fonte indicada. Não edite os samples:
a integridade é verificada por `verify.py` via `cmp` implícito (bytes) e SHA-256 em
`hashes.txt`. Nomes com prefixo `samples-` evitam colisão de basename entre o skeleton e
a documentação; `doc-` identifica páginas oficiais da branch `13.x`.

| Sample | Origem | Por que é crítico |
|---|---|---|
| `samples-bootstrap-app.php` | `laravel/laravel@13.x:bootstrap/app.php` | Configuração real de `withRouting`/`withMiddleware`/`withExceptions` no skeleton 13 |
| `samples-composer.json` | `laravel/laravel@13.x:composer.json` | Restrições reais (`php ^8.3`, `framework ^13.17`, PHPUnit 12, `laravel/pao`) |
| `samples-config-cache.php` | `laravel/laravel@13.x:config/cache.php` | `serializable_classes => false` — endurecimento contra gadget chains |
| `samples-config-session.php` | `laravel/laravel@13.x:config/session.php` | `serialization => json` — invalida sessões PHP ao migrar |
| `samples-config-logging.php` | `laravel/laravel@13.x:config/logging.php` | Canais/stacks oficiais do skeleton 13 |
| `samples-config-queue.php` | `laravel/laravel@13.x:config/queue.php` | Conexões de fila e configuração padrão |
| `samples-config-database.php` | `laravel/laravel@13.x:config/database.php` | Drivers e parâmetros padrão |
| `samples-config-app.php` | `laravel/laravel@13.x:config/app.php` | Providers, aliases, locale, ciphers |
| `samples-env.example` | `laravel/laravel@13.x:.env.example` | Variáveis padrão do ambiente 13 |
| `samples-user-model.php` | `laravel/laravel@13.x:app/Models/User.php` | Modelo base com casts/fills |
| `samples-routes-console.php` | `laravel/laravel@13.x:routes/console.php` | Scheduling/comandos sem `Console/Kernel.php` |
| `samples-public-index.php` | `laravel/laravel@13.x:public/index.php` | Ponto de entrada HTTP real |
| `samples-phpunit.xml` | `laravel/laravel@13.x:phpunit.xml` | Configuração de testes do skeleton 13 |
| `doc-upgrade-13.md` | `https://laravel.com/framework/docs/13.x/upgrade` | Todas as quebras 12→13 com likelihood |
| `doc-releases-13.md` | `https://laravel.com/framework/docs/13.x/releases` | Política de suporte e recursos novos do 13 |
| `doc-*.md` (demais) | `laravel/docs@13.x:<pagina>.md` via `raw.githubusercontent.com` | Documentação oficial de cada subsistema citado no dossiê |

## Contrato de citação

- Fato pontual: `samples/arquivo.ext:linha` ou `samples/arquivo.ext:ini-fim` imediatamente
  **acima** do bloco de código, ou em prosa.
- Fato de arquivo inteiro: só o caminho do sample.
- O que não foi lido: marked `não verificado` — nunca afirmado como fato.
- Cálculo próprio: cabeçalho do bloco contém a palavra `derivado` sem linha em branco
  entre cabeçalho e cerca.
- Todo sample listado acima é citado em pelo menos um capítulo; todo trecho inline é
  literal (linhas vazias removidas dos dois lados antes da comparação).
