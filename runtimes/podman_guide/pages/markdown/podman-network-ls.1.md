NAME
podman-network-ls - Display a summary of networks (alias list)
SYNOPSIS
podman network ls [options]
DESCRIPTION
Displays a list of existing podman networks.
OPTIONS
--filter, -f=filter=value
Provide filter values.
If there is more than one filter, the --filter option should be passed multiple times: --filter name=test --filter driver=bridge.
Supported filters:
Filter
Description
driver
Filter by driver type.
id
Filter by full or partial network ID.
label
Filter by network with (or without, in the case of label!=[…] is used) the specified labels.
name
Filter by network name (accepts regex).
until
Filter by networks created before given timestamp.
dangling
Filter by networks with no containers attached.
The driver filter accepts values: bridge, macvlan, ipvlan.
The label filter accepts two formats. One is the label=key or label=key=value, which shows networks with the specified labels. The other format is the label!=key or label!=key=value, which shows networks without the specified labels.
The until filter can be Unix timestamps, date formatted timestamps, or Go duration strings (e.g. 10m, 1h30m) computed relative to the machine’s time.
The dangling filter accepts values true or false.
--format=format
Change the default output format. This can be of a supported type like ‘json’
or a Go template.
Valid placeholders for the Go template are listed below:
Placeholder
Description
.Created …
Timestamp when the network was created
.DNSEnabled
Network has dns enabled (boolean)
.Driver
Network driver
.ID
Network ID
.Internal
Network is internal (boolean)
.IPAMOptions …
Network ipam options
.IPv6Enabled
Network has ipv6 subnet (boolean)
.Labels
Network labels
.Name
Network name
.NetworkDNSServers
Array of DNS servers used in this network
.NetworkInterface
Name of the network interface on the host
.Options …
Network options
.Routes
List of static routes for this network
.Subnets
List of subnets on this network
--no-trunc
Do not truncate the network ID.
--noheading, -n
Omit the table headings from the listing.
--quiet, -q
The quiet option restricts the output to only the network names.
EXAMPLE
Display networks:
$ podman network ls
NETWORK ID    NAME         DRIVER
88a7120ee19d  podman       bridge
6dd508dbf8cd  podman6  bridge
8e35c2cd3bf6  podman5  macvlan
Display only network names:
$ podman network ls -q
podman
podman2
outside
podman9
Display name of network which support bridge plugin:
$ podman network ls --filter driver=bridge --format {{.Name}}
podman
podman2
podman9
List networks with their subnets:
$ podman network ls --format "{{.Name}}: {{range .Subnets}}{{.Subnet}} {{end}}"
podman: 10.88.0.0/16
podman3: 10.89.30.0/24 fde4:f86f:4aab:e68f::/64
macvlan:
SEE ALSO
podman(1), podman-network(1), podman-network-inspect(1), podman-network-create(1)
