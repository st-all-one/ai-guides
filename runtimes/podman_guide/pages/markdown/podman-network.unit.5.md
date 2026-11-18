NAME
podman-network.unit - systemd unit files for managing Podman networks using Quadlet
SYNOPSIS
name.network
DESCRIPTION
Network files are named with a .network extension and contain a section [Network] describing the
named Podman network. The generated service is a one-time command that ensures that the network
exists on the host, creating it if needed.
By default, the Podman network has the same name as the unit, but with a systemd- prefix, i.e. for
a network file named $NAME.network, the generated Podman network is called systemd-$NAME, and
the generated service file is $NAME-network.service. The NetworkName option allows for
overriding this default name with a user-provided one.
Please note that stopping the corresponding service will not remove the Podman network by default -
this can be overridden by the NetworkDeleteOnStop=true option.
In addition, updating an existing network is not supported.
In order to update the network parameters, you must first manually remove the Podman network and then restart the service.
Using network units allows containers to depend on networks being automatically pre-created. This is
particularly interesting when using special options to control network creation, as Podman otherwise creates networks with the default options.
USAGE SUMMARY
The .network file is parsed by the podman-system-generator at boot or reload, generating a systemd
.service that runs podman network create.
OPTIONS
Valid options for [Network] are listed below:
[Network] options
podman network create equivalent
ContainersConfModule=/etc/nvd.conf
--module=/etc/nvd.conf
DisableDNS=true
--disable-dns
DNS=192.168.55.1
--dns=192.168.55.1
Driver=bridge
--driver bridge
Gateway=192.168.55.3
--gateway 192.168.55.3
GlobalArgs=--log-level=debug
--log-level=debug
InterfaceName=enp1
--interface-name enp1
Internal=true
--internal
IPAMDriver=dhcp
--ipam-driver dhcp
IPRange=192.168.55.128/25
--ip-range 192.168.55.128/25
IPv6=true
--ipv6
Label=”XYZ”
--label “XYZ”
NetworkDeleteOnStop=true
Add ExecStopPost to delete the network when the unit is stopped
NetworkName=foo
podman network create foo
Options=isolate=true
--opt isolate=true
PodmanArgs=--dns=192.168.55.1
--dns=192.168.55.1
Subnet=192.5.0.0/16
--subnet 192.5.0.0/16
ContainersConfModule=module
Load the specified containers.conf(5) module.
This option can be listed multiple times.
DisableDNS=true
Disables the DNS plugin for this network which if enabled, can perform container to container name
resolution. It is only supported with the bridge driver, for other drivers it is always disabled.
DNS=ipaddr
Set custom DNS servers.
This option can be used to override the DNS
configuration passed to the container. Typically this is necessary when the
host DNS configuration is invalid for the container (e.g., 127.0.0.1). When this
is the case, the DNS=. flag is necessary for every run.
The special value none can be specified to disable creation of /etc/resolv.conf in the container by Podman.
The /etc/resolv.conf file in the image is then used without changes.
Note that ipaddr may be added directly to the container’s /etc/resolv.conf.
This is not guaranteed though. For example, passing a custom network whose dns_enabled is set to true to --network will result in /etc/resolv.conf only referring to the aardvark-dns server. aardvark-dns then forwards to the supplied ipaddr for all non-container name queries.
Driver=driver
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
Gateway=ip
Define a gateway for the subnet. To provide a gateway address, a
subnet option is required. Can be specified multiple times.
GlobalArgs=
This key contains a list of arguments passed directly after the podman command in the generated
file. It can be used to access Podman features otherwise unsupported by the generator. Since the
generator is unaware of what unexpected interactions can be caused by these arguments, it is not
recommended to use this option.
The format of this is a space separated list of arguments, which can optionally be individually
escaped to allow inclusion of whitespace and other control characters.
This key can be listed multiple times.
InterfaceName=name
This option maps the network_interface option in the network config, see podman network inspect.
Depending on the driver, this can have different effects; for bridge, it uses the bridge interface name.
For macvlan and ipvlan, it is the parent device on the host. It is the same as --opt parent=....
Internal=true
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
IPAMDriver=driver
Set the ipam driver (IP Address Management Driver) for the network. When unset, Podman chooses an
ipam driver automatically based on the network driver.
Valid values are:
dhcp: IP addresses are assigned from a DHCP server on the network.
The netavark-dhcp-proxy.socket unit must be enabled in order to start the DHCP proxy when a container is
started.
host-local: IP addresses are assigned locally.
none: No ip addresses are assigned to the interfaces.
View the driver in the podman network inspect output under the ipam_options field.
IPRange=ip
Allocate container IP from a range. The range must be either a complete subnet in CIDR notation or be in
the <startIP>-<endIP> syntax which allows for a more flexible range compared to the CIDR subnet.
The ip-range option must be used with a subnet option. Can be specified multiple times.
IPv6=true
Enable IPv6 (Dual Stack) networking. If no subnets are given, it allocates an IPv4 and an IPv6 subnet.
Label=key=value [key=value ...]
Set one or more OCI labels on the network.
NetworkDeleteOnStop=true (defaults to false)
When set to true, the network is deleted when the service is stopped.
NetworkName=foo
The (optional) name of the Podman network.
If this is not specified, the default value is the same name as the unit, but with a systemd- prefix,
i.e. a $name.network file creates a systemd-$name Podman network to avoid
conflicts with user-managed networks.
Options=option
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
PodmanArgs=
This key contains a list of arguments passed directly to the end of the podman command
in the generated file. It can be used to access Podman features otherwise unsupported
by the generator. Since the generator is unaware of what unexpected interactions can be
caused by these arguments, it is not recommended to use this option.
The format of this is a space separated list of arguments, which can optionally be individually
escaped to allow inclusion of whitespace and other control characters.
This key can be listed multiple times.
Subnet=subnet
The subnet in CIDR notation. Can be specified multiple times to allocate more than one subnet for this network.
This is useful to set a static IPv4 and IPv6 subnet.
EXAMPLES
Basic bridge network:
[Network]
NetworkName=private0
Subnet=10.10.0.0/16
Gateway=10.10.0.1
Enable IPv6 with IPAM driver:
[Network]
NetworkName=v6net
Subnet=fd00:dead:beef::/64
IPv6=true
IPAMDriver=host-local
SEE ALSO
podman-network-create(1),
podman-systemd.unit(5),
systemd.unit(5)
