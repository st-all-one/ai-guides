# 05 — Deep configuration

## 1. Sources, precedence and restart [Community Build]

System properties are read at startup and not stored in the database. Channels, increasing precedence: `sonar.properties`, environment, command line (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/configuration-methods.md). Env var: name uppercased, `.`/`-` → `_`, so `sonar.web.systemPasscode` → `SONAR_WEB_SYSTEMPASSCODE` (source: `sonar-application/src/main/assembly/conf/sonar.properties:8-12`).

`sonar.properties` is **not reloaded by `api/system/restart`**; it needs a full restart (source: `sonar-application/src/main/assembly/conf/sonar.properties:1-6`). The endpoint restarts web, search and CE, requires `Administer System`, standalone only (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/RestartAction.java:54-68`).

Documented properties only: others raise a startup warning and may have no effect (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/configuration-methods.md).

## 2. Web, HTTP and sessions [Community Build]

Defaults and bounds (source: `sonar-application/src/main/assembly/conf/sonar.properties:97-168`; https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/system-properties.md).

| Property | Default | Effect |
|---|---|---|
| `sonar.web.host` | `0.0.0.0` | listen IP; `127.0.0.1` behind a proxy |
| `sonar.web.port` | `9000` | inbound HTTP port |
| `sonar.web.context` | empty (root) | URL prefix, starts with `/` |
| `sonar.web.http.maxThreads` | `50` | accepted concurrent connections |
| `sonar.web.http.minThreads` | `5` | minimum threads |
| `sonar.web.http.acceptCount` | `25` | queue when all threads are busy |
| `sonar.web.http.keepAliveTimeout` | `60000` | ms per connection; `-1` = infinite |
| `sonar.web.http.maxPostSize` | `-1` | POST body bytes; `-1` = unlimited |
| `sonar.web.sessionTimeoutInMinutes` | `4320` (3 days) | idle session; 6…129600 |
| `sonar.web.activeSessionTimeoutInMinutes` | `129600` (90 days) | [Server: Enterprise+] active session; 15…129600 |
| `sonar.auth.jwtBase64Hs256Secret` | empty | Base64 HS256 key; sessions survive restart |
| `sonar.web.systemPasscode` | disabled | monitoring passcode in header `X-Sonar-Passcode` |

JWT secret: `echo -n "texto" | openssl dgst -sha256 -hmac "key" -binary | base64`, unique per installation (source: `sonar-application/src/main/assembly/conf/sonar.properties:139-144`).

## 3. JDBC pool [Community Build]

Rule: `maxActive` ≈ 1.2 × `sonar.web.http.maxThreads` (60) (source: `sonar-application/src/main/assembly/conf/sonar.properties:60-75`). Code defaults (source: `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:59-61`):

| Property | Default (code) | Effect |
|---|---|---|
| `sonar.jdbc.maxActive` | `60` | simultaneous active connections |
| `sonar.jdbc.minIdle` | `10` | minimum idle connections |
| `sonar.jdbc.maxWait` | `8000` | ms to wait before an exception |

`sonar.jdbc.maxIdle` is deprecated and inert (source: `server/sonar-db-migration/src/main/java/org/sonar/db/DefaultDatabase.java:71-74`). The page https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/system-properties.md diverges (`minIdle=2`, `maxIdle=5`, `maxWait=5000`): trust the 26.12 code.

## 4. JVM: `javaOpts` × `javaAdditionalOpts` [Community Build]

`javaOpts` (web, CE, search) **replaces** all default flags; `javaAdditionalOpts` **appends** without dropping `-Xms`/`-Xmx`. With both, the second is appended to the first (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/system-properties.md).

```properties
sonar.web.javaOpts=-Xmx2G -Xms1G -server
sonar.web.javaAdditionalOpts=-Djava.security.egd=file:/dev/./urandom
sonar.ce.javaAdditionalOpts=-Dcom.sun.management.jmxremote=true
sonar.search.javaOpts=-Xmx2G -Xms2G -XX:MaxDirectMemorySize=1G
```

Defaults: web `-Xmx1G`, CE `-Xmx1536m`, search `-Xmx512m` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md). For ES, `MaxDirectMemorySize` = half the heap (source: `sonar-application/src/main/assembly/conf/sonar.properties:276-279`).

## 5. Compute Engine, search and proxy [Community Build]

| Property | Default | Effect |
|---|---|---|
| `sonar.ce.javaOpts` / `javaAdditionalOpts` | CE default heap | background-task worker JVM |
| `sonar.search.javaOpts` / `javaAdditionalOpts` | ES default heap | embedded Elasticsearch JVM |
| `sonar.search.port` | `9001` | ES HTTP; `0` picks a free port |
| `sonar.es.port` | random | TCP transport, bound to loopback |
| `sonar.search.host` | loopback | never a public address |
| `sonar.updatecenter.activate` | `true` | Marketplace plugin lookup |
| `http.proxyHost` / `http.proxyPort` | none | egress proxy; `http.nonProxyHosts` uses `|` and `*` |

Sources: `sonar-application/src/main/assembly/conf/sonar.properties:258-300`, `:312-341`. Port 9001 and the transport must not reach the Internet (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/network-rules.md).

## 6. Header SSO and LDAP [Community Build]

`sonar.web.sso.enable` defaults to `false`; default headers `X-Forwarded-Login`, `X-Forwarded-Name`, `X-Forwarded-Email`, `X-Forwarded-Groups`, `refreshIntervalInMinutes=5`. The proxy must overwrite them and send `X-Forwarded-Proto`/`X-Forwarded-For` (source: `sonar-application/src/main/assembly/conf/sonar.properties:171-195`; https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/securing-behind-proxy.md).

LDAP requires `sonar.security.realm=LDAP` and `ldap.url`; empty `ldap.bindDn`/`ldap.bindPassword` = anonymous; `ldap.authentication=simple` (default), `ldap.StartTLS=false`, `ldap.followReferrals=true`. Mapping: `ldap.user.baseDn` mandatory; default filter `(&(objectClass=inetOrgPerson)(uid={login}))`; attributes `cn` and `mail`; groups via `ldap.group.baseDn`/`ldap.group.request`/`ldap.group.idAttribute=cn` (source: `sonar-application/src/main/assembly/conf/sonar.properties:197-256`; https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/system-properties.md).

## 7. UI configuration and precedence [Community Build]

`api/settings` (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/setting/ws/SettingsWs.java:34-36`) has the `set` action (source: `server/sonar-webserver-webapi/src/main/java/org/sonar/server/setting/ws/SetAction.java:103-113`): values go to the database, changeable without editing files. Precedence between a UI key and the same key in `sonar.properties` **was not verified** — use one channel per key.

`CorePropertyDefinitions` registers manageable defaults, e.g. `sonar.projectCreation.mainBranchName=main`, `sonar.authenticator.downcase=false` (source: `sonar-core/src/main/java/org/sonar/core/config/CorePropertyDefinitions.java:99-107`, `:125-131`); the encryption key comes from a file or env var, with a previous key for rotation (source: `sonar-core/src/main/java/org/sonar/core/config/CorePropertyDefinitions.java:108-124`).

Helm: `sonarProperties` generates the file, `sonarSecretProperties` holds sensitive values; `env:` and `extraConfig` inject variables and ConfigMaps/Secrets (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/configuration-methods.md).

## Pitfalls

- `api/system/restart` does not reload `sonar.properties`: full restart required.
- `javaOpts` replaces defaults; add flags with `javaAdditionalOpts`.

## Sources

- repo ae3d6eb: `sonar-application/src/main/assembly/conf/sonar.properties:1-12`, `:60-75`, `:97-168`, `:171-195`, `:197-256`, `:258-300`, `:312-341`; `server/sonar-process/src/main/java/org/sonar/process/ProcessProperties.java:59-61`; `server/sonar-db-migration/src/main/java/org/sonar/db/DefaultDatabase.java:71-74`; `sonar-core/src/main/java/org/sonar/core/config/CorePropertyDefinitions.java:99-131`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/platform/ws/RestartAction.java:54-68`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/setting/ws/SettingsWs.java:34-36`; `server/sonar-webserver-webapi/src/main/java/org/sonar/server/setting/ws/SetAction.java:103-113`.
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/configuration-methods.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/system-properties/system-properties.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/network-rules.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/securing-behind-proxy.md
