<?php
/**
 * Exemplo abrangente — PHP 7.4
 * ---------------------------------------------------------------------------
 * Demonstra, num único arquivo, as capacidades disponíveis em PHP 7.4:
 *   diretivas, tipagem, programação funcional, POO e logs.
 *
 * O CÓDIGO abaixo é 100% executável em PHP 7.4. As notas "→ 8.x" apenas
 * explicam, em comentário, o que NÃO existe ainda nesta versão.
 *
 * Execute com: php exemplo-completo.php
 */

declare(strict_types=1);

namespace Exemplo\V74;

/* ============================ TIPAGEM ============================ */

// Typed properties (7.4) — propriedades com tipo declarado.
class Conta
{
    private string $titular;
    private float $saldo = 0.0;

    public function __construct(string $titular)
    {
        $this->titular = $titular;
    }

    public function depositar(float $valor): void
    {
        $this->saldo += $valor;
    }

    public function saldo(): float
    {
        return $this->saldo;
    }
}

function soma(int $a, int $b): int
{
    return $a + $b;
}

/* ===================== PROGRAMAÇÃO FUNCIONAL ===================== */

$nums = [1, 2, 3, 4, 5];

// Arrow functions (7.4) — enxuto e com captura automática por valor.
$dobro = array_map(fn(int $n): int => $n * 2, $nums);
$pares  = array_filter($nums, fn(int $n): bool => $n % 2 === 0);
$somaTotal = array_reduce($nums, fn(int $acc, int $n): int => $acc + $n, 0);

// Atribuição de coalescência `??=` (7.4).
$config = [];
$config['host'] ??= 'localhost';

// Closure a partir de callable (7.1+).
$quadrado = \Closure::fromCallable(fn(int $n): int => $n * $n);

/* ============================ POO ============================ */

interface Repositorio
{
    public function salvar(string $dado): void;
}

trait Auditavel
{
    /** @var array<int,string> */
    private array $log = [];

    public function registrar(string $evento): void
    {
        $this->log[] = $evento;
    }

    public function historico(): array
    {
        return $this->log;
    }
}

class Usuario implements Repositorio
{
    use Auditavel;

    private string $nome;          // typed property (7.4)
    private int $id;

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

// WeakReference (7.4) — referência que não impede coleta.
$wr = \WeakReference::create($servico);

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
        error_log("[ERRO] {$msg}");
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

set_error_handler(function (int $cod, string $msg): bool {
    if (!(error_reporting() & $cod)) {
        return false;
    }
    throw new \ErrorException($msg, 0, $cod);
});

$logger = new ArquivoLogger(sys_get_temp_dir() . '/exemplo-74.log');

try {
    $c = new Conta('Ana');
    $c->depositar(100);
    echo $c->saldo() . PHP_EOL;       // 100

    $u = new Usuario('Ana');
    $u->salvar('perfil');
    $logger->info((string) $u);

    echo soma(1, 2) . PHP_EOL;        // 3
    echo $servico->ping() . PHP_EOL;  // pong
    echo $wr->get() !== null ? 'weak ok' . PHP_EOL : 'weak gc' . PHP_EOL;

    try {
        throw new \InvalidArgumentException('exemplo');
    } catch (\InvalidArgumentException $e) {
        $logger->erro($e->getMessage());
    } finally {
        $logger->info('bloco finally executado');
    }
} catch (\Throwable $t) {
    $logger->erro($t->getMessage());
}

/* ================== O QUE NÃO EXISTE AINDA (7.4) ==================
 * → 8.0: atributos `#[...]`, match, argumentos nomeados, nullsafe `?->`,
 *        union types `int|string`, `mixed`, `static` como retorno.
 * → 8.1: enums, readonly, first-class callable `strlen(...)`, fibers.
 * → 8.4: property hooks, visibilidade assimétrica, lazy objects, JIT.
 * (Preloading opcache.preload JÁ existe no 7.4, mas é configuração de
 *  ambiente, não sintaxe — ver 25-config-web-phpini.md.)
 */
