Complementar ao documento comum — específico do PHP 7.2.

# Segurança no PHP 7.2 (além do básico)

Este suplemento documenta os recursos de segurança disponíveis no 7.2. Todo o
código é válido em 7.2.

> Aviso de escopo: utilize `PASSWORD_ARGON2I` ou `PASSWORD_BCRYPT` para hashing
> de senhas. Para cookies de sessão, configure `cookie_secure` e `cookie_httponly`.
> Para criptografia simétrica, prefira Sodium ou OpenSSL.

## 1. Hashing de senhas — Argon2i (NOVIDADE 7.2) e Bcrypt

### `PASSWORD_ARGON2I`

O PHP 7.2 adicionou o Argon2 (variante *i*) à API de senhas, além do Bcrypt.

```php
<?php
$hash = password_hash('segredo', PASSWORD_ARGON2I);

// Com custo ajustado (constantes do 7.2)
$hash = password_hash('segredo', PASSWORD_ARGON2I, [
    'memory_cost' => PASSWORD_ARGON2_DEFAULT_MEMORY_COST,
    'time_cost'   => PASSWORD_ARGON2_DEFAULT_TIME_COST,
    'threads'     => PASSWORD_ARGON2_DEFAULT_THREADS,
]);

if (password_verify('segredo', $hash)) {
    echo "senha correta";
}

// Re-hash se o custo mudou
if (password_needs_rehash($hash, PASSWORD_ARGON2I, ['memory_cost' => 65536])) {
    $hash = password_hash('segredo', PASSWORD_ARGON2I, ['memory_cost' => 65536]);
}

$info = password_get_info($hash);
// ['algo' => 2, 'algoName' => 'argon2i', 'options' => [...]]
```

### `PASSWORD_BCRYPT` (ainda válido)

```php
<?php
$hash = password_hash('segredo', PASSWORD_BCRYPT, ['cost' => 12]);
```

## 2. Geração de números aleatórios criptograficamente seguros

Disponíveis desde o PHP 7.0:

```php
<?php
$bytes = random_bytes(32);           // string binária segura
$int   = random_int(0, PHP_INT_MAX); // inteiro uniforme seguro
```

### OpenSSL

```php
<?php
$bytes = openssl_random_pseudo_bytes(32, $strong);
if ($strong !== true) {
    // fallback para random_bytes()
}
```

## 3. Extensão Sodium (core no 7.2)

O PHP 7.2 tornou o Sodium uma extensão de núcleo. Exemplos:

### Criptografia simétrica (secretbox)

```php
<?php
$mensagem = "confidencial";
$chave    = sodium_crypto_secretbox_keygen();
$nonce    = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);

$cifrado  = sodium_crypto_secretbox($mensagem, $nonce, $chave);
$aberto   = sodium_crypto_secretbox($cifrado, $nonce, $chave, true); // abre

echo $aberto === $mensagem ? "ok" : "falhou";
sodium_memzero($chave); // limpa a chave da memória
```

### Assinatura (sign)

```php
<?php
$keypair = sodium_crypto_sign_keypair();
$secreta = sodium_crypto_sign_secretkey($keypair);
$publica = sodium_crypto_sign_publickey($keypair);

$msg   = "documento";
$ass   = sodium_crypto_sign($msg, $secreta);
$ok    = sodium_crypto_sign_verify_detached($ass, $msg, $publica); // true
```

### Caixa autenticada (box, cifra + sign entre duas partes)

```php
<?php
$alice = sodium_crypto_box_keypair();
$bob   = sodium_crypto_box_keypair();
$nonce = random_bytes(SODIUM_CRYPTO_BOX_NONCEBYTES);

// Alice cifra para Bob usando keypair com segredo de Alice + pública de Bob
$ka = sodium_crypto_box_keypair_from_secretkey_and_publickey(
    sodium_crypto_box_secretkey($alice),
    sodium_crypto_box_publickey($bob)
);
$cifrado = sodium_crypto_box("oi Bob", $nonce, $ka);
```

### Hash genérico e comparação constante

```php
<?php
$chave = sodium_crypto_generichash_keygen();
$tag   = sodium_crypto_generichash("mensagem", $chave);

// Comparação em tempo constante (evita ataques de temporização)
if (sodium_compare($tag, $outroTag) === 0) {
    // iguais
}
```

## 4. Filtragem e validação de entrada

```php
<?php
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
$int   = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1, 'max_range' => 1000],
]);

$sanitizado = filter_var($_POST['nome'], FILTER_SANITIZE_STRING);

// Filtros úteis
FILTER_VALIDATE_EMAIL; FILTER_VALIDATE_URL; FILTER_VALIDATE_IP;
FILTER_VALIDATE_INT;   FILTER_VALIDATE_FLOAT; FILTER_VALIDATE_BOOLEAN;
FILTER_SANITIZE_STRING; FILTER_SANITIZE_EMAIL; FILTER_SANITIZE_URL;
FILTER_SANITIZE_NUMBER_INT; FILTER_SANITIZE_FULL_SPECIAL_CHARS;
FILTER_FLAG_STRIP_LOW; FILTER_FLAG_STRIP_HIGH; FILTER_FLAG_NO_ENCODE_QUOTES;
```

## 5. HMAC e comparação segura de hashes

```php
<?php
$data = "mensagem";
$mac  = hash_hmac('sha256', $data, $chaveSecreta);

// Compare em tempo constante — NUNCA use '=='
if (hash_equals($mac, $recebido)) {
    echo "autêntico";
}
```

## 6. Escape de saída

```php
<?php
echo htmlspecialchars($valor, ENT_QUOTES | ENT_HTML5, 'UTF-8');
echo htmlentities($valor, ENT_QUOTES | ENT_HTML5, 'UTF-8');
echo bin2hex(random_bytes(16)); // tokens
```

## 7. Declarações preparadas (PDO & mysqli)

```php
<?php
// PDO
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$stmt = $pdo->prepare('SELECT nome FROM usuarios WHERE id = :id');
$stmt->execute(['id' => $id]);
$nome = $stmt->fetchColumn();

// mysqli
$mysqli = new mysqli($host, $user, $pass, $db);
$stmt = $mysqli->prepare('SELECT nome FROM usuarios WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->bind_result($nome);
$stmt->fetch();
```

> No 7.2 o PDO também passou a suportar tipos nacionais de string
> (`PDO::PARAM_STR | PDO::PARAM_STR_NATL`) — útil para colunas `NCHAR`/`NVARCHAR`.

## 8. Segurança de sessão

```php
<?php
ini_set('session.cookie_secure', '1');     // HTTPS apenas
ini_set('session.cookie_httponly', '1');   // inacessível via JS
ini_set('session.use_strict_mode', '1');    // recusa IDs não gerados pelo servidor

session_start();
session_regenerate_id(true);                // troca o ID (anti-fixation) no login
```

## 9. Resumo

O 7.2 é forte em segurança: Argon2i, Sodium como core, `random_bytes/int`,
`hash_equals`, filtros e prepared statements. Evite Bcrypt fraco, e configure
cookies de sessão seguros.
