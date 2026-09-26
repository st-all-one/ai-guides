Complementar ao documento comum — específico do PHP 7.4.

# Segurança (PHP 7.4)

O documento comum de segurança (7.2) já cobre as bases: `password_hash`
(BCRYPT/ARGON2I), `random_bytes`/`random_int`, `sodium`, `filter`,
`hash_equals`, escape de saída, instruções preparadas e sessões. Este complemento
foca no que o **PHP 7.4 (e o 7.3)** adicionou à superfície de segurança — em
especial o **`PASSWORD_ARGON2ID`** — e reforça as práticas de baseline.

> Fora de escopo: primitivas de geração aleatória introduzidas em 8.x e quaisquer
> primitivas criptográficas novas de versões posteriores. Mantenha-se em
> `password_*`, `random_*`, `sodium_*`, `hash_*`.

## 1. `PASSWORD_ARGON2ID` disponível (PHP 7.3)

A partir do PHP 7.3, `password_hash()` aceita a constante
`PASSWORD_ARGON2ID`, que usa o algoritmo **Argon2id** (resistente tanto a
ataques de canal lateral quanto a GPU/ASIC). No baseline 7.2 apenas
`PASSWORD_BCRYPT` e `PASSWORD_ARGON2I` eram garantidos. No 7.4, portanto, você
pode (e deve, quando disponível) preferir Argon2id.

```php
<?php
$hash = password_hash('senha-do-usuario', PASSWORD_ARGON2ID, [
    'memory_cost' => PASSWORD_ARGON2_DEFAULT_MEMORY_COST, // ~64 MiB por padrão
    'time_cost'   => PASSWORD_ARGON2_DEFAULT_TIME_COST,   // ~4 iterações
    'threads'     => PASSWORD_ARGON2_DEFAULT_THREADS,     // (libargon2; ignorado na libsodium)
]);

if (password_verify('senha-do-usuario', $hash)) {
    echo "Senha correta";
}
```

### Algoritmos em resumo (válidos no 7.4)

| Constante | Desde | Características |
|---|---|---|
| `PASSWORD_BCRYPT` | sempre | Blowfish `$2y$`; hash de 60 chars; portátil |
| `PASSWORD_ARGON2I` | 7.2 | Argon2i (lado/side-channel) |
| `PASSWORD_ARGON2ID` | **7.3** | Argon2id (híbrido — recomendado) |
| `PASSWORD_DEFAULT` | — | pode mudar no futuro; armazene em `VARCHAR(255)` |

### Rehash ao trocar de algoritmo

```php
<?php
if (password_verify($senha, $hash)
    && password_needs_rehash($hash, PASSWORD_ARGON2ID, $opcoes)) {
    $novoHash = password_hash($senha, PASSWORD_ARGON2ID, $opcoes);
    // atualize $novoHash no banco
}
```

### Detalhes de build

No PHP 7.4, `password_hash` com Argon2 (i/id) funciona tanto linked contra a
**libargon2** quanto (como fallback) via extensão **sodium**. A constante
`PASSWORD_ARGON2_PROVIDER` (7.4) indica qual provedor está em uso. Os IDs dos
algoritmos passaram a ser `string` no 7.4 (antes eram `int`) — compare sempre
com as constantes, nunca com literais numéricos.

## 2. Recapo de práticas de baseline (ainda obrigatórias)

### Aleatoriedade segura

```php
<?php
$token = bin2hex(random_bytes(32)); // 64 hex
$codigo = random_int(100000, 999999);
```

Nunca use `rand()`/`mt_rand()` para segurança.

### Filtragem de entrada

```php
<?php
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
$ip = filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP,
    FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
```

`FILTER_VALIDATE_FLOAT` (7.4) agora aceita `min_range`/`max_range`, como o
`FILTER_VALIDATE_INT`.

### Comparação temporalmente segura

```php
<?php
if (hash_equals($esperado, $calculado)) {
    // autenticado
}
```

### Escape de saída (XSS)

```php
<?php
echo htmlspecialchars($usuario, ENT_QUOTES, 'UTF-8');
```

### Instruções preparadas

```php
<?php
$pdo = new PDO('mysql:host=localhost;dbname=app;charset=utf8mb4', $usr, $pw, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
$stmt->execute([$email]);
```

## 3. Sessão: `session.cookie_samesite` (PHP 7.3+)

Disponível desde o 7.3, pode (e deve) ser usado no 7.4 para mitigar CSRF:

```php
<?php
ini_set('session.cookie_secure', '1');      // apenas HTTPS
ini_set('session.cookie_httponly', '1');    // não acessível via JS
ini_set('session.cookie_samesite', 'Lax');  // 'Lax' ou 'Strict'
ini_set('session.use_strict_mode', '1');
session_start();
session_regenerate_id(true); // após login
```

## 4. `zend.exception_ignore_args` (PHP 7.4) e logs sensíveis

O PHP 7.4 adicionou a diretiva `zend.exception_ignore_args` (INI), que remove os
**argumentos** dos traces de exceção. Isso evita que dados sensíveis vazem em
logs de stack trace. Veja detalhes em `16-configuracao-74.md`.

## 5. Diretrizes

- Prefira `PASSWORD_ARGON2ID` (quando presente) para novos hashes; mantenha
  `PASSWORD_BCRYPT` para máxima portabilidade.
- Sempre rehashe ao aumentar custo ou trocar de algoritmo.
- Nunca armazene senhas em texto limpo; nunca use `md5`/`sha1` puros.
- Mantenha `random_*`, `sodium_*`, `hash_equals`, `htmlspecialchars` e
  instruções preparadas — a base do documento comum.
- Proteja sessões com `cookie_secure` + `httponly` + `samesite` + `strict_mode`
  e regeneração de ID.

## 6. Resumo

- **Novidade 7.3/7.4:** `PASSWORD_ARGON2ID` em `password_hash`/`password_verify`/
  `password_needs_rehash` (mesmas opções de Argon2i).
- Recapitulação: BCRYPT/ARGON2I baseline + random/sodium/filter/hash_equals/
  escape/preparadas/session.samesite.
- `zend.exception_ignore_args` (7.4) ajuda a não expor argumentos em traces.
