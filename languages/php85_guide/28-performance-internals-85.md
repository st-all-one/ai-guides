# Performance interna do PHP 8.5 — o que muda na prática

Este capítulo catalogas as melhorias de performance do engine e das extensões
no 8.5 e traduz cada uma em decisão prática. Não são opções de configuração:
são ganhos que vêm com a versão, desde que o código use os padrões certos.
Fonte primária: `source/UPGRADING:1036-1085`.

## Fontes

- `source/UPGRADING:1036-1085` (seção 14: Performance Improvements).
- `source/NEWS:157-175` (correções de JIT na 8.5.13).
- `source/Zend/tests/pipe_operator/call_by_ref.phpt` (comportamento do pipe).

### Core: comparações e exceções

| Melhoria | O que fazer na aplicação | Fonte |
| --- | --- | --- |
| OPcodes removidos para comparação de identidade com booleanos, especialmente `match(true)` | prefira `match(true)` a cadeias longas de `if` com `=== true` | `source/UPGRADING:1041-1042` |
| Especialização de opcode para `=== []` / `!== []` | use comparação estrita direta em vez de `count($a) === 0` | `source/UPGRADING:1043` |
| Criação de exceções muito mais rápida | não há mais desculpa para "sentinelas" por custo — use `throw` | `source/UPGRADING:1044` |

```php
// Forma favorecida pelo engine 8.5:
if ($lista === []) { return null; }

$resultado = match (true) {
    $codigo >= 500 => 'erro',
    $codigo >= 400 => 'cliente',
    default       => 'ok',
};
```

### VM: TAILCALL e compiladores

O 8.5 introduz a **TAILCALL VM**, habilitada por padrão ao compilar com
Clang ≥ 19 em x86_64 ou aarch64. Ela alcança a performance da VM HYBRID
usada com GCC; a VM CALL (outros compiladores) também melhorou
(`source/UPGRADING:1047-1051`).

**Decisão prática:** se você constrói PHP do source, Clang ≥ 19 não é mais
desvantajoso. Para a maioria, isso é transparente — o ganho já vem na imagem
oficial. Correções específicas de JIT (inclusive AVs em Windows ZTS) estão na
8.5.13 (`source/NEWS:157-175`).

### SIMD/NEON

Partes do core e do MBString que usavam SSE2 foram adaptadas para SIMD com
ARM NEON (`source/UPGRADING:1045-1046,1058-1059`). Impacto: paridade de
performance em ARM64 — relevante para containers em Graviton/AMPERE.

### Intl, OPcache, Reflection, SPL

| Área | Melhoria | Uso efetivo | Fonte |
| --- | --- | --- | --- |
| Intl | menos cópias de string no collator | `Collator::compare()` em loops grandes custa menos | `source/UPGRADING:1053-1055` |
| OPcache | TLS mais rápido em JIT em builds não-Glibc | JIT em Alpine/musl mais consistente | `source/UPGRADING:1061-1063` |
| ReflectionProperty | `getValue`, `getRawValue`, `isInitialized`, `setValue`, `setRawValue` mais rápidos | frameworks de DI/ORM (hydrators) ganham sem mudança de código | `source/UPGRADING:1065-1067` |
| SPL | acessores e métodos de `SplFixedArray` mais rápidos | use `SplFixedArray` em buffers de tamanho fixo | `source/UPGRADING:1069-1070` |
| XMLReader | acesso a propriedades mais rápido | parsing streaming de XML | `source/UPGRADING:1081-1082` |
| XMLWriter | mais rápido e menos memória | geração de XML em volume | `source/UPGRADING:1084-1085` |

### Standard: funções de array e strings

O 8.5 melhora funções de array com callbacks — `array_find`,
`array_filter`, `array_map`, `usort` e similares (`source/UPGRADING:1072-1074`).
Também há ganhos em `urlencode()`/`rawurlencode()`, `pack()`/`unpack()`,
`array_chunk()` (`source/UPGRADING:1075-1079`).

```php
// Agora mais barato no 8.5:
$ativo = array_find($usuarios, static fn(array $u): bool => $u['ativo']);
$urls  = array_map(rawurlencode(...), $partes);
```

> Isso **não** torna `array_map` gratuito: para milhões de elementos,
> generators continuam sendo a escolha de memória constante (capítulo 26).

### Pipe operator e custo de chamadas

O pipe compila para opcodes semelhantes a chamadas aninhadas — a clareza é o
ganho, não a velocidade (`docs/pipe-operator.txt`). Variáveis temporárias com
copy-on-write não custam memória até serem escritas. Não substitua um loop
claro por pipe "por performance".

### JIT: configuração que acompanha as melhorias

- `opcache.jit_hot_loop` default **61** (primo) —
  `source/UPGRADING:969-971`.
- `opcache.jit` default `"disable"`, buffer `64M` —
  `source/ext/opcache/zend_accelerator_module.c:359-360`.
- JIT não pode ser ligado em runtime se veio desligado
  (`source/ext/opcache/jit/zend_jit.c:3692-3697`).
- Preload é incompatível com triggers de primeira execução
  (`source/ext/opcache/jit/zend_jit.c:3351-3358`).

```ini
opcache.jit = tracing       ; meça antes
opcache.jit_buffer_size = 64M
opcache.jit_hot_loop = 61
```

### Medição antes e depois

```php
$inicio = hrtime(true);
for ($i = 0; $i < 10_000; $i++) {
    $r = $lista === [] ? null : array_last($lista);
}
$ms = (hrtime(true) - $inicio) / 1e6;
error_log(json_encode(['cenario' => 'check-empty', 'ms' => round($ms, 2)]));
```

Compare no mesmo binário 8.5.13 com JIT ligado/desligado. Atribua diferenças
a uma mudança específica apenas com A/B isolado.

## Verificação

- `php --ini=diff` confirma defaults de JIT/OPcache.
- `php -i | grep -E 'opcache.jit|opcache.jit_hot_loop'`.
- Benchmark A/B com `hrtime(true)` no seu workload real.
