# 04 — Installation and topologies

## 1. Deployment modes [Community Build]

Docker/Helm recommended; ZIP still available, to be removed in a future release, with a migration guide (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/introduction.md). [Server] adds cluster/Data Center, absent here.

| Mode | Use | Persistence |
|---|---|---|
| Docker `run`/Compose | single host | `data`, `extensions`, `logs` volumes |
| Helm (K8s/OpenShift) | cluster, ingress, secrets | optional index PVC |
| ZIP + systemd | legacy, migrate | `<home>/data`, `<home>/logs` |

Three Java processes (web, CE, Elasticsearch); embedded H2 is test-only, production needs PostgreSQL/Oracle/SQL Server (source: `sonar-application/src/main/assembly/conf/sonar.properties:17-19`).

## 2. OS and kernel prerequisites [Community Build]

Linux (x64, AArch64), Windows (x64), macOS (x64, AArch64); no z/OS. Unsupported: Azure App Service, AWS App Runner, Fargate. ZIP needs JDK 21/25; images bundle a JRE (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md).

Host limits, any mode (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md):

| Limit | Minimum | Config |
|---|---|---|
| `vm.max_map_count` | 524288 | `/etc/sysctl.d/99-sonarqube.conf` |
| `fs.file-max` | 131072 | same |
| `nofile` | 131072 | `limits.d/99-sonarqube.conf` / `LimitNOFILE` |
| `nproc` | 8192 | same / `LimitNPROC` |

```bash
sysctl vm.max_map_count; sysctl fs.file-max; ulimit -n; ulimit -u
printf 'vm.max_map_count=524288\nfs.file-max=131072\n' > /etc/sysctl.d/99-sonarqube.conf
grep SECCOMP /boot/config-$(uname -r)   # CONFIG_SECCOMP=y
```

Config-file warning: `vm.max_map_count [65530] is too low, increase to at least [262144]`; cluster ES will not start (source: `sonar-application/src/main/assembly/conf/sonar.properties:281-290`). Use 524288. ES 9.x needs writable `/tmp`: `tmpfs: - /tmp:size=256M,mode=1777` on read-only filesystems; under FIPS, signed/encrypted SAML and [Server] Data Center ES fail, and webhook secrets need ≥16 characters (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md).

## 3. Docker and Compose [Community Build]

```bash
docker run -d --name sonarqube -p 9000:9000 --ulimit nofile=131072:131072 \
  --ulimit nproc=8192:8192 -e SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonar \
  -e SONAR_JDBC_USERNAME=sonar -e SONAR_JDBC_PASSWORD=sonar \
  -v sonarqube_data:/opt/sonarqube/data -v sonarqube_extensions:/opt/sonarqube/extensions \
  -v sonarqube_logs:/opt/sonarqube/logs sonarqube:<tag>-community
```

Port 9000; `SONAR_JDBC_*` mandatory outside H2; check `SONAR_WEB_HOST`/`_PORT`/`_CONTEXT` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md). `SONAR_JAVA_PATH` swaps the JVM; IPv6 needs `-Djava.net.preferIPv6Addresses=true` in `JAVA_TOOL_OPTIONS` and `SONAR_WEB_JAVAADDITIONALOPTS` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/advanced-setup.md). Trap: `docker compose down -v`, `system prune`, `volume prune` delete database volumes (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md).

## 4. Helm / Kubernetes / OpenShift [Community Build]

Chart `sonarqube/sonarqube`: production uses a `restricted` namespace (`initSysctl.enabled=false`, `initFs.enabled=false`), own ingress and database; ArgoCD not fully supported (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/before-you-start.md).

```yaml
community: { enabled: true }
jdbcOverwrite: { enabled: true, jdbcUrl: jdbc:postgresql://db:5432/sonar,
  jdbcUsername: sonar, jdbcSecretName: sonar-jdbc }
sonarSecretProperties: sonar-secret-props
persistence: { enabled: false }
ingress: { enabled: true, hosts: [{ name: sq.example.com, path: / }],
  annotations: { nginx.ingress.kubernetes.io/proxy-body-size: "64m" } }
```

SecurityContext: `runAsNonRoot: true`, `runAsUser/runAsGroup: 1000`, `seccompProfile: RuntimeDefault`, `drop: ["ALL"]`. OpenShift: `OpenShift.enabled=true`, `OpenShift.createSCC=false`. `persistence.enabled=false`: no PVC means slow startup (reindex); a PVC risks corruption. Limitations: Azure Fileshare PVC, probes, obsolete ingress-nginx (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/customizing-helm-chart.md).

## 5. ZIP and systemd [Community Build]

```ini
[Service]
Type=simple
User=sonarqube
Group=sonarqube
ExecStart=/bin/nohup /opt/java/bin/java -Xms32m -Xmx32m \
  -Djava.net.preferIPv4Stack=true -jar /opt/sonarqube/lib/sonar-application-<versao>.jar
LimitNOFILE=131072
LimitNPROC=8192
Restart=always
SuccessExitStatus=143
```

Never run as `root`; directories belong to `sonarqube`. The JAR carries the version: adjust `ExecStart` on every upgrade; `SONAR_JAVA_PATH` does not apply to the service. Windows: `SonarService.bat install|start|stop|status` (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-zip-file/starting-stopping-server/running-as-a-service.md).

## 6. HTTPS, proxy and context path [Community Build]

Plaintext HTTP at the entry point only: TLS terminates at the proxy. `X-Forwarded-Proto`/`X-Forwarded-For` mandatory with HTTPS/SAML; forward `Sonar-MD5` for plugins. Nginx: `proxy_pass http://<host>:9000`, `proxy_set_header X-Forwarded-Proto https`; raise the Web API URL limit (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/securing-behind-proxy.md). `sonar.web.context` starts with `/` (e.g. `/sonarqube`); changing it after login yields conflicting cookies (source: `sonar-application/src/main/assembly/conf/sonar.properties:102-108`). Proxy-only access: `sonar.web.host=127.0.0.1`.

## 7. Network rules [Community Build]

| Protocol | Source → target | Port | Default |
|---|---|---|---|
| TCP | proxy → SonarQube | `sonar.web.port` | 9000 |
| TCP | SonarQube → SonarQube | `sonar.search.port` | 9001 |
| TCP | SonarQube → SonarQube | `sonar.es.port` | random |

`sonar.web.host` defaults to `0.0.0.0`; `sonar.search.host` defaults to loopback, never expose it (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/network-rules.md; `sonar-application/src/main/assembly/conf/sonar.properties:298-309`). A public base URL is required with cloud CI (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/networking-requirements.md).

## Rule of thumb

- 4 GB to start; 8 GB in production, 16 GB for ~50M LOC; 2 cores (small)/4 cores (large), 30 GB disk, 10% free. Single CE worker (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md).
- SSD with `deadline`/`NOOP` scheduler, never NFS/SMB/NAS; `<home>/data` on a separate partition (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md).
- `Unable to attach entitlement agent` almost always means a read-only `/tmp`.

## Sources

- repo ae3d6eb: `sonar-application/src/main/assembly/conf/sonar.properties:17-19`, `:102-108`, `:281-290`, `:298-309`.
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/introduction.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/networking-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/pre-installation/linux.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/set-up-and-start-container.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-docker-image/advanced-setup.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-zip-file/starting-stopping-server/running-as-a-service.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/before-you-start.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/on-kubernetes-or-openshift/customizing-helm-chart.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/securing-behind-proxy.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/network-security/network-rules.md
