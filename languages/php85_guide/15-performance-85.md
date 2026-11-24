# Performance no PHP 8.5

A regra de ouro permanece: meça antes de mudar. O 8.5 acrescenta ferramentas
de reuso de conexões (cURL persistente), novos defaults de JIT, OPcache
sempre presente e um teto de memória que melhora a previsibilidade em
ambientes multi-tenant. Nenhum desses recursos substitui perfilagem.

## Fontes

- `source/UPGRADING:216-255,753-755,860-863,959-979`.
- `docs/curl_multi_get_handles.txt`, `docs/IntlListFormatter.txt`,
  `docs/max_memory_limit.txt`.
- `source/NEWS:372-377` (versão de referência 8.5.13).

### OPcache sempre disponível

Desde o 8.5 o OPcache é compilado no binário e carregado por padrão;
`opcache.enable` e `opcache.enable_cli` ainda são respeitados
(`source/UPGRADING:860-863`). Produção deve manter `opcache.enable=1`,
`validate_timestamps=0` com deploy que limpa o cache, e
`max_accelerated_files` acima do total de arquivos PHP.

### JIT: defaults e ajustes do 8.5

- `opcache.jit_hot_loop` agora tem default **61**, um número primo, para
  evitar que seja múltiplo da contagem de iterações de loops comuns
  (`source/UPGRADING:969-971`). Se ajustar, use outro primo.
- `opcache.memory_consumption` agora reporta falha corretamente quando
  alterado com SHM já inicializado (`source/UPGRADING:972-974`).
- `opcache.file_cache_read_only=1` permite cache em filesystem somente leitura,
  típico de containers imutáveis (`source/UPGRADING:959-968`).

```ini
opcache.jit = tracing
opcache.jit_buffer_size = 64M
opcache.jit_hot_loop = 61
```

> JIT ajuda cargas CPU-bound (cálculo, parsing, transformação). Para aplicações
> web I/O-bound (banco, HTTP), o ganho costuma ser pequeno — compare
> `hrtime(true)` antes/depois com o mesmo workload.

### cURL: reuso de conexões entre requests

`curl_share_init_persistent()` cria um share handle que sobrevive ao request e
é reutilizado quando o conjunto de opções é igual
(`source/UPGRADING:753-755`). Compartilhe DNS e conexões — não cookies:

```php
$share = curl_share_init_persistent([CURL_LOCK_DATA_DNS, CURL_LOCK_DATA_CONNECT]);

$ch = curl_init('https://api.exemplo.com/v1/pedidos');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SHARE => $share,
    CURLOPT_TIMEOUT => 5,
]);
$corpo = curl_exec($ch);
```

`curl_multi_get_handles()` devolve todos os `CurlHandle` anexados a um
`CurlMultiHandle`, inclusive os aceitos via `CURLMOPT_PUSHFUNCTION`
(`source/UPGRADING:750-752`). Substitui a manutenção manual de array/WeakMap
de handles (`docs/curl_multi_get_handles.txt`).

Novos dados de telemetria cURL disponíveis via `curl_getinfo()`
(`source/UPGRADING:220-253`):

| Constante | Dado | Requisito |
| --- | --- | --- |
| `CURLINFO_CONN_ID` | ID da conexão usada ( pooling ) | libcurl ≥ 8.2 |
| `CURLINFO_QUEUE_TIME_T` | microssegundos na fila antes do envio | libcurl ≥ 8.6 |
| `CURLINFO_USED_PROXY` | se proxy foi usado | libcurl ≥ 8.7 |
| `CURLINFO_HTTPAUTH_USED` / `CURLINFO_PROXYAUTH_USED` | bitmask de autenticação | libcurl ≥ 8.12 |

`CURLOPT_INFILESIZE_LARGE` é substituto seguro de `CURLOPT_INFILESIZE` para
arquivos acima de 2 GiB (`source/UPGRADING:232-236`).
`CURLOPT_FOLLOWLOCATION` agora é inteiro com `CURLFOLLOW_OBEYCODE`,
`CURLFOLLOW_FIRSTONLY` e `CURLFOLLOW_ALL` (`source/UPGRADING:237-243`).

### Pipe operator e custo de chamadas

O pipe gera opcodes semelhantes a chamadas aninhadas — não há overhead extra
por nível (`docs/pipe-operator.txt`). A vantagem é clareza, não velocidade.
Variáveis temporárias com copy-on-write também não custam memória extra até
serem modificadas, então não troque um loop claro por pipe "por performance".

### `array_first`/`array_last`

Substituem `$a[array_key_last($a)] ?? null` com uma chamada
(`source/UPGRADING:798-800`). Úteis em hot paths sobre arrays pequenos; não
evitam o custo de materializar o array. Para datasets grandes, use generators
e faça a seleção durante a iteração.

### Teto de memória como ferramenta de estabilidade

`max_memory_limit` (INI_SYSTEM, default `-1`) impede que `ini_set()`
ultrapasse o limite definido no startup (`source/UPGRADING:953-956`). Em vez
de collapsing do worker por OOM, o PHP emite aviso e aplica o teto
(`docs/max_memory_limit.txt`). Defina o teto abaixo do limite do container.

### Lazy objects, preloading e WeakMap

Recursos do 8.4 continuam sendo as alavancas de memória:
`ReflectionClass::newLazyGhost()` para serviços caros, `opcache.preload` para
carregar classes no startup e `WeakMap` para caches indexados por objeto sem
vazamento. Não há substituto no 8.5 — use-os.

### Medição

```php
$inicio = hrtime(true);
// ... workload ...
$ms = (hrtime(true) - $inicio) / 1e6;
error_log(json_encode(['operacao' => 'importar', 'ms' => round($ms, 2)]));
```

Combine com `CURLINFO_QUEUE_TIME_T`, OPcache statistics e logs estruturados
(capítulo 17) antes de atribuir ganho a uma mudança específica.

## Verificação

- `php --ini=diff` confirma os INIs efetivos de OPcache/JIT.
- Benchmark A/B com `hrtime(true)` no mesmo workload, 8.5.13+
  (`source/NEWS:372-377` para correções relevantes no parser URI).
- `curl_version()` para confirmar versão do libcurl e constantes disponíveis.
