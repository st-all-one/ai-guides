Complementar ao documento comum — específico do PHP 7.4.

# Superglobais, Entrada Externa e Funções Variáveis no PHP 7.4

Este documento cobre as variáveis superglobais e o tratamento seguro de entrada
externa no PHP 7.4, além de funções variáveis. Todo o código aqui é 100% válido
e executável na versão 7.4.

> Aviso de escopo: nada aqui é específico de versões 8.x. Veja também
> `05-seguranca-baseline.md` e `14-seguranca-74.md`.

## 1. Superglobais

São arrays disponíveis em qualquer escopo, sem necessidade de `global`.

| Superglobal | Conteúdo |
|---|---|
| `$_GET` | parâmetros da query string |
| `$_POST` | dados de formulário POST |
| `$_REQUEST` | união de GET/POST/COOKIE (ordem configurável) |
| `$_COOKIE` | cookies enviados |
| `$_SERVER` | cabeçalhos, caminhos e metadados da requisição |
| `$_ENV` | variáveis de ambiente |
| `$_FILES` | uploads de arquivos |
| `$_SESSION` | dados de sessão |

```php
<?php
$nome = $_GET['nome'] ?? '';
$agente = $_SERVER['HTTP_USER_AGENT'] ?? '';
```

## 2. Histórico de `register_globals`

Em versões antigas, `register_globals` criava variáveis a partir de entradas
externas (um risco grave de segurança). Esse recurso foi removido há muito
tempo e **não existe** no 7.4 — você sempre acessa a entrada pelas superglobais
explícitas.

## 3. Tratamento SEGURO de entrada

Nunca confie em `$_GET`/`$_POST`. Sempre valide e filtre:

```php
<?php
$idade = filter_input(INPUT_GET, 'idade', FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 0, 'max_range' => 150],
]);

if ($idade === false || $idade === null) {
    http_response_code(400);
    exit('idade inválida');
}

$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
if ($email === false) {
    exit('email inválido');
}
```

Filtros úteis: `FILTER_VALIDATE_INT`, `FILTER_VALIDATE_EMAIL`,
`FILTER_VALIDATE_URL`, `FILTER_VALIDATE_BOOLEAN`, `FILTER_SANITIZE_STRING`,
`FILTER_SANITIZE_EMAIL`, `FILTER_SANITIZE_FULL_SPECIAL_CHARS`.

```php
<?php
$limpo = filter_var($comentario, FILTER_SANITIZE_FULL_SPECIAL_CHARS);
```

### Regras de ouro

- Valide no servidor (a validação no cliente é só conveniência).
- Escape a saída conforme o contexto (HTML, SQL com prepared statements, JSON).
- Use `hash_equals()` para comparar segredos (resistente a temporização).
- Prefira prepared statements para banco de dados (vide `05-seguranca-baseline.md`).

## 4. Uploads com `$_FILES`

```php
<?php
if (isset($_FILES['arquivo']) && $_FILES['arquivo']['error'] === UPLOAD_ERR_OK) {
    $tmp = $_FILES['arquivo']['tmp_name'];
    $nome = basename($_FILES['arquivo']['name']);
    move_uploaded_file($tmp, '/var/uploads/' . $nome);
}
```

Valide sempre tipo e tamanho; não confie no nome original.

## 5. Funções variáveis

Em PHP, o nome de uma função pode estar em uma variável. Isso é útil para
despachar ações.

```php
<?php
function saudar(): string { return 'oi'; }

$nome = 'saudar';
echo $nome();   // 'oi'
```

### `call_user_func` / `call_user_func_array`

```php
<?php
function soma(int $a, int $b): int { return $a + $b; }

echo call_user_func('soma', 1, 2);             // 3
echo call_user_func_array('soma', [1, 2]);     // 3
```

Para métodos de objeto:

```php
<?php
$obj = new Usuario();
call_user_func([$obj, 'nome']);

// sintaxe de variável é mais direta e performática:
$metodo = 'nome';
echo $obj->$metodo();
```

### Boas práticas

- Prefira a sintaxe `$func()` ou `[$obj, $metodo]()` quando possível — evita
  camadas extras de chamada.
- Nunca construa o nome da função a partir de entrada do usuário sem uma lista
  de permissão (*allowlist*), sob risco de execução de código arbitrário.
- `call_user_func_array` é ideal para argumentos variáveis; para poucos
  argumentos conhecidos, a chamada direta é melhor.

## 6. Resumo

| Tópico | Recomendação no 7.4 |
|---|---|
| entrada | use `$_GET`/`$_POST` + filtros |
| validação | `filter_input`/`filter_var` |
| saída | escape conforme contexto |
| uploads | valide tipo/tamanho |
| função variável | `$f()` ou `call_user_func*` |
| segurança | allowlist p/ nomes dinâmicos |
