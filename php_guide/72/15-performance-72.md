Complementar ao documento comum — específico do PHP 7.2.

# Performance no PHP 7.2 (além do básico)

Este suplemento cobre otimização disponível no 7.2. Todo o conteúdo é válido em
7.2.

> Escopo: as otimizações abordadas aqui são o OPcache clássico, autoload,
> geradores e GC — todas disponíveis no 7.2.

## 1. OPcache

O OPcache guarda o bytecode compilado em memória compartilhada, eliminando a
recompilação a cada requisição.

### Diretivas relevantes (php.ini / .user.ini)

| Diretiva | Recomendação | Descrição |
|---|---|---|
| `opcache.enable` | `1` | ativa o cache de opcode |
| `opcache.validate_timestamps` | `0` (produção) | não checa mtime; recarrega só com reinício |
| `opcache.revalidate_freq` | `60` | segundos entre checagens se `validate_timestamps=1` |
| `opcache.memory_consumption` | `128`+ | MB de memória para o cache |
| `opcache.max_accelerated_files` | `10000`+ | nº de scripts cacheáveis |
| `opcache.optimization_level` | padrão | nível de otimizações do passo de compilação |

### Verificação

```php
<?php
if (function_exists('opcache_get_status')) {
    $status = opcache_get_status();
    var_dump($status['opcache_enabled']);
    var_dump($status['cache_full']);
}
```

### Invalidação em produção

Para aplicar novo código quando `validate_timestamps=0`, reinicie o pool
(PHP-FPM) ou use:

```php
<?php
if (function_exists('opcache_reset')) {
    opcache_reset(); // limpa todo o cache (cuidado: custo na próxima req)
}
```

### Carga antecipada de arquivos críticos

Você pode incluir arquivos críticos no bootstrap para que fiquem no cache
após o primeiro warm-up:

```php
<?php
foreach (['src/Autoloader.php', 'src/Core.php'] as $f) {
    require_once $f;
}
```

## 2. Autoloading (PSR-4)

Use `spl_autoload_register` (ou Composer). Evita `require` manual e reduz I/O.

```php
<?php
spl_autoload_register(function ($classe) {
    $arquivo = __DIR__ . '/' . str_replace('\\', '/', $classe) . '.php';
    if (file_exists($arquivo)) {
        require $arquivo;
    }
});
```

## 3. Geradores (economia de memória)

Geradores processam itens um a cada vez, sem materializar o array inteiro
(ver `12-programacao-funcional-72.md`). Essencial para grandes volumes.

```php
<?php
function lerLinhas(string $arquivo): Generator {
    $h = fopen($arquivo, 'r');
    while (!feof($h)) {
        yield fgets($h);
    }
    fclose($h);
}

foreach (lerLinhas('grande.csv') as $linha) {
    processar($linha); // memória constante
}
```

## 4. `foreach` por valor vs. por referência

```php
<?php
$itens = [1, 2, 3];

// Por valor — cópia (barata para pequenos arrays)
foreach ($itens as $item) {
    echo $item;
}

// Por referência — modifica o original (evite vazar a referência)
foreach ($itens as &$item) {
    $item *= 2;
}
unset($item); // importante: quebra a referência
```

## 5. Coleta de lixo (GC)

O PHP gerencia ciclos de referência automaticamente. Você pode controlar:

```php
gc_enable();                 // ativa (padrão)
gc_disable();                // desativa para seções críticas
$coletados = gc_collect_cycles(); // força coleta e retorna nº de raízes liberadas
$ativo = gc_enabled();       // estado atual
```

`zend.enable_gc` (php.ini) liga/desliga o GC globalmente.

## 6. Dicas gerais para 7.2

- Ative OPcache em produção com `validate_timestamps=0` e reinicie para deploy.
- Use autoload em vez de `require` em cadeia.
- Prefira geradores para streams/grandes datasets.
- Evite criar referências desnecessárias; sempre `unset` após `&` em foreach.
- Use tipos (`declare(strict_types=1)`) — ajuda o OPcache a otimizar.
