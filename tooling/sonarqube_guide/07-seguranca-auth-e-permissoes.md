# 07 — Security, authentication and permissions

## 1. Model and edition [Community Build]

The Community Build keeps its own user database and delegates authentication to HTTP headers, LDAP, SAML (Entra ID, Keycloak, Okta), GitHub, Bitbucket Cloud and GitLab; each method covers identity, authentication, provisioning and optional group sync (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/overview.md).

Only **Just-in-Time** provisioning exists: accounts are created on first login and memberships of existing groups are refreshed on every login; groups must exist beforehand. Automatic provisioning is [Server] (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/overview.md). Rename `sonar-administrators` (sync may grant unintended access) and deactivate the local account when disabling a user in the IdP: tokens are not revoked automatically (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/overview.md).

## 2. Tokens and Web API [Community Build]

`api/user_tokens` lists, creates and revokes tokens (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokensWs.java:35`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokenSupport.java:46`):

```bash
curl -u "$SONAR_TOKEN:" -X POST \
  "https://sq.example.com/api/user_tokens/generate?login=ci-bot&name=pipeline"
curl -u "$SONAR_TOKEN:" -X POST \
  "https://sq.example.com/api/user_tokens/revoke?login=ci-bot&name=pipeline"
```

No `sonar.user.Token*` property in the checkout: tokens are user credentials handled via UI/WS. An admin generates a User token for someone else and revokes any token under **Administration > Security > Users**; maximum lifetime is [Server] (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/security/administering-tokens.md).

## 3. JWT, passcode and encryption [Community Build]

`sonar.auth.jwtBase64Hs256Secret` is a per-installation Base64 HS256 key; without it sessions die on restart (source: `sonar-application/src/main/assembly/conf/sonar.properties:139-144`). `sonar.web.systemPasscode` authenticates monitoring tools on web services selected via the `X-Sonar-Passcode` header; default disabled (source: `sonar-application/src/main/assembly/conf/sonar.properties:163-168`).

Sensitive properties in files or the UI use AES-256: key in `~/.sonar/sonar-secret.txt` or `sonar.secretKeyPath`, with a previous key for rotation (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/security/encrypting-settings.md; `sonar-core/src/main/java/org/sonar/core/config/CorePropertyDefinitions.java:108-124`). Encrypted value: `{aes-gcm}…`. On Helm, `sonarSecretProperties` references a secret holding `secret.properties` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/customizing-helm-chart.md).

## 4. Header SSO [Community Build]

`sonar.web.sso.enable` defaults to `false`. Headers: `X-Forwarded-Login` (alphanumerics, `.` and `@`), `X-Forwarded-Name`, `X-Forwarded-Email`, `X-Forwarded-Groups` (comma-separated); `refreshIntervalInMinutes=5` (source: `sonar-application/src/main/assembly/conf/sonar.properties:171-195`). The proxy must overwrite these headers and send `X-Forwarded-Proto`/`X-Forwarded-For` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/securing-behind-proxy.md). Unknown groups are ignored; if none exist, only the default group remains, always applied (source: `sonar-application/src/main/assembly/conf/sonar.properties:187-191`).

## 5. LDAP [Community Build]

```properties
sonar.security.realm=LDAP
ldap.url=ldaps://ldap.example.com:636
ldap.bindDn=cn=sonar,ou=users,dc=example,dc=com
ldap.bindPassword={aes-gcm}...
ldap.authentication=simple
ldap.followReferrals=false
ldap.user.baseDn=ou=Users,dc=example,dc=com
ldap.user.request=(&(objectClass=inetOrgPerson)(uid={login}))
ldap.group.baseDn=ou=Groups,dc=example,dc=com
ldap.group.request=(&(objectClass=groupOfUniqueNames)(uniqueMember={dn}))
```

Empty `bindDn`/`bindPassword` = anonymous bind; `simple` sends the password in clear text without LDAPS/StartTLS. Active Directory: `(&(objectClass=user)(sAMAccountName={login}))` and `(&(objectClass=group)(member={dn}))`. Defaults: `ldap.user.realNameAttribute=cn`, `emailAttribute=mail`, `group.idAttribute=cn` (source: `sonar-application/src/main/assembly/conf/sonar.properties:197-256`). Synchronization accepts static groups only. `ldap.servers=a,b` is **not** failover: the first login binds the account to one server; another server creates a distinct user and an e-mail conflict. Logins get a random suffix and the IdP is `LDAP_<server_key>` (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/ldap.md).

## 6. SAML, GitHub and GitLab — edition [Community Build]

| Method | Keys in the settings classes |
|---|---|
| SAML (SP-initiated) | `sonar.auth.saml.enabled`, `.providerId`, `.loginUrl`, `.certificate.secured`, `.user.login`, `.group.name`, `.signature.enabled` (source: `server/sonar-auth-saml/src/main/java/org/sonar/auth/saml/SamlSettings.java:35-51`) |
| GitHub | `sonar.auth.github.enabled`, `.clientId.secured`, `.clientSecret.secured`, `.appId`, `.privateKey.secured`, `.allowUsersToSignUp`, `.groupsSync`, `.organizations` (source: `server/sonar-auth-github/src/main/java/org/sonar/auth/github/GitHubSettings.java:51-65`) |
| GitLab | `sonar.auth.gitlab.enabled`, `.url`, `.applicationId.secured`, `.secret.secured`, `.allowUsersToSignUp`, `.allowedGroups` (source: `server/sonar-auth-gitlab/src/main/java/org/sonar/auth/gitlab/GitLabSettings.java:43-48`) |

SAML with a signed+encrypted assertion fails under FIPS (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md). Automatic provisioning for these providers is [Server]; here it is JIT (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/overview.md).

## 7. Groups and permissions [Community Build]

Global: `Administer System`, `Administer Quality Gates`, `Administer Quality Profiles`, `Execute analysis`, `Create Projects`, `Create Applications`, `Create Portfolios`. `Execute analysis` is already granted to `sonar-users`: those users see branch status of any project — review after installing. Project-level: `Browse`, `See Source Code`, `Administer Issues`, `Administer Security Hotspots`, `Administer project`, `Execute Analysis on project`. Templates set initial permissions by default or by key regex (`^abc-(def1|def2)-.*`); multiple matching templates raise an error (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/user-management/user-permissions.md).

New projects are public by default; change it under **Administration > Projects > Management**. Lost admin access: `insert into user_roles(uuid,user_uuid,role) values (...,'admin')` or `update users ... active='true'` on the `admin` account (source: https://docs.sonarsource.com/sonarqube-community-build/instance-administration/user-management/user-permissions.md).

## Pitfalls

- A proxy that does not overwrite `X-Forwarded-*` lets attackers forge a header-SSO login.
- `ldap.followReferrals=true` with LDAPS on 636 causes `No subject alternative DNS name`; use 3269 and/or `false`.
- Group sync deletes manual memberships; create the groups first.

## Sources

- repo ae3d6eb: `sonar-application/src/main/assembly/conf/sonar.properties:139-168`, `:171-195`, `:197-256`; `sonar-core/src/main/java/org/sonar/core/config/CorePropertyDefinitions.java:108-124`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokensWs.java:35`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/usertoken/ws/UserTokenSupport.java:46`; `server/sonar-auth-saml/src/main/java/org/sonar/auth/saml/SamlSettings.java:35-51`; `server/sonar-auth-github/src/main/java/org/sonar/auth/github/GitHubSettings.java:51-65`; `server/sonar-auth-gitlab/src/main/java/org/sonar/auth/gitlab/GitLabSettings.java:43-48`.
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/authentication/ldap.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/security/administering-tokens.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/security/encrypting-settings.md
- https://docs.sonarsource.com/sonarqube-community-build/instance-administration/user-management/user-permissions.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/customizing-helm-chart.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/securing-behind-proxy.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
