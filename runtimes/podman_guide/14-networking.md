# 14 — Networking

## 1. Backend and rootless data path

Podman uses **Netavark** as its network backend; in this release `network_backend` has exactly one supported value, `netavark` — CNI is a legacy backend, not a v6 option (`pages/markdown/podman-network.1.md:7`, `samples/containers.conf:354-359`). Netavark plugins are discovered from `netavark_plugin_dirs` and their names can be used as a `network create` driver (`pages/markdown/podman-network-create.1.md:28-35`). Confirm the active backend and plugin set with `podman info --format '{{.Plugins.Network}}'` (`pages/markdown/podman-network-create.1.md:35`). The firewall driver is chosen automatically; explicit values are `nftables`, `none`, and experimental `firewalld` (`samples/containers.conf:370-375`).

DNS is provided by **aardvark-dns** on networks with DNS enabled (default unless `--disable-dns`): every container is registered under its name and short 12-character ID; pods are registered under the pod name; aliases come from `--network ...:alias=`, `--network-alias`, or `network connect --alias` (`pages/markdown/podman-network.1.md:8-22`). Internal networks answer only container-name queries and return NXDOMAIN for everything else (`pages/markdown/podman-network-create.1.md:49-60`).

Rootless networking uses **pasta** by default (`pages/markdown/podman-network.1.md:63`, `samples/containers.conf:408-411`); slirp4netns is no longer the default on new installations and is kept only for legacy compatibility (`pages/installation.md:94-97`). Pasta copies host IP addresses/routes without NAT, uses `--config-net` and `--no-map-gw` by default, forwards DNS via `169.254.1.1`, and maps `--map-guest-addr 169.254.1.2` for `host.containers.internal` (`pages/markdown/podman-run.1.md:800-818`). Container↔host communication that used to fail under pasta was fixed in Podman 5.3, so do not carry forward the old “rootless cannot reach the host” workaround (`samples/rootless_tutorial.md:27-28`). If pasta cannot identify the default-route interface it fails; choose one with its `-i` option or set `pasta_options` (`pages/markdown/podman-network.1.md:61-63`).

For rootless **bridge** networks, published ports are proxied by `rootlessport` (userspace; source IP may be rewritten). The experimental `rootless_port_forwarder="pasta"` uses pesto kernel forwarding and preserves the original source IP for TCP and UDP; changing it while containers run leaks forwarding rules (`pages/markdown/podman-run.1.md:791`, `samples/containers.conf:413-424`).

## 2. `network create`: drivers, subnets, DNS, isolation

`podman network create` creates a bridge network by default; macvlan/ipvlan need a parent device (`-o parent=` or `--interface-name`), and rootless macvlan/ipvlan cannot access host interfaces (`pages/markdown/podman-network-create.1.md:5-9`, `:25-27`). Captured examples cover deterministic subnet/gateway/route setups.
Verbatim from `pages/markdown/podman-network-create.1.md:121-143`:
```text
Create a network named newnet that uses 192.5.0.0/16 for its subnet.
$ podman network create --subnet 192.5.0.0/16 newnet
newnet
Create an IPv6 network named newnetv6 with a subnet of 2001:db8::/64.
$ podman network create --subnet 2001:db8::/64 --ipv6 newnetv6
newnetv6
Create a network named newnet that uses 192.168.33.0/24 and defines a gateway as 192.168.33.3.
$ podman network create --subnet 192.168.33.0/24 --gateway 192.168.33.3 newnet
newnet
Create a network that uses a 192.168.55.0/24 subnet and has an IP address range of 192.168.55.129 - 192.168.55.254.
$ podman network create --subnet 192.168.55.0/24 --ip-range 192.168.55.128/25
podman5
Create a network with a static IPv4 and IPv6 subnet and set a gateway.
$ podman network create --subnet 192.168.55.0/24 --gateway 192.168.55.3 --subnet fd52:2a5a:747e:3acd::/64 --gateway fd52:2a5a:747e:3acd::10
podman4
Create a network with a static subnet and a static route.
$ podman network create --subnet 192.168.33.0/24 --route 10.1.0.0/24,192.168.33.10 newnet
Create a network with a static subnet and a static route without a default
route.
$ podman network create --subnet 192.168.33.0/24 --route 10.1.0.0/24,192.168.33.10 --opt no_default_route=true newnet
Create a bridge network without isolation from other bridge networks (isolation
defaults to strict). The option must be given as key=value.
$ podman network create --opt isolate=false mynet
```

| Flag | Effect / default |
|---|---|
| `--driver/-d` | `bridge` (default), `macvlan`, `ipvlan`, or a netavark plugin name (`pages/markdown/podman-network-create.1.md:25-35`) |
| `--subnet`, `--gateway`, `--ip-range` | Repeatable and order-matched; gateway and range require a subnet (`pages/markdown/podman-network-create.1.md:38-41`, `:61-65`, `:113-116`) |
| `--ipv6` | Dual-stack; allocates an IPv4 and IPv6 subnet when none are supplied (`pages/markdown/podman-network-create.1.md:76-77`) |
| `--ipam-driver` | `host-local`, `dhcp` (needs `netavark-dhcp-proxy.socket`), `none` (`pages/markdown/podman-network-create.1.md:66-75`) |
| `--dns`, `--disable-dns` | Custom resolvers (`none` suppresses resolv.conf creation); DNS plugin is bridge-only (`pages/markdown/podman-network-create.1.md:12-24`) |
| `--internal` | No external access; no default route; DNS answers only container names (`pages/markdown/podman-network-create.1.md:49-60`) |
| `--opt` | `mtu`, `metric`, `no_default_route`; bridge adds `isolate`, `vlan`, `vrf`, `mode=managed|unmanaged`; macvlan/ipvlan add `parent`, `mode`, `bclim` (`pages/markdown/podman-network-create.1.md:80-105`) |
| `--route` | `CIDR,gateway\|type[,metric]`, including `blackhole`, `unreachable`, `prohibit` (`pages/markdown/podman-network-create.1.md:106-112`) |
| `--label`, `--ignore` | Metadata for filters; idempotent create that does not change existing config (`pages/markdown/podman-network-create.1.md:42-44`, `:78-79`) |

Determinism notes: the default rootful bridge `podman` uses `10.88.0.0/16` (`pages/markdown/podman-network.1.md:59-60`); auto-assigned subnets come from `10.89.0.0/24`–`10.255.255.0/24` and can be reconfigured with `default_subnet_pools` (`pages/markdown/podman-network.1.md:64-65`, `samples/containers.conf:392-404`). Since Podman 6, bridge networks are isolated from other bridges by default (`isolate=strict`); `isolate=false` restores pre-v6 Netavark 2 behavior (`pages/markdown/podman-network-create.1.md:89-92`). For critical workloads, name the network explicitly, fix the subnet/gateway, and set `--internal` plus `isolate=strict` rather than relying on auto-assignment.

## 3. Connection, inspection and lifecycle

| Command | Behavior |
|---|---|
| `network connect NETWORK CTR [--alias --ip --ip6 --mac-address]` | Adds a network; static IPs/MAC are per container on that network (`pages/markdown/podman-network-connect.1.md:4-17`) |
| `network disconnect NETWORK CTR [--force]` | Removing the last network leaves the container effectively `--network=none` (`pages/markdown/podman-network-disconnect.1.md:5-11`) |
| `network inspect [--format]` | JSON config: driver, interface, subnets, DNS, IPv6, internal, IPAM, routes (`pages/markdown/podman-network-inspect.1.md:5-43`) |
| `network ls [--filter --format]` | Filters: driver, id, label, name (regex), until, dangling (`pages/markdown/podman-network-ls.1.md:8-29`) |
| `network update --dns-add/--dns-drop` | Only DNS resolvers can be changed, Netavark only (`pages/markdown/podman-network-update.1.md:5-12`) |
| `network reload [--all]` | Restores container connectivity after firewall rules were deleted, e.g. `firewall-cmd --reload` (`pages/markdown/podman-network-reload.1.md:5-9`, `:18-35`) |
| `network prune [--filter --force]` | Removes unused networks but never the default `podman` network (`pages/markdown/podman-network-prune.1.md:5-8`) |
| `network rm` | Deletes one or more network configurations (`pages/markdown/podman-network.1.md:51-53`) |

Verbatim default-network inspection from `pages/markdown/podman-network-inspect.1.md:47-67`:
```json
[
    {
        "name": "podman",
        "id": "2f259bab93aaaaa2542ba43ef33eb990d0999ee1b9924b557b7be53c0b7a1bb9",
        "driver": "bridge",
        "network_interface": "podman0",
        "created": "2021-06-03T12:04:33.088567413+02:00",
        "subnets": [
            {
                "subnet": "10.88.0.0/16",
                "gateway": "10.88.0.1"
            }
        ],
        "ipv6_enabled": false,
        "internal": false,
        "dns_enabled": false,
        "ipam_options": {
            "driver": "host-local"
        }
    }
]
```

For machine-readable checks use `--format` on `ls`/`inspect` (`.Subnets`, `.DNSEnabled`, `.Internal`, `.NetworkDNSServers`) (`pages/markdown/podman-network-ls.1.md:30-63`, `pages/markdown/podman-network-inspect.1.md:8-43`).

## 4. Run-time modes, ports and isolation

`--network` accepts (`pages/markdown/podman-run.1.md:780-802`):

| Mode | Meaning |
|---|---|
| `bridge[:OPTIONS]` | Default for rootful; options `alias`, `ip`, `ip6`, `mac`, `interface_name`, `host_interface_name`; other keys pass through to Netavark (`pages/markdown/podman-run.1.md:783-792`) |
| `<network-name>[:OPTIONS]` | User-defined network from `network create`; repeat `--network` to join several (`pages/markdown/podman-run.1.md:793-794`) |
| `none` | Network namespace with no configured interfaces (`pages/markdown/podman-run.1.md:795`) |
| `container:ID` | Reuse another container's network stack (`pages/markdown/podman-run.1.md:796`) |
| `host` | Host network namespace; full access to localhost sockets and abstract Unix sockets — a security escape (`pages/markdown/podman-run.1.md:797`) |
| `private` | New namespace: bridge for rootful, pasta for rootless (`pages/markdown/podman-run.1.md:799`) |
| `pasta[:OPTIONS]` | Rootless user-mode stack, default for rootless, preserves source IP, `--map-gw` optionally enables gateway access to the host (`pages/markdown/podman-run.1.md:800-826`) |
| `ns:path` | Join an existing network namespace path (`pages/markdown/podman-run.1.md:798`) |

Port publishing works only for containers with their own network namespace (bridge or pasta); `-p` defaults to TCP, supports UDP and (rootful) SCTP, can bind a chosen host IP, and `-P` publishes all exposed ports to random host ports (`pages/markdown/podman-run.1.md:935-979`). `default_host_ips` in `containers.conf` changes the bind address when no host IP is given (`pages/markdown/podman-run.1.md:944-949`, `samples/containers.conf:444-450`); use `127.0.0.1` for private services. Containers reach the host via `--add-host ...:host-gateway` or the automatic `host.containers.internal`/`host.docker.internal` entries, overridable with `host_containers_internal_ip` or disabled with `--no-hosts` (`pages/markdown/podman-run.1.md:67-90`).

A troubleshooting sequence (derived from the documented commands):
```bash
podman info --format '{{.Plugins.Network}}'          # backend + plugins
podman network ls --filter driver=bridge --format '{{.Name}}: {{.Subnets}}'
podman network inspect app-net --format '{{.DNSEnabled}} {{.Internal}}'
podman port api 8080                                # actual published mapping
podman network reload --all                         # after firewall reload
podman network disconnect app-net api               # isolate a suspect container
```

For critical workloads, prefer an explicitly named internal network with fixed subnet and static container IP (`--network bridge:ip=...` or `network connect --ip`), avoid `--network=host`, and keep `--network=none` for jobs that need no network (`pages/markdown/podman-run.1.md:783-795`, `pages/markdown/podman-network-connect.1.md:12-15`). Remember that a container in a pod does not publish ports individually — the pod owns the published ports (`pages/markdown/podman-run.1.md:969-975`).

## Pitfalls

- CNI is not a v6 backend; `network_backend` accepts only `netavark` (`samples/containers.conf:354-359`).
- Rootless macvlan/ipvlan cannot see host interfaces, and neither macvlan nor ipvlan supports port forwarding (`pages/markdown/podman-network-create.1.md:25-27`, `:36-37`).
- Bridge isolation defaults to `strict` in v6; `isolate=false` is the explicit pre-v6 behavior (`pages/markdown/podman-network-create.1.md:89-92`).
- `network update` changes DNS only; subnet/route changes require recreating the network (`pages/markdown/podman-network-update.1.md:5-7`).
- `firewall-cmd --reload` breaks rootful connectivity until `network reload` runs (`pages/markdown/podman-network-reload.1.md:7-9`).
- `--network=host` exposes all localhost sockets to the container (`pages/markdown/podman-run.1.md:797`).
- Switching `rootless_port_forwarder` while containers are running leaks forwarding rules (`samples/containers.conf:419-424`).

## Sources

- Captured pages: `pages/markdown/podman-network.1.md`, `pages/markdown/podman-network-create.1.md`, `pages/markdown/podman-network-connect.1.md`, `pages/markdown/podman-network-disconnect.1.md`, `pages/markdown/podman-network-inspect.1.md`, `pages/markdown/podman-network-ls.1.md`, `pages/markdown/podman-network-prune.1.md`, `pages/markdown/podman-network-reload.1.md`, `pages/markdown/podman-network-update.1.md`, `pages/markdown/podman-run.1.md`, `pages/installation.md`; samples `samples/containers.conf`, `samples/rootless_tutorial.md`.
- https://docs.podman.io/en/latest/markdown/podman-network.1.html
- https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- https://docs.podman.io/en/latest/markdown/podman-network-inspect.1.html
- https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- https://blog.podman.io/2024/10/podman-5-3-changes-for-improved-networking-experience-with-pasta/
- https://github.com/containers/podman/tree/055de046937d29450f310fce0fe3071485d8bed9
