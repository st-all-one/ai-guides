<?php
/**
 * Exemplo abrangente — PHP 7.2
 * ---------------------------------------------------------------------------
 * Demonstra, num único arquivo, as capacidades disponíveis em PHP 7.2:
 *   diretivas, tipagem, programação funcional, POO e logs.
 *
 * O CÓDIGO abaixo é 100% executável em PHP 7.2 (sem nenhum recurso de
 * versões posteriores). As notas "→ 7.3/7.4/8.x" apenas explicam, em
 * comentário, o que NÃO existe ainda nesta versão — o código nunca os usa.
 *
 * Execute com: php exemplo-completo.php
 */

declare(strict_types=1);            // diretiva de tipagem estrita (por arquivo, 7.0+)

namespace Exemplo\V72;

/* ============================ TIPAGEM ============================ */

/** Soma com tipos escalares + tipo de retorno (7.0+). */
function soma(int $a, int $b): int
{
    return $a + $b;
}

/** Tipos anuláveis (7.1+) e valor default. */
function cumprimentar(string $nome, ?string $tratamento = null): string
{
    return $tratamento !== null
        ? "{$tratamento} {$nome}"
        : $nome;
}

/* ===================== PROGRAMAÇÃO FUNCIONAL ===================== */

$nums = [1, 2, 3, 4, 5];

// Closure (5.3+). Arrow functions `fn () =>` chegam só no PHP 7.4.
$dobro = array_map(function (int $n): int { return $n * 2; }, $nums);

$pares = array_filter($nums, function (int $n): bool { return $n % 2 === 0; });

$somaTotal = array_reduce($nums, function (int $acc, int $n): int { return $acc + $n; }, 0);

// Closure a partir de callable (7.1+).
$quadrado = \Closure::fromCallable(function (int $n): int { return $n * $n; });

// Chamada dinâmica de função.
$fn = 'soma';
echo $fn(2, 3) . PHP_EOL;

/* ============================ POO ============================ */

interface Repositorio
{
    public function salvar(string $dado): void;
}

trait Auditavel
{
    private $log = [];

    public function registrar(string $evento): void
    {
        $this->log[] = $evento;
    }

    public function historico(): array
    {
        return $this->log;
    }
}

/**
 * Em 7.2 as propriedades NÃO são tipadas (typed properties chegam no 7.4).
 * Usamos phpdoc para documentar o tipo esperado.
 *
 * @property string $nome
 */
class Usuario implements Repositorio
{
    use Auditavel;

    /** @var string */
    private $nome;

    /** @var int */
    private $id;

    public function __construct(string $nome)
    {
        $this->nome = $nome;
        $this->registrar("criado: {$nome}");
    }

    public function salvar(string $dado): void
    {
        $this->registrar("salvo: {$dado}");
    }

    public function nome(): string
    {
        return $this->nome;
    }

    public function __toString(): string
    {
        return "Usuario({$this->nome})";
    }
}

// Classe anônima (7.0+).
$servico = new class {
    public function ping(): string { return 'pong'; }
};

// Herança + late static bindings.
class Admin extends Usuario
{
    public static function fabrica(string $nome): self
    {
        return new static($nome);
    }
}

/* ===================== GENERATORS / ITERAÇÃO ===================== */

function contagem(int $ate): \Generator
{
    for ($i = 1; $i <= $ate; $i++) {
        yield $i;
    }
}

foreach (contagem(3) as $n) {
    echo "gen: {$n}" . PHP_EOL;
}

/* ============================ LOGS ============================ */

/** Logger simples que grava em arquivo (substituto mínimo de PSR-3). */
class ArquivoLogger
{
    /** @var resource */
    private $handle;

    public function __construct(string $arquivo)
    {
        $this->handle = fopen($arquivo, 'a');
        if ($this->handle === false) {
            throw new \RuntimeException("Não foi possível abrir {$arquivo}");
        }
    }

    public function info(string $msg): void
    {
        $this->escrever('INFO', $msg);
    }

    public function erro(string $msg): void
    {
        $this->escrever('ERRO', $msg);
        error_log("[ERRO] {$msg}"); // log do sistema
    }

    private function escrever(string $nivel, string $msg): void
    {
        fwrite($this->handle, date('c') . " [{$nivel}] {$msg}" . PHP_EOL);
    }

    public function __destruct()
    {
        if (is_resource($this->handle)) {
            fclose($this->handle);
        }
    }
}

// Handler de erro customizado (converte erro em exceção controlada).
set_error_handler(function (int $cod, string $msg): bool {
    if (!(error_reporting() & $cod)) {
        return false; // não captura erros silenciados com @
    }
    throw new \ErrorException($msg, 0, $cod);
});

$logger = new ArquivoLogger(sys_get_temp_dir() . '/exemplo-72.log');

try {
    $u = new Usuario('Ana');
    $u->salvar('perfil');
    $logger->info((string) $u);
    echo soma(1, 2) . PHP_EOL;          // 3
    echo $servico->ping() . PHP_EOL;    // pong
    echo Admin::fabrica('Root')->nome() . PHP_EOL;

    // Exemplo de captura de exceção (finally existe desde 5.5).
    try {
        throw new \InvalidArgumentException('exemplo');
    } catch (\InvalidArgumentException $e) {
        $logger->erro($e->getMessage());
    } finally {
        $logger->info('bloco finally executado');
    }
} catch (\Throwable $t) {
    // Throwable reúne Error e Exception (7.0+)
    $logger->erro($t->getMessage());
}

/* ================== O QUE NÃO EXISTE AINDA (7.2) ==================
 * → 7.4: typed properties, arrow functions `fn () =>`, `??=`,
 *        preloading (opcache.preload), WeakReference, __serialize/__unserialize.
 * → 8.0: atributos `#[...]`, match, argumentos nomeados, nullsafe `?->`,
 *        union types `int|string`, `mixed`, `static` como retorno.
 * → 8.1: enums, readonly, first-class callable `strlen(...)`, fibers.
 * → 8.4: property hooks, visibilidade assimétrica, lazy objects.
 * Nenhum desses recursos é usado acima — o arquivo roda em 7.2 puro.
 */
