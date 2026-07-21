# Modern Authentication

## Caminho Evolutivo (MDN)

```
Passwords (baseline, fraco isoladamente)
  → + OTP (MFA, ainda phishable)
  → Federated Identity (reduz reuso, dependência de IdP)
  → Passkeys/WebAuthn (estado alvo: phishing-resistant, sem shared secrets)
```

---

## 1. Passkeys / WebAuthn (Estado Alvo)

**Nível de segurança:** ALTO — phishing-resistant, sem shared secrets no servidor

### Arquitetura
- Par de chaves assimétricas por usuário/site
- Chave privada armazenada no authenticator (platform: Touch ID, Windows Hello; roaming: YubiKey)
- Chave pública armazenada no servidor
- Autenticação via assinatura digital de um challenge

### Registration (navigator.credentials.create)
```js
const cred = await navigator.credentials.create({
  publicKey: {
    challenge: serverChallenge,       // random, server-generated
    rp: { name: "Example", id: "example.com" },
    user: {
      id: new Uint8Array([/* bytes */]),
      name: "user@example.com",
      displayName: "User Name",
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
    authenticatorSelection: {
      residentKey: "required",        // discoverable credential
      requireResidentKey: true,
    },
  },
});
```

### Authentication (navigator.credentials.get)
```js
const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: serverChallenge,
    rpId: "example.com",
    allowCredentials: [],             // vazio = discoverable
    userVerification: "preferred",
  },
});
```

### Conditional Mediation (autofill UI)
```html
<input type="text" name="username" autocomplete="username webauthn" />
```
```js
navigator.credentials.get({ publicKey: options, mediation: "conditional" });
```

### Conditional Create (silent — cria passkey após login com senha)
```js
navigator.credentials.create({ publicKey: options, mediation: "conditional" });
```

### Propriedades Críticas
| Propriedade | Detalhe |
|-------------|---------|
| **RP ID** | Escopo da passkey = domain component. `register.example.com` pode criar RP ID `example.com` |
| **Origin verification** | Assertion inclui caller origin + embedding context — server deve verificar |
| **User Verification** | PIN/biométrica = MFA (something you have + something you know/are) |
| **Discoverable credentials** | Passkeys devem ser discoverable (resident keys) |
| **Backup** | Assertion inclui flags `backup_eligible` e `backed_up` |
| **Signal API** | `signalUnknownCredential()`, `signalAllAcceptedCredentials()`, `signalCurrentUserDetails()` |

### Migração de senhas para passkeys
1. Enable passkey creation alongside passwords
2. Enable passkey usage via conditional mediation (autofill)
3. Retire passwords (usuário pode deletar senha após criar passkey com backup)

---

## 2. Session Management

### Modelo Centralizado (Recomendado)
- Server cria estado de sessão, gera session ID aleatório
- Session ID armazenado em cookie com atributos de segurança
- Server faz lookup do estado a cada request

### Modelo Descentralizado (JWT)
- Token auto-contido com claims assinadas
- Usar refresh tokens (access token curto, refresh token longo)
- Dificuldade: invalidar sessão (token não pode ser deletado do cliente)

### Cookie Attributes para Session ID
```
Set-Cookie: session_id=<random>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
```

| Atributo | Função |
|----------|--------|
| `HttpOnly` | Inacessível via JavaScript (mitiga XSS) |
| `Secure` | Apenas HTTPS |
| `SameSite=Lax` (ou `Strict`) | Mitiga CSRF |
| `Max-Age` | Expiração |
| `__Host-` prefix | Previne overwrite por insecure sources |

### Session Timeouts
| Tipo | Comportamento |
|------|--------------|
| **Idle timeout** | Após período sem requests |
| **Absolute timeout** | Após período fixo |
| **Renewal timeout** | Rotation de session ID sem reautenticação |

### Invalidar sessão em:
- Mudança de senha
- Sign-in de novo dispositivo/IP
- Atividade suspeita

---

## 3. One-Time Passwords (OTP)

### TOTP (Recomendado — RFC 6238)
```
otpauth://totp/LABEL?secret=MQCHJLS6FJXT2BGQJ6QMG3WCAVUC2HJZ&issuer=My_Website
```
- 6 dígitos, 30 segundos de validade
- Secret mínimo 160 bits, armazenar com mesmo rigor que senha

### SMS/Email OTP
- Formatar SMS com origin-bound code:
```
Your verification code is 123456.
@www.example.com #123456
```
- HTML com autocomplete:
```html
<input autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="\d{6}" />
```

---

## 4. Federated Identity (OIDC)

### Fluxo correto: Authorization Code Flow + PKCE (NUNCA Implicit Flow)

```
Browser → RP → IdP (authorization endpoint)
← authorization code
RP → IdP (token endpoint: code + client_secret + code_verifier)
← access token + ID token (JWT assinado)
RP valida signature do ID token → sign in
```

### PKCE (RFC 7636)
- Code verifier aleatório por request
- Hash enviado como `code_challenge`
- IdP hasheia `code_verifier` e compara
- Defende contra: CSRF no redirect URL + authorization code injection

### FedCM (Federated Credential Management API)
- Browser gerencia interação RP ↔ IdP
- Sem dependência de third-party cookies
- Status: emergente, suporte cruzado ainda limitado

---

## 5. Passwords (Fallback)

### Boas práticas
- **Hash storage:** Argon2id > scrypt > bcrypt > PBKDF2 — com salt único por senha
- **Max length:** mínimo 64 caracteres, permitir Unicode
- **Não** exigir tipos específicos de caractere (impede passphrases)
- **Autocomplete:** `autocomplete="username"`, `autocomplete="new-password"`, `autocomplete="current-password"`
- **Password reset:** mesma resposta para email existente ou não (previne enumeração)
- **MFA** como complemento obrigatório se usar senhas
