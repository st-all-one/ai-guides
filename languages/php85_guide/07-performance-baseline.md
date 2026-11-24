# Performance básica no PHP 8.5

Meça antes de otimizar. OPcache é sempre compilado e carregado no 8.5; JIT,
preload e lazy objects continuam disponíveis.

## Fontes

- `source/UPGRADING:860-863,959-979`.
- `docs/max_memory_limit.txt`.

### Medição

```php
$inicio = hrtime(true);
// ... código ...
$ms = (hrtime(true) - $inicio) / 1e6;
```

### OPcache

```ini
opcache.enable=1
opcache.validate_timestamps=0
opcache.max_accelerated_files=10000
opcache.jit_hot_loop=61
```

OPcache passou a ser incluído no binário e carregado por padrão
(`source/UPGRADING:860-863`). `opcache.jit_hot_loop` tem novo default 61
(`source/UPGRADING:969-971`).

### Alocação

- Use generators para grandes volumes.
- Use `array_first`/`array_last` (8.5) em arrays já materializados
  (`source/UPGRADING:798-800`).
- Use `WeakMap` para caches indexados por objeto.
- Lazy objects (8.4) para serviços caros.

### Memória previsível

`max_memory_limit` (novo, `INI_SYSTEM`) impede `ini_set('memory_limit', -1)`
de escapar do teto (`docs/max_memory_limit.txt`). Defina no startup do SAPI.

## Verificação

- `php --ini=diff` e benchmark A/B antes de mexer em JIT.
