<?php
/**
 * Destino do formulário declarativo (action="/search.php").
 *
 * Quando o agente submete o formulário (toolautosubmit) e a página navega para cá,
 * o navegador usa o PRIMEIRO <script type="application/ld+json"> como resposta
 * estruturada da ferramenta ao modelo. (Mecanismo em discussão na spec — Issue #135.)
 */
$carType = $_POST['car_type'] ?? '';
$seats = isset($_POST['seats']) ? (int) $_POST['seats'] : 0;

$results = [];
if ($carType === 'family' || $seats >= 7) {
    $results[] = ['name' => 'Minivan 2022', 'seats' => 7, 'fuel' => 'gasolina'];
}
if ($carType === 'suv') {
    $results[] = ['name' => 'SUV 2021', 'seats' => 5, 'fuel' => 'gasolina'];
}
if ($carType === 'sedan') {
    $results[] = ['name' => 'Sedan 2020', 'seats' => 5, 'fuel' => 'gasolina'];
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Resultados da busca</title>
</head>
<body>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "query": {
            "carType": <?= json_encode($carType) ?>,
            "seats": <?= json_encode($seats) ?>
        },
        "results": <?= json_encode($results) ?>
    }
    </script>
    <h1>Resultados da busca de carros</h1>
    <p>Tipo: <?= htmlspecialchars($carType ?: 'qualquer', ENT_QUOTES) ?> ·
       Lugares mínimos: <?= htmlspecialchars((string) $seats) ?></p>
    <ul>
        <?php foreach ($results as $r): ?>
            <li><?= htmlspecialchars($r['name']) ?> — <?= (int) $r['seats'] ?> lugares</li>
        <?php endforeach; ?>
    </ul>
</body>
</html>
