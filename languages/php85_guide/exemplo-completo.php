<?php
/**
 * Exemplo abrangente — PHP 8.5.13+
 * ---------------------------------------------------------------------------
 * Demonstra num único arquivo os recursos do PHP 8.5: pipe operator,
 * Clone With, #[\NoDiscard], URI extension, FILTER_THROW_ON_FAILURE,
 * introspecção de handlers, logs estruturados e medição.
 *
 * Execute com: php exemplo-completo.php
 */

declare(strict_types=1);

namespace Exemplo\V85;

use Filter\FilterFailedException;
use Uri\Rfc3986\Uri;

/* ============ PIPE OPERATOR + ARRAY_FIRST/LAST (8.5) ============ */

$titulo = ' PHP 8.5 Released ';
$slug = $titulo
    |> trim(...)
    |> (fn(string $s): string => str_replace(' ', '-', $s))
    |> (fn(string $s): string => str_replace('.', '', $s))
    |> strtolower(...);

$eventos = ['login', 'compra', 'logout'];
$ultimo = array_last($eventos); // "logout"

/* ============ CLONE WITH + NOVOS ATRIBUTOS (8.5) ============ */

#[Attribute(\Attribute::TARGET_CLASS)]
final class Rotulo
{
    public function __construct(public readonly string $texto) {}
}

#[Rotulo('value object')]
readonly class Cor
{
    public function __construct(
        public int $vermelho,
        public int $verde,
        public int $azul,
        public int $alfa = 255,
    ) {}

    public function comAlfa(int $alfa): self
    {
        return clone($this, ['alfa' => $alfa]); // Clone With (8.5)
    }
}

#[\NoDiscard]
function validarSlug(string $slug): string
{
    return $slug === '' ? throw new \InvalidArgumentException('slug vazio') : $slug;
}

$slugValidado = validarSlug($slug);
$cor = new Cor(79, 91, 147);
$transparente = $cor->comAlfa(128);

/* ============ URI EXTENSION (8.5) ============ */

$uri = new Uri('https://php.net/releases/8.5/en.php');
$host = $uri->getHost(); // php.net
$base = new Uri('https://exemplo.com/docs/');
$resolvida = $base->resolve('../seguro');

/* ============ FILTER THROW (8.5) ============ */

try {
    $email = filter_var('ana@example.com', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE);
    $invalido = filter_var('nao-email', FILTER_VALIDATE_EMAIL, FILTER_THROW_ON_FAILURE);
} catch (FilterFailedException $e) {
    $erroValidacao = $e::class;
}

/* ============ HANDLERS + LOGS (8.5) ============ */

$erroAnterior = get_error_handler();
$excAnterior = get_exception_handler();

set_error_handler(static function (int $no, string $str, string $file = '', int $line = 0) use ($erroAnterior): bool {
    if (!(error_reporting() & $no)) {
        return false;
    }
    error_log(json_encode([
        'evento' => 'erro_php',
        'nivel' => $no,
        'local' => "$file:$line",
    ], \JSON_THROW_ON_ERROR));
    return $erroAnterior !== null ? (bool) $erroAnterior($no, $str, $file, $line) : false;
});

/* ============ MEDIÇÃO ============ */

$inicio = hrtime(true);
$processados = array_map(fn(int $n): int => $n * 2, range(1, 1000));
$ms = (\hrtime(true) - $inicio) / 1e6;

error_log(json_encode([
    'evento' => 'exemplo',
    'slug' => $slugValidado,
    'host' => $host,
    'email' => $email ?? null,
    'cor_alfa' => $transparente->alfa,
    'eventos' => $ultimo,
    'ms' => round($ms, 3),
    'itens' => count($processados),
    'validacao' => $erroValidacao ?? null,
    'php' => \PHP_VERSION,
], \JSON_THROW_ON_ERROR));

restore_error_handler();
if ($excAnterior !== null) {
    set_exception_handler($excAnterior);
}

echo "PHP 8.5 — exemplo concluido. Veja o error_log para os eventos estruturados.\n";
