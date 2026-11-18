# 15 — Pods and namespaces

## 1. Pod lifecycle and command surface

A pod is a group of containers created empty and then populated with `podman create --pod <id|name> …` and started as a unit with `podman pod start` (`pages/markdown/podman-pod-create.1.md:5-10`). The full v6 command set is `clone`, `create`, `exists`, `inspect`, `kill`, `logs`, `pause`, `prune`, `ps`, `restart`, `rm`, `start`, `stats`, `stop`, `top`, `unpause` (`pages/markdown/podman-pod.1.md:11-58`).

| Phase | Commands |
|---|---|
| Create / copy | `pod create`, `pod clone` (`pages/markdown/podman-pod.1.md:11-16`) |
| Inspect | `pod ps`, `pod inspect [-f]`, `pod top` (`pages/markdown/podman-pod.1.md:20-22`, `:35-37`, `:53-55`) |
| Run | `pod start`, `pod stop`, `pod restart`, `pod kill`, `pod pause`, `pod unpause` (`pages/markdown/podman-pod.1.md:23-25`, `:29-31`, `:38-40`, `:44-58`) |
| Observe | `pod logs`, `pod stats` (`pages/markdown/podman-pod.1.md:26-28`, `:47-49`) |
| Remove | `pod rm` (stopped pods and their containers), `pod prune` (all stopped pods) (`pages/markdown/podman-pod.1.md:32-34`, `:41-43`) |

`pod prune` prompts by default and `--force` also removes running pods (`pages/markdown/podman-pod-prune.1.md:5-9`). That makes it unsuitable for routine cleanup on a shared host unless protected by state elsewhere. `pod ps` exposes status values that matter for scripts.
Verbatim from `pages/markdown/podman-pod-ps.1.md:13-25`:
```text
status of pod as defined by the following table
Status
Description
Created
No containers running nor stopped
Running
at least one container is running
Stopped
At least one container stopped and none running
Exited
All containers stopped in pod
Dead
Error retrieving state
```

`pod ps` filters include `ctr-names`, `ctr-status`, `network`, `label`, `status`, `until` (`pages/markdown/podman-pod-ps.1.md:33-63`). `pod logs -c/--container` restricts output to one container; the remote client **requires** `-c`, and a long-lived `--follow` must be restarted when a container is added to the pod (`pages/markdown/podman-pod-logs.1.md:6-14`). `pod stats` needs cgroups v2 for rootless operation; `--no-stream` gives one sample with a coarse ~100 ms CPU window, while streaming uses 5-second intervals (`pages/markdown/podman-pod-stats.1.md:5-6`, `:43-49`).

## 2. Namespaces, infra container and inheritance

`--share` takes a comma-separated namespace list from `cgroup`, `ipc`, `net`, `pid`, `uts`; the default matches Kubernetes (`ipc,net,uts`), `+` appends to the default, and `none`/empty shares nothing and omits the infra container unless `--infra=true` is explicit (`pages/markdown/podman-pod-create.1.md:425-426`). `--share-parent` defaults to true and makes the pod the cgroup parent; it conflicts with `--share=cgroup`, which instead places containers in the infra container's cgroup namespace (`pages/markdown/podman-pod-create.1.md:427-429`). `--pid` and `--uts` require the corresponding namespace to be shared via `--share` (`pages/markdown/podman-pod-create.1.md:344-348`, `:499`).

The infra container coordinates the shared namespaces; it is created by default, runs `/pause`, and can be customized with `--infra-command`, `--infra-image`, `--infra-name`, and `--infra-conmon-pidfile` (the last one is needed when systemd manages the pod) (`pages/markdown/podman-pod-create.1.md:190-199`). `--infra=false` plus `--share=none` yields a pod without shared kernel namespaces.

User namespaces are set for **all** containers in the pod with `--userns`; it defaults to `$PODMAN_USERNS` and otherwise the caller's namespace, with rootless mappings `host`/empty → container UID 0, `keep-id` → same UID, `auto`/`nomap` → host UID unmapped (`pages/markdown/podman-pod-create.1.md:470-498`). `--uidmap`/`--gidmap` create a new userns for every pod container and conflict with `--userns`; `--subuidname`/`--subgidname` select mappings from `/etc/subuid`/`/etc/subgid` (`pages/markdown/podman-pod-create.1.md:170-174`, `:440-449`, `:465-469`). Containers joining a pod can still override user mapping rules; keep one userns policy per pod to avoid mixed mappings.

Resource limits are applied to the pod's cgroup parent and a joining container may **lower** them; containers with their own cgroup (e.g. `--cgroupns=host`) do not inherit pod limits (`pages/markdown/podman-pod-create.1.md:18-20`).

| Pod-level limit | Flag / note |
|---|---|
| CPU | `--cpus`, `--cpu-shares`, `--cpuset-cpus`, `--cpuset-mems` (`pages/markdown/podman-pod-create.1.md:62`, `:105-115`) |
| Memory | `--memory`, `--memory-swap` (latter requires `--memory`) (`pages/markdown/podman-pod-create.1.md:242-258`) |
| IPC | `--shm-size` (default 64m), `--shm-size-systemd`; conflict with `--ipc=host` (`pages/markdown/podman-pod-create.1.md:430-439`) |
| Labels | `--label/-l`, `--label-file` (`pages/markdown/podman-pod-create.1.md:230-232`) |
| Sysctls | `--sysctl`, allowed only when the corresponding IPC/network namespace is shared (`pages/markdown/podman-pod-create.1.md:450-464`) |

Secrets are attached to the pod's **containers**: use `--secret` on `podman create --pod=…` (mount at `/run/secrets/<name>`, or `type=env`), not on the pod object (`pages/markdown/podman-run.1.md:1100-1122`). Pod labels are the place for ownership and lifecycle tags that `pod ps --filter label=` can act on (`pages/markdown/podman-pod-create.1.md:230-232`, `pages/markdown/podman-pod-ps.1.md:49-52`).

`--exit-policy` decides what happens when the last container exits: `continue` (default) keeps the infra container alive; `stop` stops the whole pod and is the default used by `kube play` and Quadlets (`pages/markdown/podman-pod-create.1.md:162-169`). `pod inspect` exposes `.ExitPolicy`, `.SharedNamespaces`, `.InfraContainerID`, `.CgroupParent`, `.RestartPolicy` and per-pod resource fields (`pages/markdown/podman-pod-inspect.1.md:23-27`, `:49-58`, `:77-86`).

## 3. Pod networking and published ports

The pod owns one network stack: `--network` (alias `--net`) accepts the same modes as container run (`bridge[:OPTIONS]`, named network, `none`, `container:ID`, `host`, `pasta`, `ns:path`), and DNS/resolv.conf, hostname and `/etc/hosts` settings are shared by all pod containers (`pages/markdown/podman-pod-create.1.md:261-274`, `:156-161`, `:179-189`, `:22-30`). A static pod IP is available via `--ip`/`--ip6` only when the pod joins exactly one network and is not sharing another container's namespace; the address must lie in that network's pool (`pages/markdown/podman-pod-create.1.md:200-226`).

Port publishing belongs to the pod: `--publish/-p` is set at `pod create`, **cannot be modified afterwards**, and must not be set on the containers inside it (`pages/markdown/podman-pod-create.1.md:351-387`). Containers in the same pod share the interface and IP, so one container binding a port blocks another, and containers can talk over `localhost` inside the pod (`pages/markdown/podman-run.1.md:969-975`). `--network-alias` registers the pod name/aliases in aardvark-dns (`pages/markdown/podman-network.1.md:8-22`, `pages/markdown/podman-pod-create.1.md:325`).

A deterministic pod definition (derived from the documented flags):
```bash
podman network create --subnet 10.90.0.0/24 --gateway 10.90.0.1 --internal app-net
podman pod create --name api-pod --network app-net:ip=10.90.0.10 \
  --publish 127.0.0.1:8080:8080 --exit-policy stop --cpus=2 --memory=1g \
  --label owner=platform --userns=keep-id
podman create --pod api-pod --name api --secret db-password,target=/run/secrets/db \
  registry.example.com/team/api@sha256:<digest>
podman create --pod api-pod --name sidecar \
  registry.example.com/team/proxy@sha256:<digest>
podman pod start api-pod
podman pod inspect --format '{{.State}} {{.SharedNamespaces}} {{.ExitPolicy}}' api-pod
```

## 4. Systemd and Quadlet handoff

A Quadlet `*.pod` file creates a `$name-pod.service` unit that runs `podman pod create …`; the Podman pod is named `systemd-$name` unless `PodName=` overrides it, and `.container` units join with `Pod=<name>.pod` (`pages/markdown/podman-systemd.unit.5.md:813-824`, `:676-679`, `:947-952`).
Verbatim example from `pages/markdown/podman-systemd.unit.5.md:1864-1871`:
```text
test.pod
[Pod]
PodName=test
centos.container
[Container]
Image=quay.io/centos/centos:latest
Exec=sh -c "sleep inf"
Pod=test.pod
```

Quadlet pods default to `ExitPolicy=stop`, and the generated service defaults to `Restart=on-failure`; a clean “all containers exited” stops the pod with code 0 and does **not** restart it unless `[Service] Restart=always` is set (`pages/markdown/podman-systemd.unit.5.md:821-824`, `:896-898`). `[Pod]` keys map to `pod create` flags: `Network=`, `IP=`, `IP6=`, `PublishPort=`, `DNS=`, `Label=`, `Volume=`, `UserNS=`, `UIDMap=`, `GIDMap=`, `ShmSize=`, `ExitPolicy=`, `PodmanArgs=` (`pages/markdown/podman-systemd.unit.5.md:826-877`). A network value ending in `.network` resolves to the corresponding Quadlet network unit and creates a dependency on its service (`pages/markdown/podman-systemd.unit.5.md:925-932`). For one-shot initialization inside a pod, use `ExitPolicy=continue` plus an ordering `Requires=`/`After=` on the container unit (`pages/markdown/podman-systemd.unit.5.md:1872-1892`).

`pod clone` copies an existing pod; `pod prune` removes stopped pods and their containers (`pages/markdown/podman-pod.1.md:11-13`, `:32-34`). Prefer named pods with explicit labels and `ExitPolicy=stop` in service-managed deployments so that restarts are predictable.

## Pitfalls

- Pod-level port publishing is immutable; recreating the pod is required to change it (`pages/markdown/podman-pod-create.1.md:385-387`).
- Publishing ports on individual pod containers is wrong; the pod owns the ports (`pages/markdown/podman-pod-create.1.md:385-386`).
- `--share=cgroup` conflicts with the default `--share-parent=true` cgroup-parent behavior (`pages/markdown/podman-pod-create.1.md:427-429`).
- Pod resource limits are cgroup-parent limits and containers with their own cgroup bypass them (`pages/markdown/podman-pod-create.1.md:18-20`).
- Rootless `pod stats` needs cgroups v2 (`pages/markdown/podman-pod-stats.1.md:5-6`).
- Remote `pod logs` requires `-c`; `--follow` misses containers added after it started (`pages/markdown/podman-pod-logs.1.md:7-8`).
- Quadlet's default `ExitPolicy=stop` plus `Restart=on-failure` will not restart when all containers exit cleanly (`pages/markdown/podman-systemd.unit.5.md:821-824`).
- Default pod name in Quadlet is `systemd-$name`, so a colliding container name must be avoided (`pages/markdown/podman-systemd.unit.5.md:947-952`).

## Sources

- Captured pages: `pages/markdown/podman-pod.1.md`, `pages/markdown/podman-pod-create.1.md`, `pages/markdown/podman-pod-inspect.1.md`, `pages/markdown/podman-pod-ps.1.md`, `pages/markdown/podman-pod-prune.1.md`, `pages/markdown/podman-pod-logs.1.md`, `pages/markdown/podman-pod-stats.1.md`, `pages/markdown/podman-network.1.md`, `pages/markdown/podman-run.1.md`, `pages/markdown/podman-systemd.unit.5.md`.
- https://docs.podman.io/en/latest/markdown/podman-pod.1.html
- https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- https://docs.podman.io/en/latest/markdown/podman-pod-logs.1.html
- https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- https://github.com/containers/podman/tree/055de046937d29450f310fce0fe3071485d8bed9
