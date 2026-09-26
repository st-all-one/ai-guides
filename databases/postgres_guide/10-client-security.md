# Segurança no Cliente — PostgreSQL 18.4

Baseado em: `04-Client-Interfaces/libpq-connect.html`, `libpq-ssl.html`, `libpq-envars.html`, `libpq-pgpass.html`, `libpq-oauth.html`, `03-Server-Administration/auth-oauth.html`, `auth-pg-hba-conf.html`, `ssl-tcp.html`, `ssh-tunnels.html`

---

## 1. SSL/TLS no Cliente — O Grande Perigo

### sslmode=prefer é o DEFAULT e Inseguro

O `sslmode` padrão é `prefer`. A própria documentação afirma: **"this makes no sense from a security point of view"**. Em modo `prefer`, o cliente tenta SSL primeiro, mas se o servidor não oferecer SSL (ou se um atacante bloquear a tentativa SSL), a conexão cai para texto claro **sem aviso**.

✅ Produção exige `sslmode=verify-full`.

### Os 6 Modos de SSL

| sslmode | Protege eavesdropping | Protege MITM | Declaração |
|---------|----------------------|--------------|------------|
| `disable` | Não | Não | "Não me importo com segurança" |
| `allow` | Talvez | Não | "Aceito SSL se o servidor insistir" |
| `prefer` (default) | Talvez | Não | **"Não me importo com criptografia"** |
| `require` | Sim | **Não** | "Confio que a rede me levará ao servidor certo" |
| `verify-ca` | Sim | Depende da CA | "Confio em servidores assinados pela CA" |
| `verify-full` | Sim | **Sim** | "Exijo servidor específico, verificado por CA + hostname" |

📝 `require` criptografa o tráfego mas **não protege contra MITM** — um atacante pode apresentar qualquer certificado.

### Regra de Ouro

```conf
# ✅ Produção: string de conexão segura
sslmode=verify-full sslrootcert=/caminho/root.crt

# Ou usando CA do sistema:
sslmode=verify-full sslrootcert=system
```

✅ `sslrootcert=system` força `verify-full` automaticamente e rejeita modos mais fracos.

### ssl_min_protocol_version

Default `TLSv1.2` — não reduzir. Valores válidos: `TLSv1`, `TLSv1.1`, `TLSv1.2`, `TLSv1.3`.

⚠️ `TLSv1` e `TLSv1.1` são obsoletos e vulneráveis.

### sslnegotiation (PG17+)

Modo `direct` reduz uma viagem de ida-e-volta (round trip) na negociação SSL:

```conf
# Reduz latência de conexão — requer servidor PG17+
sslnegotiation=direct sslmode=require
```

⚠️ `direct` só funciona com `sslmode=require` ou superior.

### sslsni — Server Name Indication

Default ligado (1). Útil para proxies que roteiam conexões SSL sem descriptografar. Desvantagem: o hostname destino aparece em texto claro no tráfego.

```conf
# Desabilitar SNI se privacidade de hostname for crítica
sslsni=0
```

---

## 2. require_auth (PG18) — Cliente Exige Método de Auth

O cliente pode **exigir** que o servidor use um método de autenticação específico:

```conf
# Exige SCRAM-SHA-256 — falha se servidor oferecer outro método
require_auth=scram-sha-256
```

Múltiplos métodos podem ser listados (separados por vírgula). Use prefixo `!` para **negar** métodos:

```conf
# Não aceita md5 nem password (texto claro)
require_auth=!md5,!password
```

Método especial `none` (servidor não pode desafiar o cliente):

```conf
# Exige que servidor NÃO peça autenticação
require_auth=none
```

⚠️ Negados e não-negados não podem ser combinados na mesma lista.

Métodos suportados: `password`, `md5` ⚠️, `gss`, `sspi`, `scram-sha-256`, `oauth`, `none`.

---

## 3. channel_binding — SCRAM sobre SSL

Channel binding ata o handshake SCRAM ao canal TLS, impedindo que um servidor impostor retransmita a autenticação.

| Modo | Comportamento |
|------|---------------|
| `disable` | Desliga channel binding |
| `prefer` (default com SSL) | Usa se disponível |
| `require` | **Obrigatório** — falha se servidor não suportar |

```conf
# ✅ Máxima proteção contra servidor impostor
channel_binding=require
```

⚠️ Só funciona com SSL + servidor PG11+ + SCRAM.

---

## 4. Certificados do Cliente

### Localização Padrão (Unix)

| Arquivo | Conteúdo |
|---------|----------|
| `~/.postgresql/postgresql.crt` | Certificado do cliente |
| `~/.postgresql/postgresql.key` | Chave privada do cliente |
| `~/.postgresql/root.crt` | CAs confiáveis (verificação servidor) |
| `~/.postgresql/root.crl` | Lista de revogação de certificados |

Windows: `%APPDATA%\postgresql\` (mesmos nomes de arquivo).

### Permissão 0600 Obrigatória

🛑 No Unix, se `postgresql.key` não tiver permissão `0600`, o arquivo é **IGNORADO SILENCIOSAMENTE** — sem erro, sem log. O certificado não será enviado.

```bash
chmod 0600 ~/.postgresql/postgresql.key
```

Exceção: `0640` com dono root + grupo do usuário (para gerenciamento via SO).

### Chave Criptografada

```conf
# Fornecer senha da chave na string de conexão
sslkey=~/.postgresql/postgresql.key sslpassword=minha-senha-aqui
```

Se `sslpassword` não for fornecido e a chave estiver criptografada, o OpenSSL solicita interativamente.

### sslkeylogfile — Debug de SSL

Grava chaves de sessão no formato NSS para inspeção com Wireshark:

```conf
sslkeylogfile=/tmp/pg-keys.log
```

⚠️ `sslkeylogfile` deve ser tratado com o **mesmo cuidado que a chave privada** — expõe todo o tráfego SSL.

### sslcertmode

| Modo | Comportamento |
|------|---------------|
| `disable` | Nunca envia certificado do cliente |
| `allow` (default) | Envia se servidor solicitar |
| `require` | Servidor **deve** solicitar certificado |

---

## 5. OAuth (PG18) — Novo Recurso

### Device Authorization Flow (RFC 8628)

Autenticação OAuth 2.0 via fluxo de dispositivo:

```conf
psql 'dbname=postgres oauth_issuer=https://exemplo.com oauth_client_id=meu-cliente'
```

O cliente exibe URL e código para o usuário autenticar no navegador:

```
Visit https://exemplo.com/device and enter the code: ABCD-EFGH
```

### Parâmetros Obrigatórios

- `oauth_issuer` — URL HTTPS do issuer (deve bater exatamente com o servidor)
- `oauth_client_id` — ID do cliente OAuth

### Opcionais

- `oauth_client_secret` — senha do cliente (se o provider exigir)
- `oauth_scope` — escopos OAuth (avançado; normalmente obtido do servidor)

### Issuers São Altamente Privilegiados

⚠️ A documentação adverte: se você não confiasse no operador de uma URL para **acessar seus servidores** ou **se passar por você**, essa URL não deve ser usada como `oauth_issuer`.

O valor de `oauth_issuer` deve:
1. Bater exatamente com o `issuer` configurado no servidor (pg_hba.conf)
2. Bater exatamente com o issuer identifier no discovery document
3. Ser uma URL HTTPS

### PGOAUTHDEBUG=UNSAFE — 🛑 NUNCA USAR EM PRODUÇÃO

```bash
# 🛑 Modo debug perigoso — apenas desenvolvimento local
export PGOAUTHDEBUG=UNSAFE
```

O modo `UNSAFE`:
- Permite HTTP não criptografado na troca OAuth
- Substitui CAs confiáveis via `PGOAUTHCAFILE`
- Exibe tráfego HTTP (com secrets) em stderr
- Permite intervalos de retry de 0 segundos (busy-loop CPU)

### PQsetAuthDataHook

Permite implementar fluxos OAuth customizados via callback C. Tipos de hook:

- `PQAUTHDATA_PROMPT_OAUTH_DEVICE` — substitui prompt padrão do dispositivo
- `PQAUTHDATA_OAUTH_BEARER_TOKEN` — fluxo OAuth completamente customizado

---

## 6. O Arquivo .pgpass

### Localização

| SO | Caminho |
|----|---------|
| Unix | `~/.pgpass` (ou `$HOME/.pgpass`) |
| Windows | `%APPDATA%\postgresql\pgpass.conf` |

### Formato

```
hostname:port:database:username:password
```

Campos podem usar `*` como curinga. Escape de `:` e `\` com `\`.

```
# Exemplo: senha para qualquer db, qualquer user, em localhost:5432
localhost:5432:*:*:minha-senha-aqui
```

### 🛑 Permissão 0600 Obrigatória

No Unix, se as permissões do `.pgpass` não forem `0600`, o arquivo é **IGNORADO SILENCIOSAMENTE** — sem erro, sem log. A conexão falha pedindo senha manualmente.

```bash
chmod 0600 ~/.pgpass
```

### Ordem de Precedência de Senhas

1. `password` na string de conexão
2. `PGPASSWORD` (variável de ambiente)
3. `.pgpass` / `pgpass.conf`
4. Prompt interativo

---

## 7. Variáveis de Ambiente — Superfície de Ataque

### 🛑 PGPASSWORD — Não Recomendado

```bash
# 🛑 NUNCA use em produção — visível em 'ps' para outros usuários
export PGPASSWORD='minha-senha'
```

⚠️ A documentação desencoraja explicitamente: "some operating systems allow non-root users to see process environment variables via ps".

### Variáveis de Segurança (Env → Parâmetro)

| Variável | Parâmetro | Notas |
|----------|-----------|-------|
| `PGSSLMODE` | `sslmode` | Default `prefer` — mudar para `verify-full` |
| `PGREQUIREAUTH` | `require_auth` | PG18 |
| `PGPASSFILE` | `passfile` | Caminho alternativo para `.pgpass` |
| `PGCHANNELBINDING` | `channel_binding` | `require` para máxima segurança |
| `PGSSLROOTCERT` | `sslrootcert` | `system` para usar CA do SO |
| `PGSSLCRL` | `sslcrl` | CRL do servidor |
| `PGSSLCRLDIR` | `sslcrldir` | Diretório de CRLs |
| `PGSSLSNI` | `sslsni` | SNI on/off |
| `PGREQUIREPEER` | `requirepeer` | Verificação UID do servidor (socket Unix) |
| `PGCONNECT_TIMEOUT` | `connect_timeout` | Timeout por host |
| `PGSSLMINPROTOCOLVERSION` | `ssl_min_protocol_version` | `TLSv1.2` default |
| `PGSSLMAXPROTOCOLVERSION` | `ssl_max_protocol_version` | Raro, apenas debug |
| `PGGSSENCMODE` | `gssencmode` | `disable/prefer/require` |
| `PGSSLCERT` | `sslcert` | Caminho certificado cliente |
| `PGSSLKEY` | `sslkey` | Caminho chave privada |
| `PGSSLCERTMODE` | `sslcertmode` | `disable/allow/require` |
| `PGSSLNEGOTIATION` | `sslnegotiation` | `postgres/direct` (PG17+) |
| `PGSSLCOMPRESSION` | `sslcompression` | Default 0 (inseguro) |

⚠️ Variáveis de ambiente podem ser lidas por processos não-root em muitos sistemas.

---

## 8. search_path na Conexão — Prevenção de SQL Injection

A documentação adverte explicitamente: se usuários não confiáveis têm acesso a schemas públicos, o `search_path` deve ser limpo ao conectar.

```conf
# ✅ Conectar com search_path vazio
options=-csearch_path=
```

Equivalente via SQL após conectar:

```sql
SELECT pg_catalog.set_config('search_path', '', false);
```

✅ Isso remove schemas public-writable do path, prevenindo ataques de trojan (criação de objetos maliciosos em schemas públicos que sombreiam objetos do sistema).

---

## 9. Server-Side SSL/TLS Reforçado

### Configuração Mínima

```conf
ssl = on
ssl_ca_file = 'root.crt'
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'      # permissão 0600 obrigatória
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
```

### ssl_groups (PG18)

```conf
ssl_groups = 'X25519:prime256v1'
```

### Forçar SSL no pg_hba.conf

```conf
# ✅ Apenas SSL para acesso remoto
hostssl all all 0.0.0.0/0 scram-sha-256

# 🛑 Rejeitar conexões sem SSL
hostnossl all all 0.0.0.0/0 reject
```

### Autenticação via Certificado do Cliente

```conf
# Verifica CA + CN do certificado
hostssl all all 0.0.0.0/0 cert clientcert=verify-full
```

Ou combinado com SCRAM:

```conf
# SSL + certificado + SCRAM
hostssl all all 0.0.0.0/0 scram-sha-256 clientcert=verify-full
```

---

## 10. SSH Tunnels como Alternativa

Quando SSL não é viável (clientes antigos, bibliotecas sem suporte SSL):

```bash
# Cliente → servidor SSH → PostgreSQL (localhost)
ssh -L 63333:localhost:5432 joe@foo.com

# Conecta via túnel
psql -h localhost -p 63333 postgres
```

⚠️ O trecho SSH → PostgreSQL **não é criptografado** (estão na mesma máquina). O túnel criptografa apenas cliente → servidor SSH.

### requirepeer — Verificação UID via Socket Unix

Para conexões via socket Unix sem SSL, use `requirepeer` para verificar que o servidor está rodando sob um UID específico:

```conf
requirepeer=postgres
```

📝 Útil quando o socket está em `/tmp` (publicamente gravável) — garante que você está conectado ao servidor certo.

⚠️ Só disponível em plataformas que suportam autenticação `peer`.

---

## 11. GSSAPI Encryption

### gssencmode

| Modo | Comportamento |
|------|---------------|
| `disable` | Apenas conexão sem GSSAPI |
| `prefer` (default) | Tenta GSSAPI primeiro; fallback para non-GSSAPI |
| `require` | Apenas conexão GSSAPI |

⚠️ Se GSSAPI encryption é possível, ela tem **prioridade sobre SSL**, independente de `sslmode`. Para forçar SSL, use `gssencmode=disable`.

### gssdelegation

```conf
# Default: não delegar credenciais
gssdelegation=0

# Se precisar forward de credenciais:
gssdelegation=1
```

⚠️ `gssdelegation=1` encaminha credenciais GSS para o servidor — use apenas quando necessário.

---

## 12. Armadilhas Comuns (Common Pitfalls)

### 🛑 Usar PGPASSWORD em Produção

A variável `PGPASSWORD` é visível para outros processos via `ps`. Use `.pgpass` com permissão `0600`.

### 🛑 sslmode=prefer em Ambiente Sensível

Default do PostgreSQL. Não protege contra MITM. Um atacante pode forçar fallback para texto claro sem que o cliente perceba.

### 🛑 .pgpass com Permissão Errada (0640, 0644, etc.)

O arquivo é **ignorado silenciosamente**. Nenhum erro é emitido. A conexão simplesmente pede senha ou falha.

### 🛑 PGOAUTHDEBUG=UNSAFE em Produção

Exibe tokens OAuth em stderr, permite HTTP, substitui CAs confiáveis. Vaza credenciais para logs e terceiros.

### ⚠️ verify-ca sem Verificar Hostname

`verify-ca` verifica a assinatura da CA mas **não confere se o certificado é para o servidor correto**. Se uma CA pública for usada, qualquer um pode obter um certificado válido para outro hostname.

### ⚠️ Não Configurar search_path

Usuários não confiáveis com acesso a schemas públicos podem criar objetos maliciosos que sombreiam objetos do sistema (trojan attack).

### ⚠️ sslkeylogfile Ativado sem Precaução

O arquivo de log contém chaves de sessão que permitem descriptografar todo o tráfego SSL gravado. Tratar como chave privada.

### 🛑 Chave Privada com Permissão 0644

A chave do cliente (`postgresql.key`) ou do servidor (`server.key`) com permissões erradas é **ignorada silenciosamente** no cliente, e impede a inicialização do servidor.

### ⚠️ GSSAPI Encryption sem SSL

GSSAPI encryption tem prioridade sobre SSL. Se Kerberos estiver disponível, `sslmode` pode ser ignorado. Verifique `gssencmode` se SSL for obrigatório.

### ⚠️ sslnegotiation=direct com sslmode fraco

`direct` requer `sslmode=require` ou superior; caso contrário, pode levar a fallback inseguro.
