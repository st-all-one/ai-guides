# 04 - security-hardening

Hardening covers the control plane, secrets, and the image supply chain. Every
claim resolves to a captured page line; nothing was verified against a live
daemon.

## 1. The daemon socket is root-equivalent

By default Docker uses a non-networked UNIX socket, optionally SSH or TLS
`pages/engine/security/protect-access.md:4-5`. With TLS client certificates,
"anyone with the keys can give any instructions to your Docker daemon, giving
them root access to the machine hosting the daemon"
`pages/engine/security/protect-access.md:273-279`; keys must be guarded like a
root password. Remote access is warned against explicitly: an unsecured
connection lets remote non-root users gain root on the host, and remote access
without TLS is not recommended
`pages/engine/daemon/remote-access.md:4-20`. Docker over TLS should use TCP port
2376 `pages/engine/security/protect-access.md:269-271`.

Prefer an SSH context over a raw TCP listener
`pages/engine/security/protect-access.md:15-23`:
`docker context create --docker host=ssh://docker-user@host1.example.com --description="Remote engine" my-remote-engine`
`pages/engine/security/protect-access.md:20-23`.

For TLS, set `tlsverify` and point `tlscacert` at a trusted CA; the daemon then
accepts only clients with CA-signed certificates
`pages/engine/security/protect-access.md:71-84`. Documented client form:
`docker --tlsverify --tlscacert=ca.pem --tlscert=cert.pem --tlskey=key.pem -H=$HOST:2376 version`
`pages/engine/security/protect-access.md:262-266`.

Client files can be placed in `~/.docker` with `DOCKER_HOST` and
`DOCKER_TLS_VERIFY` for secure-by-default invocation
`pages/engine/security/protect-access.md:281-290`.

## 2. Certificate and authorization controls

Registry client certificates live under platform-specific certificate roots:
`/etc/docker/certs.d/` on native Linux, `$XDG_CONFIG_HOME/docker/certs.d` for
rootless Linux, and `~/.docker/certs.d` for Docker Desktop with Linux containers
`pages/engine/security/certificates.md:17-35`. The daemon reads `.crt` files as
CA roots and `.cert` files as client certificates
`pages/engine/security/certificates.md:88-90`; multiple cert pairs are tried in
alphabetical order until authentication succeeds
`pages/engine/security/certificates.md:44-52`.

The built-in authorization model is all-or-nothing: any user who can reach the
daemon can run any client command
`pages/engine/extend/plugins_authorization.md:8-14`. Authorization plugins add
granular policy. They approve or deny using authentication and command context
`pages/engine/extend/plugins_authorization.md:32-39`; multiple plugins form an
ordered chain and access is granted only if all allow it
`pages/engine/extend/plugins_authorization.md:50-55`. Only the user name and
authentication method are passed, never credentials or tokens
`pages/engine/extend/plugins_authorization.md:69-72`. The middleware fails
closed: an error or `Allow: false` denies the request
`pages/engine/extend/plugins_authorization.md:89-91`.

Documented enforcement gaps matter for policy design: gRPC calls are not
subject to authorization; only `application/json` bodies are visible; for
`exec` and hijacked connections only the initial request is checked; `logs` and
`events` send only the request
`pages/engine/extend/plugins_authorization.md:74-87`. With TLS, the default user
is the client certificate subject common name and the method is `TLS`
`pages/engine/extend/plugins_authorization.md:45-48`.

## 3. Secrets exposure

Environment variables are broadly visible and can be printed in logs during
debugging; Compose secrets avoid that by granting access per service
`pages/compose/how-tos/use-secrets.md:4-14`. Secrets are bind-mounted as files
at `/run/secrets/<secret_name>` and are Linux-container-only
`pages/compose/how-tos/use-secrets.md:18-26`. A service grants access with a
`secrets:` list and a top-level `secrets:` block whose `file:` points to the
host file `pages/compose/how-tos/use-secrets.md:35-42`.

The Compose trust model states that file-reference fields (`env_file`,
`label_file`, `secrets`/`configs` with `file:`, `include`, `extends`) read any
file the invoking user can access, including through symlinks from a remote
checkout `pages/compose/trust-model.md:84-86`. Treat those fields as an
exfiltration surface.

## 4. Image trust and supply chain

Compose treats every file as trusted input; the boundary is whether you trust
the author, not where the file came from
`pages/compose/trust-model.md:4-13`. Remote `include` and `extends` can introduce
privileged services invisibly; `docker compose config` prints the fully resolved
configuration for review `pages/compose/trust-model.md:15-66`. Risky fields
include `privileged`, `cap_add`, `security_opt`, bind mounts, `network_mode:
host`, `pid: host`, `devices`, and `image`
`pages/compose/trust-model.md:68-85`.

Docker Content Trust uses root (offline), targets (repository), snapshot, and
optional delegation keys; the root key should stay offline
`pages/engine/security/trust/trust_key_mng.md:9-13`. Enable it with
`DOCKER_CONTENT_TRUST`, as demonstrated in the trust sandbox
`pages/engine/security/trust/trust_automation.md:70` and
`pages/engine/security/trust/trust_sandbox.md:163`. The sandbox itself runs a
local Notary server and registry alongside a `trustsandbox` container
`pages/engine/security/trust/trust_sandbox.md:23-38`.

Signed attestations are a core supply-chain control: they are tamper-evident
statements following in-toto, CycloneDX, and SLSA formats, attached as OCI
metadata `pages/dhi/explore/security-concepts/attestations.md:4-21`. All Docker
Hardened Images are built to SLSA Build Level 3 and published with signed
attestations `pages/dhi/explore/security-concepts/attestations.md:38-54`.
Provenance traces origin, authorship, and integrity to support policy gates
`pages/dhi/explore/security-concepts/provenance.md:4-14`. DHI verification uses
Docker Scout, which validates in one step with `--verify`, or `regctl`/`cosign`
`pages/dhi/how-to/verify.md:12-18`; authentication to `dhi.io` is required
`pages/dhi/how-to/verify.md:20-27`. List signatures with
`docker scout attest list dhi.io/<image>:<tag>`
`pages/dhi/how-to/verify.md:51`.

DHI policies encode non-root default users, no fixable critical/high CVEs past
their SLA, no embedded malware or secrets, and signed attestations
`pages/dhi/how-to/policies.md:26-38`. `docker scout policy` evaluates images
locally against built-in defaults, OCI policy bundles, or local Rego files
without sending data to the Scout service
`pages/scout/policy/local.md:6-25`; evaluate with
`docker scout policy myorg/app:latest` `pages/scout/policy/local.md:67`.

Use `--exit-code` to fail a pipeline when any policy is not met
`pages/scout/policy/local.md:63-70`.

## 5. Hardening checklist (documented commands)

| Goal | Command | Source |
|---|---|---|
| Avoid a raw TCP daemon listener | `docker context create --docker host=ssh://user@host my-remote-engine` | `pages/engine/security/protect-access.md:15-23` |
| Require mutual TLS | `docker --tlsverify --tlscacert=ca.pem --tlscert=cert.pem --tlskey=key.pem -H=$HOST:2376 version` | `pages/engine/security/protect-access.md:262-266` |
| Review resolved Compose input | `docker compose config` | `pages/compose/trust-model.md:50-66` |
| List image attestations | `docker scout attest list dhi.io/<image>:<tag>` | `pages/dhi/how-to/verify.md:51` |
| Gate images on policy | `docker scout policy <image> --exit-code` | `pages/scout/policy/local.md:41-43` |
| Enable content trust | `export DOCKER_CONTENT_TRUST=1` | `pages/engine/security/trust/trust_sandbox.md:163` |

`derived` summary: the control plane, not the container, is the highest-value
target; protect socket access first, then restrict authorization, then gate
images. No command above was executed here.

## Sources

https://docs.docker.com/engine/security/protect-access/
https://docs.docker.com/engine/daemon/remote-access/
https://docs.docker.com/engine/extend/plugins_authorization/
https://docs.docker.com/engine/security/certificates/
https://docs.docker.com/compose/trust-model/
https://docs.docker.com/compose/how-tos/use-secrets/
https://docs.docker.com/engine/security/trust/trust_key_mng/
https://docs.docker.com/dhi/explore/security-concepts/attestations/
https://docs.docker.com/dhi/how-to/verify.md
https://docs.docker.com/scout/policy/local/
