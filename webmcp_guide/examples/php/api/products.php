<?php
/**
 * Endpoint JSON chamado pelo execute() da ferramenta imperativa search_products.
 * Em produção: consultar o banco com prepared statements (PDO), autorização etc.
 */
header('Content-Type: application/json; charset=utf-8');

$catalog = [
    ['id' => 'JACKET002', 'name' => 'Jaqueta preta', 'price' => 89.9],
    ['id' => 'JEANS001', 'name' => 'Jeans', 'price' => 49.9],
    ['id' => 'TSHIRT003', 'name' => 'Camiseta estampada', 'price' => 19.9],
];

$q = $_GET['q'] ?? '';
$max = isset($_GET['max']) ? (float) $_GET['max'] : null;

$results = array_values(array_filter(
    $catalog,
    static function (array $p) use ($q, $max): bool {
        if ($q !== '' && stripos($p['name'], $q) === false) {
            return false;
        }
        if ($max !== null && $p['price'] > $max) {
            return false;
        }
        return true;
    }
));

// Saída enxuta: apenas o essencial para o LLM decidir o próximo passo.
echo json_encode($results);
