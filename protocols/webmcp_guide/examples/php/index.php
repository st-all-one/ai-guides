<?php
/**
 * Example Shoppe — página WebMCP servida por PHP.
 *
 * O WebMCP em si roda no navegador (JavaScript em document.modelContext).
 * O PHP participa de duas formas:
 *   1. Renderizando um formulário DECLARATIVO (atributos tool*).
 *   2. Servindo o endpoint JSON que a ferramenta imperativa chama.
 */
$catalog = [
    ['id' => 'JACKET002', 'name' => 'Jaqueta preta', 'price' => 89.9],
    ['id' => 'JEANS001', 'name' => 'Jeans', 'price' => 49.9],
    ['id' => 'TSHIRT003', 'name' => 'Camiseta estampada', 'price' => 19.9],
];
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Example Shoppe — WebMCP (PHP)</title>
</head>
<body>
    <h1>Example Shoppe</h1>

    <!--
      API Declarativa: o PHP renderiza o formulário anotado.
      O navegador sintetiza o JSON Schema a partir dos atributos.
    -->
    <form toolname="search_cars"
          tooldescription="Search for cars based on criteria such as type, seats and year."
          toolautosubmit
          action="/search.php">
        <label for="car_type">Tipo de carro</label>
        <select id="car_type" name="car_type" toolparamdescription="Type of car">
            <option value="">Qualquer</option>
            <option value="family">Família</option>
            <option value="suv">SUV</option>
            <option value="sedan">Sedan</option>
        </select>

        <label for="seats">Lugares mínimos</label>
        <input id="seats" name="seats" type="number" min="1" max="9"
               toolparamdescription="Minimum number of seats required"
               placeholder="7">

        <button type="submit">Buscar</button>
    </form>

    <!--
      API Imperativa: registra search_products cujo execute chama o PHP
      no mesmo origin, reutilizando a sessão autenticada do visitante.
    -->
    <script type="module">
        document.modelContext.registerTool({
            name: 'search_products',
            description: 'Search the product catalog and return id, name and price.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Free text search term.' },
                    maxPrice: { type: 'number', description: 'Optional upper price filter.' }
                },
                required: ['query']
            },
            execute: async ({ query, maxPrice }) => {
                const url = new URL('/api/products.php', location.origin);
                url.searchParams.set('q', query);
                if (maxPrice != null) url.searchParams.set('max', String(maxPrice));

                const res = await fetch(url, { credentials: 'same-origin' });
                if (!res.ok) throw new Error('Search failed: ' + res.status);
                return res.json();
            }
        });
    </script>
</body>
</html>
