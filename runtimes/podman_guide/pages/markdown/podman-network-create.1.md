NAME
podman-network-create - Create a Podman network
SYNOPSIS
podman network create [options] [name]
DESCRIPTION
Create a network configuration for use with Podman. By default, Podman creates a bridge connection.
A Macvlan connection can be created with the -d macvlan option. A parent device for macvlan or
ipvlan can be designated with the -o parent=<device> or --interface-name=<device> option.
If no options are provided, Podman assigns a free subnet and name for the network.
Upon completion of creating the network, Podman displays the name of the newly added network.
OPTIONS
--disable-dns
Disables the DNS plugin for this network which if enabled, can perform container to container name
resolution. It is only supported with the bridge driver, for other drivers it is always disabled.
--dns=ipaddr
Set custom DNS servers.
This option can be used to override the DNS
configuration passed to the container. Typically this is necessary when the
host DNS configuration is invalid for the container (e.g., 127.0.0.1). When this
is the case, the --dns flag is necessary for every run.
The special value none can be specified to disable creation of /etc/resolv.conf in the container by Podman.
The /etc/resolv.conf file in the image is then used without changes.
Note that ipaddr may be added directly to the container’s /etc/resolv.conf.
This is not guaranteed though. For example, passing a custom network whose dns_enabled is set to true to --network will result in /etc/resolv.conf only referring to the aardvark-dns server. aardvark-dns then forwards to the supplied ipaddr for all non-container name queries.
--driver, -d=driver
Driver to manage the network. Currently bridge, macvlan and ipvlan are supported. Defaults to bridge.
When running rootless, the macvlan and ipvlan drivers have no access to the host network interfaces because rootless networking requires a separate network namespace.
The netavark backend allows the use of so called netavark plugins, see the
plugin-API.md
documentation in netavark. The binary must be placed in a specified directory
so Podman can discover it, this list is set in netavark_plugin_dirs in
containers.conf(5)
under the [network] section.
The name of the plugin can then be used as driver to create a network for your plugin.
The list of all supported drivers and plugins can be seen with podman info --format {{.Plugins.Network}}.
Note that the macvlan and ipvlan drivers do not support port forwarding. Support for port forwarding
with a plugin depends on the implementation of the plugin.
--gateway=ip
Define a gateway for the subnet. To provide a gateway address, a
subnet option is required. Can be specified multiple times.
The argument order of the --subnet, --gateway and --ip-range options must match.
--ignore
Ignore the create request if a network with the same name already exists instead of failing.
Note: trying to create a network with an existing name and different parameters does not change the configuration of the existing one.
--interface-name=name
This option maps the network_interface option in the network config, see podman network inspect.
Depending on the driver, this can have different effects; for bridge, it uses the bridge interface name.
For macvlan and ipvlan, it is the parent device on the host. It is the same as --opt parent=....
--internal
Restrict external access of this network when using a bridge network.
When using the macvlan or ipvlan driver with this option, no default route will be added to the container.
Because it bypasses the host network stack, no additional restrictions can be set by Podman, and if a
privileged container is run, the container can set a default route itself. If this is a concern, then the
container connections should be blocked on the actual network gateway.
Using the bridge driver with this option has the following effects:
Global IP forwarding sysctls will not be changed in the host network namespace.
IP forwarding is disabled on the bridge interface instead of setting up a firewall.
No default route will be added to the container.
In all cases, aardvark-dns will only resolve container names with this option enabled.
Other queries will be answered with NXDOMAIN.
--ip-range=range
Allocate container IP from a range. The range must be either a complete subnet in CIDR notation or be in
the <startIP>-<endIP> syntax which allows for a more flexible range compared to the CIDR subnet.
The ip-range option must be used with a subnet option. Can be specified multiple times.
The argument order of the --subnet, --gateway and --ip-range options must match.
--ipam-driver=driver
Set the ipam driver (IP Address Management Driver) for the network. When unset, Podman chooses an
ipam driver automatically based on the network driver.
Valid values are:
dhcp: IP addresses are assigned from a DHCP server on the network.
The netavark-dhcp-proxy.socket unit must be enabled in order to start the DHCP proxy when a container is
started.
host-local: IP addresses are assigned locally.
none: No ip addresses are assigned to the interfaces.
View the driver in the podman network inspect output under the ipam_options field.
--ipv6
Enable IPv6 (Dual Stack) networking. If no subnets are given, it allocates an IPv4 and an IPv6 subnet.
--label=key=value
Set one or more OCI labels on the network.
--opt, -o=option
Set driver specific options.
All drivers accept the mtu, metric, no_default_route and options.
mtu: Sets the Maximum Transmission Unit (MTU) and takes an integer value.
metric Sets the Route Metric for the default route created in every container joined to this network. Accepts a positive integer value. Can only be used with the Netavark network backend.
no_default_route: If set to true, Podman will not automatically add a default route to subnets. Routes can still be added
manually by creating a custom route using --route.
Additionally the bridge driver supports the following options:
vlan: This option assigns a VLAN tag and enables vlan_filtering. Defaults to none.
isolate: This option isolates bridge networks from other bridge networks. Must be set as isolate=<value> (a value is required; bare isolate is invalid). Defaults to strict. Supported values:
strict: Block traffic to and from all other bridge networks. This is the default when the option is omitted.
true: Block traffic only between networks that also have isolation enabled (true or strict).
false: Do not isolate the network; allow traffic to other bridge networks. Use this to restore the pre-Podman 6 / Netavark 2 behavior.
com.docker.network.bridge.name: This option assigns the given name to the created Linux Bridge
com.docker.network.driver.mtu: Sets the Maximum Transmission Unit (MTU) and takes an integer value.
vrf: This option assigns a Virtual Routing and Forwarding (VRF) routing table to the bridge interface. It accepts the VRF name and defaults to none. Can only be used with the Netavark network backend.
mode: This option sets the specified bridge mode on the interface. Defaults to managed. Supported values:
managed: Podman creates and deletes the bridge and changes sysctls of it. It adds firewall rules to masquerade outgoing traffic, as well as setup port forwarding for incoming traffic using DNAT.
unmanaged: Podman uses an existing bridge. It must exist by the time you want to start a container which uses the network. There will be no NAT or port forwarding, even if such options were passed while creating the container.
The macvlan and ipvlan driver support the following options:
parent: The host device which is used for the macvlan interface. Defaults to the default route interface.
mode: This option sets the specified ip/macvlan mode on the interface.
Supported values for macvlan are bridge, private, vepa, passthru. Defaults to bridge.
Supported values for ipvlan are l2, l3, l3s. Defaults to l2.
Additionally the macvlan driver supports the bclim option:
bclim: Set the threshold for broadcast queueing. Must be a 32 bit integer. Setting this value to -1 disables broadcast queueing altogether.
--route=route
A static route in the format <destination in CIDR notation>,<gateway|type>,<route metric (optional)>.
The gateway must be a valid ip address or alternatively a type can be set instead which must be either
of blackhole, unreachable or prohibit and means the subnet will not be routed anywhere.
This route will be added to every container in this network. It can be specified multiple times if more than one static route is desired.
Note, routes are added into the container namespace, if a container is given the CAP_NET_ADMIN capability it is able to alter
the routes so this cannot be used for security relevant things in that case.
--subnet=subnet
The subnet in CIDR notation. Can be specified multiple times to allocate more than one subnet for this network.
The argument order of the --subnet, --gateway and --ip-range options must match.
This is useful to set a static IPv4 and IPv6 subnet.
EXAMPLES
Create a network with no options.
$ podman network create
podman2
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
mynet
Create a network with a route type blackhole. This means the traffic to the destination subnet will be dropped silently.
$ podman network create --route 10.1.0.0/24,blackhole --opt no_default_route=true newnet
Create a Macvlan based network using the host interface eth0. Macvlan networks can only be used as root.
$ sudo podman network create -d macvlan -o parent=eth0 --subnet 192.5.0.0/16 newnet
newnet
SEE ALSO
podman(1), podman-network(1), podman-network-inspect(1), podman-network-ls(1), containers.conf(5)
