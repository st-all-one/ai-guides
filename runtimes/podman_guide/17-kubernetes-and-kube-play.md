# 17 — Kubernetes YAML and `kube play`

Podman's `kube` commands exist to move workloads between Podman and Kubernetes, not to replace
`kubectl` (`pages/markdown/podman-kube.1.md:6-10`). Scope: v6.2.0; a workload is deterministic
when the **same YAML** creates, replaces and tears down the same resources. No container was
executed to validate these examples.

## 1. Command surface

| Command | Role | Source |
|---|---|---|
| `podman kube play [options] FILE\|-\|URL` | Recreate containers/pods/volumes from Kubernetes YAML; containers are started; outputs pod ID or volume name | `pages/markdown/podman-kube-play.1.md:4-6` |
| `podman kube generate [options] ctr\|pod\|volume…` | Emit v1 Kubernetes YAML from existing Podman objects; defaults to `Pod` kind | `pages/markdown/podman-kube-generate.1.md:4-8`, `:33-34` |
| `podman kube apply [options] [ctr\|pod\|vol…]` | Deploy Podman objects, or a YAML file (`-f`), to a Kubernetes cluster | `pages/markdown/podman-kube-apply.1.md:4-7`, `:11-14` |
| `podman kube down [options] FILE…` | Stop/remove pods created by `kube play` from the same YAML | `pages/markdown/podman-kube-down.1.md:4-8` |

`podman play kube` is an alias of `podman kube play`; `podman kube play --down` is another teardown
form (`pages/markdown/podman-kube-play.1.md:8`, `:31-34`). Once deployed to a cluster, use
`kubectl` (`pages/markdown/podman-kube.1.md:8-10`).

Source: `pages/markdown/podman-kube-play.1.md:11-20`
```text
Currently, the supported Kubernetes kinds are:
Pod
Deployment
PersistentVolumeClaim
ConfigMap
Secret
DaemonSet
Job
Kubernetes Pods or Deployments
Only five volume types are supported by kube play: the hostPath, emptyDir, configMap, persistentVolumeClaim, and image volume types.
```

`StatefulSet` is **not** in the v6.2 supported-kind list; neither is a generic `Service` resource
as a playable kind — services are *generated* for deployment (`pages/markdown/podman-kube-play.1.md:11-18`,
`pages/markdown/podman-kube-generate.1.md:31-32`). Validate a manifest before relying on a kind.

## 2. Volume, ConfigMap and Secret semantics

| Kind / volume type | Podman realization | Source |
|---|---|---|
| `hostPath` | Host path when value contains `/`, otherwise a named volume; subtypes: default, `DirectoryOrCreate`, `Directory`, `FileOrCreate`, `File`, `Socket`, `CharDevice`, `BlockDevice` | `pages/markdown/podman-kube-play.1.md:20-21` |
| `emptyDir` | Anonymous volume deleted when the pod is removed | `pages/markdown/podman-kube-play.1.md:23` |
| `configMap` | Anonymous volume or environment source; no standalone ConfigMap object in Podman | `pages/markdown/podman-kube-play.1.md:24`, `:83-106` |
| `persistentVolumeClaim` | Podman named volume; `volume.podman.io/{driver,device,type,uid,gid,mount-options,import-source,image}` annotations select options | `pages/markdown/podman-kube-play.1.md:22`, `:39-49` |
| `image` | Read-only whole-image volume, must exist locally, **rootful only** | `pages/markdown/podman-kube-play.1.md:25` |
| `Secret` | Podman named secret; base64 `data` consumed via `secretKeyRef` or `envFrom.secretRef` | `pages/markdown/podman-kube-play.1.md:107-131`, `:600-603` |

ConfigMap fields `data`/`binaryData` are supported but `immutable` is not; PVC `accessModes`,
`storageClassName` and `resources.requests` are supported while `volumeName`, `volumeMode`,
`selector` and `resources.limits` are not (`pages/markdown/podman-kube-play.1.md:682-707`).
`--configmap=PATH` may be repeated or comma-separated, accepts a multi-document file but only
ConfigMaps, and is unavailable on remote clients (`pages/markdown/podman-kube-play.1.md:156-159`).

## 3. Play options for deterministic, idempotent apply

| Option | Effect | Source |
|---|---|---|
| `--replace` | Tear down pods from an earlier play, then recreate from the YAML — the idempotent redeploy primitive | `pages/markdown/podman-kube-play.1.md:307-308` |
| `--build` / `--build=false` | Force rebuild even when the image exists locally / disable builds entirely; unavailable on remote clients | `pages/markdown/podman-kube-play.1.md:149-151` |
| `--annotation=k=v` | Add Podman-specific annotations to created containers/pods, **not** to the YAML; repeatable | `pages/markdown/podman-kube-play.1.md:142-144` |
| `--log-driver`, `--log-opt` | Driver and rotation/tag/label options for all created containers | `pages/markdown/podman-kube-play.1.md:179-205` |
| `--quiet, -q` | Suppress image-pull output (CI-friendly, hides pull detail) | `pages/markdown/podman-kube-play.1.md:305-306` |
| `--validate=ignore\|warn\|strict` | Unknown fields: skip / warn / fail; `strict` stops at the bad object but **does not roll back** earlier objects | `pages/markdown/podman-kube-play.1.md:372-380` |
| `--network`, `--publish`, `--publish-all` | Pod network mode; override/merge port mapping; expose `containerPort` declarations | `pages/markdown/podman-kube-play.1.md:211-224`, `:293-304` |
| `--multiple-pods` | Create the Deployment's desired replica count (default is one pod) | `pages/markdown/podman-kube-play.1.md:209-210` |
| `--start[=false]`, `--wait` | Create without starting / run in foreground and remove everything on exit | `pages/markdown/podman-kube-play.1.md:311-312`, `:381-388` |
| `--userns`, `--seccomp-profile-root` | User namespace mode; seccomp profile directory (default `/var/lib/kubelet/seccomp`) | `pages/markdown/podman-kube-play.1.md:309-310`, `:319-327` |
| `--force` | With `--down`, also tear down PVC volumes | `pages/markdown/podman-kube-play.1.md:170-171` |
| `--service-container` | **Absent** from the v6.2 kube-play option set; do not assume it exists — re-check upstream after upgrades | `pages/markdown/podman-kube-play.1.md:141-389` |

Source: `pages/markdown/podman-kube-play.1.md:372-380`
```text
--validate=mode
Control how unrecognized YAML fields and unsupported objects are handled. Supported modes are:
ignore: silently skip them (default).
warn: report a warning and continue. Warnings are printed to stderr and, when using the API, returned in the play report.
strict: fail with an error.
When strict is used, any object that fails validation halts the processing of
further objects, but prior objects will still exist and will not be rolled back.
For example, in a YAML file containing a Pod followed by an unsupported object, the
Pod is created and then the command fails.
```

derived deterministic redeploy and teardown (same file in both directions):
```bash
set -euo pipefail
podman kube play --validate=strict --replace --quiet workload.yaml
podman pod ps --filter label=...        # verify the expected pods
# teardown: podman kube down workload.yaml       (volumes survive)
# full teardown: podman kube down --force workload.yaml
```

`kube down` accepts local files, URLs and stdin (`-`), processed sequentially as if joined by
`---`; a URL whose content changed after `play` cannot be used for teardown
(`pages/markdown/podman-kube-down.1.md:5-12`).

## 4. Generation, cluster apply and Quadlet integration

`kube generate` has four output kinds — `pod` (default), `deployment`, `daemonset`, `job` — and
`--replicas` applies only to `deployment` (`pages/markdown/podman-kube-generate.1.md:28-34`).
Bind mounts become `hostPath` with `DirectoryOrCreate`/`Directory`/`File` subtypes; named volumes
become PVCs named `<volume>-pvc` (`pages/markdown/podman-kube-generate.1.md:9-11`). `--filename`
refuses to overwrite an existing file, and `--podman-only` emits annotations Kubernetes cannot
consume (`pages/markdown/podman-kube-generate.1.md:24-27`). Generated Deployment/DaemonSet
restart policy is always `Always`; Job is `OnFailure` or `Never`, defaulting to `Never`
(`pages/markdown/podman-kube-generate.1.md:21-22`).

`kube apply` targets a cluster via `--kubeconfig`/`KUBECONFIG`, `--ns`, `--ca-cert-file`,
`--file=-` for stdin, and `--service` to emit a NodePort when port bindings exist; it always
picks the **first** cluster in a multi-cluster kubeconfig
(`pages/markdown/podman-kube-apply.1.md:9-19`).

A `.kube` Quadlet wraps `kube play` as a systemd service: `Yaml=` is the only required key,
`ConfigMap=` passes config maps, `LogDriver=`/`Network=`/`PublishPort=`/`UserNS=` map to play
flags, `KubeDownForce=` maps to `--force`, and `SetWorkingDirectory=yaml|unit` fixes relative
paths (`samples/podman-systemd.unit.5.md:1355-1382`, `:1396-1402`, `:1431-1504`).

Source: `samples/podman-systemd.unit.5.md:1386-1392`
```text
### `AutoUpdate=`

Indicates whether containers will be auto-updated ([podman-auto-update(1)](podman-auto-update.1.md)). AutoUpdate can be specified multiple times. The following values are supported:

* `registry`: Requires a fully-qualified image reference (e.g., quay.io/podman/stable:latest) to be used to create the container. This enforcement is necessary to know which images to actually check and pull. If an image ID was used, Podman does not know which image to check/pull anymore.

* `local`: Tells Podman to compare the image a container is using to the image with its raw name in local storage. If an image is updated locally, Podman simply restarts the systemd unit executing the Kubernetes Quadlet.
```

derived `.kube` unit combining YAML, a ConfigMap and auto-update (see chapter 18 for install paths):
```ini
[Unit]
Description=Workload from Kubernetes YAML

[Kube]
Yaml=/etc/containers/kube/workload.yaml
ConfigMap=/etc/containers/kube/configmap.yaml
AutoUpdate=registry
LogDriver=journald
SetWorkingDirectory=yaml

[Install]
WantedBy=multi-user.target
```
Auto-update policies can also live in the YAML itself: `io.containers.autoupdate` (all containers)
or `io.containers.autoupdate/$container` (one container), with `conmon` as the default sdnotify
policy (`pages/markdown/podman-auto-update.1.md:20-26`).

## 5. Security boundary: hostPath, privileged, hostNetwork, seccomp

Support is explicit; "not supported" means the field is ignored by `kube play` under the default
`--validate=ignore` mode, which is why strict validation matters.

| Field / mechanism | Support | Security reading | Source |
|---|---|---|---|
| `hostPath` | Supported (8 subtypes) | Direct host filesystem access; SELinux shared label `z` is applied; pre-relabel bind mounts manually | `pages/markdown/podman-kube-play.1.md:20-21`, `:28` |
| `hostNetwork` | Supported | Full access to host abstract Unix sockets and localhost TCP/UDP — documented as a potential vulnerability | `pages/markdown/podman-kube-play.1.md:503-508`, `:228` |
| `securityContext.privileged` | Supported | Explicit trust escape; equivalent to dropping capability/device/mount/seccomp separation | `pages/markdown/podman-kube-play.1.md:650-651` |
| `allowPrivilegeEscalation`, `capabilities.add/drop`, `readOnlyRootFilesystem`, `procMount` | Supported | Harden here, subtract capabilities rather than adding privileges | `pages/markdown/podman-kube-play.1.md:646-657` |
| `seLinuxOptions.{level,role,type,user}`, `sysctls.{name,value}` | Supported | SELinux labels/sysctls are honored; `spc_t` is the documented escape for rootless volumes sent to Kubernetes | `pages/markdown/podman-kube-play.1.md:531-542`, `pages/markdown/podman-kube-generate.1.md:14-18` |
| `securityContext.seccompProfile.type` / `.localhostProfile` | **Not supported** at pod **or** container level | A Kubernetes seccompProfile block does not harden a `kube play` workload | `pages/markdown/podman-kube-play.1.md:527-530`, `:658-661` |
| `io.podman.annotations.seccomp` | Podman annotation set by `--security-opt seccomp=PROFILE` | Apply via `--annotation` (or `.kube` `PodmanArgs=`) and confirm with `podman inspect`; `--seccomp-profile-root` only locates profiles | `pages/markdown/podman-run.1.md:1147-1148`, `pages/markdown/podman-kube-play.1.md:142-144`, `:309-310` |
| `runAsNonRoot`, `fsGroup`, `imagePullSecrets`, `runtimeClassName`, `serviceAccountName` | Not supported | Do not rely on these as security gates in single-node Podman | `pages/markdown/podman-kube-play.1.md:431-433`, `:460-465`, `:511-518`, `:523-524` |
| `livenessProbe` vs `readinessProbe` | liveness supported; readiness/startup not | Health-driven automation must use liveness probes | `pages/markdown/podman-kube-play.1.md:634-639` |

derived hardened YAML fragment (digest pin, no host namespaces, dropped capabilities, seccomp via annotation):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  annotations:
    io.podman.annotations.seccomp: /etc/containers/seccomp/api.json
spec:
  hostNetwork: false
  containers:
    - name: api
      image: registry.example.com/team/api@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      securityContext:
        privileged: false
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: {drop: [ALL]}
```

## Pitfalls

- `kube play` is not `kubectl`: unsupported fields are silently skipped by default (`pages/markdown/podman-kube-play.1.md:372-380`).
- `StatefulSet` is not a supported playable kind in this snapshot (`pages/markdown/podman-kube-play.1.md:11-18`).
- `--validate=strict` fails without rolling back objects created earlier in the same file (`pages/markdown/podman-kube-play.1.md:376-380`).
- `--replace` recreates pods; plain `play` on changed YAML is not a predictable redeploy (`pages/markdown/podman-kube-play.1.md:307-308`).
- `kube down` keeps PVC volumes unless `--force` is given (`pages/markdown/podman-kube-down.1.md:5-7`, `:14-15`).
- A changed remote YAML cannot be torn down via its URL (`pages/markdown/podman-kube-down.1.md:9-11`).
- Kubernetes `seccompProfile` is ignored while `hostNetwork`/`privileged` are honored — the opposite of a safe default (`pages/markdown/podman-kube-play.1.md:503-508`, `:527-530`, `:650-661`).
- `--build` and `--configmap` are unavailable on remote clients; `--service-container` is not documented at all in v6.2 (`pages/markdown/podman-kube-play.1.md:149-159`, `:141-389`).
- Image `:latest` triggers a pull, except for locally built `localhost` images (`pages/markdown/podman-kube-play.1.md:31`).

## Sources

- `pages/markdown/podman-kube.1.md:6-10`; `pages/markdown/podman-kube-play.1.md:4-38`, `:39-140`, `:141-389`, `:420-773` — https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- `pages/markdown/podman-kube-generate.1.md:4-34` — https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html
- `pages/markdown/podman-kube-apply.1.md:4-19`, `pages/markdown/podman-kube-down.1.md:4-15` — https://docs.podman.io/en/latest/markdown/podman-kube-down.1.html
- `pages/markdown/podman-auto-update.1.md:20-26`; `pages/markdown/podman-run.1.md:1147-1148` — https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `samples/podman-systemd.unit.5.md:1355-1513` — podman @ `055de046937d29450f310fce0fe3071485d8bed9`, `docs/source/markdown/podman-systemd.unit.5.md`
