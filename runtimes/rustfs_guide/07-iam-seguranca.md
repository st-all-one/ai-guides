# 07 — IAM, autenticação e segurança

## Identidades

| Tipo | Uso |
|---|---|
| **Root** | Credencial de bootstrap (`RUSTFS_ACCESS_KEY`/`SECRET_KEY`), poder total |
| **User** | Identidade durável com access key/secret e policies |
| **Group** | Conjunto de users com policies comuns |
| **Service account** | Credencial de máquina filha de um user, com policy própria |
| **STS** | Credenciais temporárias via `AssumeRole` / `AssumeRoleWithWebIdentity` |
| **OIDC** | Sessão federada do console/workload |
| **Keystone** | Token OpenStack `X-Auth-Token` para Swift |

Root não pode trocar as próprias credenciais em runtime e não pode ser renomeado.
Users podem trocar a senha com `POST /v3/account/password` (exige o segredo
atual), o que revoga todas as sessões STS daquela identidade. Renomear usuário
não é suportado.

## Policies

### Canned policies (8)

| Policy | Concede |
|---|---|
| `readwrite` | Todas as ações S3 + `sts:AssumeRole` |
| `readonly` | `GetObject`, `GetBucketLocation`, `GetBucketQuota` + assume |
| `writeonly` | `PutObject` + assume |
| `diagnostics` | Profiling, trace, console log, server info, top locks, health, Prometheus, bandwidth |
| `consoleAdmin` | Todas as ações admin + KMS + S3 + assume |
| `KMSKeyAdministrator` | Describe/List/Enable/Disable/Rotate/Delete key (sem encrypt/decrypt) |
| `KMSKeyUser` | GenerateDataKey/Decrypt/Describe (workloads SSE-KMS) |
| `KMSAuditor` | Describe/List apenas |

As policies KMS não concedem S3 nem administração do serviço KMS; combine com
`readwrite`, por exemplo `"readwrite,KMSKeyUser"`. `kms:Configure`,
`ServiceControl`, `ClearCache`, `Backup` e `Restore` ficam com `consoleAdmin`.

### Custom policies

- JSON no formato AWS IAM, com `Effect`, `Action`, `Resource`, `Condition`.
- Resource S3: `arn:aws:s3:::bucket` e `arn:aws:s3:::bucket/*`.
- Resource KMS: `arn:aws:kms:::key/<id>`, `arn:aws:kms:::key/app-*`,
  `arn:aws:kms:::*`; aliases ainda não resolvem.
- Ações admin usam o namespace `admin:*`; ações S3 usam `s3:*`.
- Bucket policy pode negar explicitamente, sobrepondo identity policy.
- Conditions úteis: `aws:SecureTransport`, `aws:SourceIp`, `s3:prefix`,
  `s3:delimiter`, `s3:max-keys`, `jwt:groups`, `jwt:roles`.
- ACL authorization **não** é implementada; não conte com grants por objeto.

Exemplo de policy de workload:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::app-data/*",
      "Condition": { "Bool": { "aws:SecureTransport": "true" } }
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::app-data",
      "Condition": { "StringLike": { "s3:prefix": ["tenant-a/*"] } }
    }
  ]
}
```

## STS

- `AssumeRole` (SigV4) e `AssumeRoleWithWebIdentity` (JWT de provedor OIDC).
- Credenciais temporárias com duração máxima de **12 horas**.
- `AssumeRole` exige segundo fator quando a identidade tem MFA habilitado.
- Web identity aceita POST form unsigned em `/` com
  `application/x-www-form-urlencoded`; o handler valida o token.
- Claims de sessão são derivados da identidade/policy; não confie em claims
  arbitrárias do cliente.
- `CallerIdentity` reporta sessões OIDC/Keystone como `FederatedIdentity` e
  recusa enrollment de MFA.

## OIDC / SSO do console

RustFS é relying party OIDC com **authorization code + PKCE (S256)**. Lê claims
do **ID token**; não chama UserInfo.

Configuração mínima:

```bash
RUSTFS_IDENTITY_OPENID_ENABLE=on
RUSTFS_IDENTITY_OPENID_CONFIG_URL="https://idp.example.com/.well-known/openid-configuration"
RUSTFS_IDENTITY_OPENID_CLIENT_ID="rustfs-console"
RUSTFS_IDENTITY_OPENID_CLIENT_SECRET="..."
RUSTFS_IDENTITY_OPENID_SCOPES="openid,profile,email"
RUSTFS_IDENTITY_OPENID_REDIRECT_URI="https://rustfs.example.com/rustfs/admin/v3/oidc/callback/keycloak"
```

Chaves relevantes:

| Chave | Função |
|---|---|
| `..._CONFIG_URL` | Issuer/discovery; remove `/.well-known/openid-configuration` |
| `..._ISSUER` | `iss` esperado quando difere do discovery |
| `..._CLIENT_ID` / `_SECRET` | Cliente confidencial |
| `..._SCOPES` | Lista separada por vírgula; `openid` obrigatório |
| `..._OTHER_AUDIENCES` | `aud` adicionais aceitos |
| `..._REDIRECT_URI` | Callback exato registrado no IdP |
| `..._REDIRECT_URI_DYNAMIC` | Deriva callback dos headers; mantenha `off` atrás de proxy |
| `..._CLAIM_NAME` / `_PREFIX` | Claim de policy e prefixo fixo |
| `..._GROUPS_CLAIM` / `_ROLES_CLAIM` | Arrays planos cujos valores são nomes de policy |
| `..._EMAIL_CLAIM` / `_USERNAME_CLAIM` | Identidade exibida |
| `..._ROLE_POLICY` | Policy fixa para todo login; só para teste de conectividade |
| `..._DISPLAY_NAME` / `_HIDE_FROM_UI` | UI do console |

Regras:
- Signature, `iss`, `aud`, `exp` e `nonce` são verificados; `sub` identifica o
  usuário.
- `groups`/`roles` devem ser arrays planos de nomes de policy existentes
  (`consoleAdmin`, `readwrite`, `readonly`, `writeonly`, `diagnostics` ou
  policies custom). Valores sem policy correspondente são ignorados após lookup.
- Roles claim (ex.: Entra ID) é opcional; quando configurado, também é mesclado
  em `jwt:groups` para compatibilidade.
- Provedores em rede privada/loopback exigem a origem exata em
  `RUSTFS_OUTBOUND_ALLOW_ORIGINS`.
- Workload identity (`AssumeRoleWithWebIdentity`) com discovery sem
  `authorization_endpoint` exige `HIDE_FROM_UI=on`.
- Callback: `{origin}/rustfs/admin/v3/oidc/callback/{provider_id}`. Atrás de LB,
  garanta afinidade entre authorize e callback ou fixe
  `RUSTFS_BROWSER_REDIRECT_URL`.
- Sessão do console: `RUSTFS_CONSOLE_OIDC_SESSION_DURATION` (default 3600s, máx.
  604800s). `RUSTFS_CONSOLE_AUTH_TIMEOUT` é timeout HTTP, não duração de sessão.
- Logout RP-initiated usa `end_session_endpoint` quando anunciado.

Keycloak: issuer `https://host/realms/<realm>`, client confidencial, scopes
`openid,profile,email`, mapper de grupo com **full path off** (barra inicial
quebra o match), grupos multivalorados no ID/access token.

## Keystone / OpenStack

Para Swift API:

```bash
RUSTFS_KEYSTONE_ENABLE=true
RUSTFS_KEYSTONE_AUTH_URL=https://keystone.example.com
RUSTFS_KEYSTONE_VERSION=v3
RUSTFS_KEYSTONE_ADMIN_USER=admin
RUSTFS_KEYSTONE_ADMIN_PASSWORD=...
RUSTFS_KEYSTONE_ADMIN_PROJECT=service
RUSTFS_KEYSTONE_ADMIN_DOMAIN=Default
RUSTFS_KEYSTONE_VERIFY_SSL=true
RUSTFS_KEYSTONE_ENABLE_CACHE=true
RUSTFS_KEYSTONE_CACHE_SIZE=10000
RUSTFS_KEYSTONE_CACHE_TTL=300
RUSTFS_KEYSTONE_TENANT_PREFIX=true
RUSTFS_KEYSTONE_IMPLICIT_TENANTS=true
RUSTFS_KEYSTONE_TIMEOUT=30
```

O Swift usa `X-Auth-Token`; o middleware Keystone valida o token e impõe
isolamento por tenant. O build precisa de `--features swift`.

## MFA / TOTP

- TOTP de 6 dígitos, skew de ±1 passo (±30s), replay bloqueado por high-water
  mark.
- 5 tentativas falhas → lockout de 15 min, dobrando até 1h.
- Challenge de login expira em 5 min; enrollment pendente em 10 min.
- Recovery codes são single-use.
- **Exige `RUSTFS_IAM_MASTER_KEY`**; sem ela, enrollment é recusado (não grava
  segredo em plaintext).
- 2FA **não** protege requisições SigV4 diretas: quem tem a secret key já tem
  acesso. O gate é para `AssumeRole`/sessões.
- Sessões OIDC/Keystone não são gated.
- Service account não gerencia o fator do parent.
- Root não pode trocar as próprias credenciais em runtime; planeje a rotação via
  ambiente/restart.
- Eventos de audit: `iam:Identity:CredentialChanged`,
  `iam:Identity:AuthChallenge`.

## TLS e mTLS

- `RUSTFS_TLS_PATH` com `rustfs_cert.pem`/`rustfs_key.pem`; SNI em
  subdiretórios por domínio.
- `RUSTFS_TLS_RELOAD_ENABLE=true` recarrega sem restart (intervalo 30s).
- `RUSTFS_SERVER_MTLS_ENABLE=true` exige certificado de cliente; use
  `client_ca.crt` (fallback `ca.crt` no load inicial).
- Identidade outbound default: `client_cert.pem`/`client_key.pem`.
- `RUSTFS_MTLS_CLIENT_CERT`/`_KEY` substituem a identidade; validação é conjunta
  (um inválido rejeita a atualização, não faz fallback silencioso).
- Kubernetes: monte o diretório inteiro; `subPath` não recebe updates de Secret.
- Rotação externa: um controller publica via
  `POST /rustfs/admin/v3/tls/certificate` (`admin:TLSCertificatePublish`) e
  consulta `GET /rustfs/admin/v3/tls/certificate-state`
  (`admin:TLSCertificateStatus`).
- Para VM/Docker, `RUSTFS_TLS_PUBLISH_DIR` deve ser um diretório persistente
  `0700`, separado do material inicial. A request fixa
  `expected_target_revision` + `issuance_id`; `409` = conflito, `503`/resposta
  incerta = repita o **mesmo** payload. O RustFS valida e publica geração
  imutável; não é ACME nem HA controller.
- Após rotação, verifique handshake novo em cada endpoint (SAN, serial,
  fingerprint e validade). Sucesso em um nó não prova convergência dos demais.
- Renovação normal preserva uploads/sessões; material inválido mantém a última
  configuração aceita e pode impedir startup após restart.
- SSE-C deve ser usado sobre TLS; `RUSTFS_SSE_C_REQUIRE_TLS=true` rejeita
  headers SSE-C em transporte plaintext (incluindo copy-source).
- TLS 1.2/1.3; HTTP/3 exige TLS 1.3 e build `http3`.

## Segurança internode

- Com peers remotos, defina `RUSTFS_RPC_SECRET` explicitamente. Se omitido, o
  segredo é derivado do par access/secret ativo; credenciais default (`rustfsadmin`)
  fazem o startup abortar com
  `store init aborted: endpoints include remote nodes but ...`.
- Prefira TLS/mTLS entre nós, especialmente cruzando redes não confiáveis.
- RPC tem replay cache, assinatura e limites de mensagem; não desative as flags
  `*_STRICT` em produção.
- `RUSTFS_INTERNODE_OFFLINE_BYPASS` e knobs de reconexão existem para tuning;
  não são autorização.

## Egress e SSRF

RustFS valida destinos outbound configurados (webhook, audit, OIDC, object
lambda, tier, replicação, ODM).

| Camada | Quem usa | Escape |
|---|---|---|
| URL literal | replication, site replication, tier, Keystone, ODM | Endereços privados permitidos em replication/tier/ODM; loopback só com flags específicas |
| Full policy | webhook, audit webhook, target validation, OIDC, object lambda | `RUSTFS_OUTBOUND_ALLOW_ORIGINS` para loopback/private/shared/reserved |

`RUSTFS_OUTBOUND_ALLOW_ORIGINS` aceita **origens exatas**
(`scheme://host:port`), sem path/query/userinfo, separadas por vírgula. Mesmo
allowlist, metadata endpoints e link-local continuam bloqueados. A política é
lida no startup.

## Hardening checklist

- [ ] Trocar `rustfsadmin/rustfsadmin`; usar `*_FILE` para segredos.
- [ ] Definir `RUSTFS_RPC_SECRET` e `RUSTFS_IAM_MASTER_KEY` únicos.
- [ ] TLS em S3 e console; mTLS para admins quando possível.
- [ ] Console não exposto à internet sem OIDC/reverse proxy autenticado.
- [ ] Remover permissões `admin:*` de workloads; usar policies mínimas.
- [ ] Bucket policies com `Deny` explícito para `aws:SecureTransport=false`.
- [ ] Public Access Block por default; website só em buckets dedicados.
- [ ] Ativar rate limit (`RUSTFS_API_RATE_LIMIT_*`) e limites de conexão.
- [ ] Configurar audit para sink imutável e alertar em `AccessDenied`,
      mudanças IAM/KMS e falhas de auth.
- [ ] Ativar MFA para humanos, ciente de que SigV4 direto não é gated.
- [ ] Revisar `RUSTFS_OUTBOUND_ALLOW_ORIGINS`; não usar skip-TLS-verify.
- [ ] Rotacionar chaves KMS e credenciais de replicação.
- [ ] Não usar ACL (não suportada) como modelo de autorização.

## Fonte

`crates/policy/src/policy/policy.rs` (canned policies);
`docs/operations/oidc-console-integration.md`;
`docs/operations/oidc-provider-requirements.md`;
`docs/operations/two-factor-auth.md`;
`docs/operations/outbound-connection-policy.md`;
`docs/operations/tls-certificate-rotation.md`;
`docs/operations/internode-grpc-benchmark-runbook.md`;
`crates/keystone/src/config.rs`.
