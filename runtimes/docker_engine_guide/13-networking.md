# 13 - networking

Network choice determines isolation, discoverability, and which ports are reachable. Prefer scoped user-defined networks over the default bridge.

## Drivers at a glance

| Driver | Scope and behavior |
|---|---|
| `bridge` | Same daemon host; user-defined bridges give DNS by name/alias and isolate stacks; masquerade for egress |
| `host` | Shares the host network namespace, no container IP; `-p`/`-P` are ignored with a warning |
| `none` | Loopback device only; no IPv6 loopback configured |
| `macvlan` | Per-container MAC on the physical network; Linux only, not rootless, no direct host-container path |
| `ipvlan` | `l2`/`l3`/`l3s` modes on a parent interface, bypassing the Linux bridge |
| `overlay` | Multi-host network; requires Swarm membership even for standalone containers |

`pages/engine/network/drivers/bridge.md:4-23` `pages/engine/network/drivers/host.md:4-27` `pages/engine/network/drivers/none.md:4-17` `pages/engine/network/drivers/macvlan.md:13-41` `pages/engine/network/drivers/ipvlan.md:4-23,25-34` `pages/engine/network/drivers/overlay.md:4-18,24-28`

Macvlan needs a `parent` interface, subnet, and gateway; its options are `macvlan_mode` (`bridge` default, `vepa`, `passthru`, `private`) and `parent`. `pages/engine/network/drivers/macvlan.md:43-69` IPvlan options are `ipvlan_mode` (`l2` default), `ipvlan_flag` (`bridge` default), and `parent`; kernel 4.2+ is required. `pages/engine/network/drivers/ipvlan.md:25-48` Overlay needs `2377/tcp`, `4789/udp`, and `7946/tcp+udp` open between hosts. `pages/engine/network/drivers/overlay.md:24-34` `--attachable` permits standalone containers; `--opt encrypted` enables IPsec/VXLAN encryption with a non-negligible performance penalty. `pages/engine/network/drivers/overlay.md:36-67`

## User-defined bridges and stack isolation

The default bridge allows unrelated containers to communicate and lacks automatic DNS; user-defined bridges give DNS resolution, better isolation, on-the-fly attach/detach, and per-network settings such as MTU. `pages/engine/network/drivers/bridge.md:36-75` Containers on a user-defined bridge expose ports to each other; external access requires publishing. `pages/engine/network/drivers/bridge.md:97-100`

Compose creates `<project-name>_default` and registers each service name in internal DNS. `pages/compose/how-tos/networking.md:6-10` Services only reach networks granted via service-level `networks`; a service on two networks can bridge them, while services without a shared network are isolated. `pages/reference/compose-file/networks.md:8-12,63`

Example topology: `proxy` on `frontend` only, `app` on `frontend` and `backend`, `db` on `backend`; `frontend` uses `driver: bridge` with `driver_opts` `com.docker.network.bridge.host_binding_ipv4: "127.0.0.1"`. `pages/compose/how-tos/networking.md:89-112`


## DNS, aliases, and deterministic addresses

Service-level `aliases` add network-scoped hostnames; the same service may use different aliases per network, and a shared alias resolves to an unspecified container. `pages/reference/compose-file/services.md:1431-1440` `extra_hosts` writes `/etc/hosts` entries, and `host-gateway` maps to the host IP (`host.docker.internal` on Mac/Windows). `pages/compose/how-tos/networking.md:256-279`

`ipam` accepts `driver`, `config` entries (`subnet`, `ip_range`, `gateway`, `aux_addresses`), and `options`. `pages/reference/compose-file/networks.md:193-203` Static `ipv4_address`/`ipv6_address` require a matching `ipam` subnet. `pages/reference/compose-file/services.md:1550-1555`

Example: network `front-tier` defines `ipam` subnets `172.16.238.0/24` and `2001:3984:3989::/64`; `frontend` sets `ipv4_address: 172.16.238.10` and `ipv6_address: 2001:3984:3989::10`. `pages/reference/compose-file/services.md:1557-1573`


`networks.<name>.name` is used as-is and is not project-scoped, which supports stable cross-project names or `external: true` lookup. `pages/reference/compose-file/networks.md:254-272`

## Port publishing and host binding

Publishing is insecure by default: a published port is reachable beyond the host. Binding to `127.0.0.1` or `::1` restricts access to the host, though peers on the same L2 segment may still reach it. `pages/engine/network/port-publishing.md:38-52` Forms: `-p 8080:80`, `-p 192.168.1.100:8080:80`, `-p 8080:80/udp`, and both TCP+UDP mappings. `pages/engine/network/port-publishing.md:31-34`

Loopback-only publishing: `docker run -p 127.0.0.1:8080:80 -p '[::1]:8080:80' nginx`. `pages/engine/network/port-publishing.md:46`


Gateway modes control egress and direct routing: `nat` is default and filters unpublished ports; `routed` uses container addresses and requires routing from remote hosts; `nat-unprotected` exposes unpublished ports via direct routing. `pages/engine/network/port-publishing.md:144-179` In Compose, `driver_opts` can set `com.docker.network.bridge.host_binding_ipv4` to restrict binding. `pages/reference/compose-file/networks.md:127-137`

## Firewall interaction

Docker creates host-namespace iptables rules for bridge networks and DNS; daemon options `iptables`/`ip6tables` can disable this, and Docker may set the `FORWARD` policy to `DROP`. `pages/engine/network/firewall-iptables.md:4-9,42` Custom rules belong in `DOCKER-USER`, which is evaluated before Docker's own rules and cannot match internal container addresses. `pages/engine/network/firewall-iptables.md:73-105`

nftables support is experimental as of Docker 29.0.0, is selected by `--firewall-backend=nftables` or `"firewall-backend": "nftables"`, has no `DOCKER-USER` chain (use base-chain priorities), and cannot be enabled when overlay networks are in use because overlay rules were not migrated. `pages/engine/network/firewall-nftables.md:6-23,47-56` Switching backends deletes Docker's old chains, and a leftover `FORWARD DROP` policy can still drop packets accepted by nftables. `pages/engine/network/firewall-nftables.md:58-74,134-137`

## Internal and multi-host networks

`internal: true` removes the default gateway and external connectivity; a service attached to both an internal and a public network can still reach the internet via the public one. `pages/reference/compose-file/networks.md:223-226` `pages/compose/how-tos/networking.md:127-150` In Swarm mode Compose creates overlay networks as attachable by default. `pages/compose/how-tos/networking.md:300-304` `labels` add metadata and Compose sets `com.docker.compose.project`/`com.docker.compose.network`. `pages/reference/compose-file/networks.md:228-252`

## Sources

- https://docs.docker.com/engine/network/drivers/bridge/
- https://docs.docker.com/engine/network/drivers/host/
- https://docs.docker.com/engine/network/drivers/none/
- https://docs.docker.com/engine/network/drivers/macvlan/
- https://docs.docker.com/engine/network/drivers/ipvlan/
- https://docs.docker.com/engine/network/drivers/overlay/
- https://docs.docker.com/engine/network/port-publishing/
- https://docs.docker.com/engine/network/firewall-iptables/
- https://docs.docker.com/engine/network/firewall-nftables/
- https://docs.docker.com/compose/how-tos/networking/
- https://docs.docker.com/reference/compose-file/networks/
