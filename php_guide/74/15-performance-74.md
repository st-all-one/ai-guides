Complementar ao documento comum — específico do PHP 7.4.

# Performance (PHP 7.4)

Além do OPcache básico (documentado no baseline), o PHP 7.4 introduziu o
**Pré-carregamento (Preloading)** via OPcache — a principal novidade de
desempenho da versão. Este documento cobre o preloading e ajustes de tuning do
OPcache no 7.4.

> Fora de escopo (8.x): um recurso de compilação de versões 8.x. O preloading NÃO
> é isso; ambos são distintos. Mantenha o foco nas capacidades de cache do OPcache
> disponíveis nesta versão.

## 1. OPcache Preloading (PHP 7.4)

O preloading carrega scripts (funções, classes, interfaces, traits) na memória
do OPcache **quando o motor sobe**. A partir daí, esses símbolos ficam
disponíveis globalmente para todas as requisições, sem `include`/`require` e sem
recompilação. Troca-se conveniência/performance por uso de memória base.

### Requisitos

- OPcache habilitado (`opcache.enable=1`).
- Somente em SAPIs com processo persistente (PHP-FPM, mod_php). É inútil em CLI
  para requisições web (e em geral desnecessário em CLI).
- **Não suportado no Windows.**

### Configuração: `opcache.preload`

No `php.ini`, aponte para um script que será executado **uma vez** na inicialização
do servidor:

```ini
; php.ini
opcache.preload=/var/www/app/preload.php
```

### O arquivo de preload

Qualquer arquivo referenciado por `include`/`require`/`include_once`/
`require_once` (ou `opcache_compile_file()`) dentro desse script é parseado para
a memória persistente. Exemplo que pré-carrega todo o diretório `src` (exceto
testes):

```php
<?php
// preload.php
$directory = new RecursiveDirectoryIterator(__DIR__ . '/src');
$fullTree  = new RecursiveIteratorIterator($directory);
$phpFiles  = new RegexIterator(
    $fullTree,
    '/.+(?<!Test)\.php$/i',
    RecursiveRegexIterator::GET_MATCH
);

foreach ($phpFiles as $file) {
    require_once $file[0];
}
```

### `opcache.preload_user`

Em servidores que sobem como `root` e depois trocam para um usuário sem
privilégio (ou quando o PHP roda como root — não recomendado), defina o usuário
que executará o preload:

```ini
opcache.preload_user=www-data
```

Rodar o preload como `root` **não é permitido por padrão**. Para permitir
explicitamente (não recomendado): `opcache.preload_user=root`.

### `include` vs. `opcache_compile_file()`

| Abordagem | Executa código? | Ordem | Uso típico |
|---|---|---|---|
| `include`/`require` | sim | `a.php` antes de `b.php` que estende `A` | autoloader manual |
| `opcache_compile_file()` | não | qualquer ordem | autoloader PSR-4 (símbolos independentes) |

- `include` executa o arquivo: suporta declarações condicionais (funções dentro
  de `if`). Arquivos aninhados também são pré-carregados. Requer ordem correta
  de dependências.
- `opcache_compile_file()` não executa: aceita qualquer ordem (útil quando `B`
  estende `A` sem importar a ordem de carga). **Não** pré-carrega constantes
  globais (elas não fazem parte do preloading — inclua o arquivo novamente em
  runtime se precisar delas).

### Limitações e notas

- **Exige reinício do processo PHP** para limpar scripts pré-carregados: útil em
  produção, **não** em desenvolvimento (onde `validate_timestamps=1` costuma ser
  usado). Em dev, evite preload.
- Funções, classes, interfaces e traits são pré-carregados; **constantes globais
  não**.
- "Pré-carregar tudo" é a estratégia mais fácil, mas nem sempre a melhor: o
  ganho depende do app. Pré-carregue o core/conhecidos hot paths.
- Se um script posterior incluir um arquivo já pré-carregado, o conteúdo ainda
  executa, mas os símbolos não são redefinidos. `include_once` não impede uma
  segunda inclusão em runtime.

## 2. Tuning do OPcache (válido no 7.4)

Diretivas principais (complementam o baseline):

| Diretiva | Recomendação 7.4 |
|---|---|
| `opcache.enable` | `1` |
| `opcache.memory_consumption` | dimensione ao tamanho do código (ex.: 128–256M) |
| `opcache.interned_strings_buffer` | 8–16M |
| `opcache.max_accelerated_files` | ≥ total de arquivos do projeto |
| `opcache.validate_timestamps` | `0` em produção; `1` em dev |
| `opcache.revalidate_freq` | `0` em dev |
| `opcache.optimization_level` | máscara de otimização (padrão já agressivo) |
| `opcache.preload` | caminho do script de preload (produção) |
| `opcache.preload_user` | usuário do preload |

Em produção, com preload ativo, mantenha `validate_timestamps=0` e limpe o cache
(reinicialize o SAPI, ou `opcache_reset()` em deploy) para aplicar mudanças.

```php
<?php
// Diagnóstico (ferramentas internas):
if (function_exists('opcache_get_status')) {
    $status = opcache_get_status(false);
    // $status['opcache_enabled'], $status['preload_statistics'] (7.4+)
}
```

## 3. Outras melhorias de performance no 7.4

- Compilação/otimização de opcodes aprimoradas (parte do OPcache).
- Tipagem de propriedades e arrow functions não mudam o modelo de performance de
  forma relevante, mas tornam o código mais previsível.
- `WeakReference` evita retenção de memória em caches (vide `13-poo-74.md`).

## 4. Diretrizes

- Use preload **apenas em produção** (processo persistente, não Windows).
- Defina `opcache.preload` + `opcache.preload_user` no `php.ini`.
- Pré-carregue o núcleo do app; não precisa pré-carregar tudo.
- Mantenha `validate_timestamps=0` em produção e reinicie o SAPI no deploy.
- Não confunda preloading com o recurso de compilação de 8.x — aqui só preloading.

## 5. Resumo

- Preloading (7.4): `opcache.preload` aponta para um script executado na
  subida do servidor; `opcache.preload_user` define o usuário.
- `include` (executa, ordenado) vs `opcache_compile_file()` (não executa, qualquer
  ordem); constantes globais não são pré-carregadas.
- Produção only; exige reinício do processo; não suportado no Windows; não é um
  recurso de versões 8.x.
