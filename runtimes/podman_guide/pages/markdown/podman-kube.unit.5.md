NAME
podman-kube.unit - systemd unit files for managing Podman Kubernetes YAML deployments using Quadlet
SYNOPSIS
name.kube
DESCRIPTION
Kube units are named with a .kube extension and contain a [Kube] section describing
how podman kube play runs as a service. The resulting service file contains a line like
ExecStart=podman kube play … file.yml, and most of the keys in this section control the command-line
options passed to Podman. However, some options also affect the details of how systemd is set up to run and
interact with the container.
There is only one required key, Yaml, which defines the path to the Kubernetes YAML file.
USAGE SUMMARY
The .kube file is parsed by the podman-system-generator at boot or reload, generating a systemd
.service that runs podman kube play. That service can be managed like any other unit:
systemctl --user start name.service
OPTIONS
Valid options for [Kube] are listed below:
[Kube] options
podman kube play equivalent
AutoUpdate=registry
--annotation “io.containers.autoupdate=registry”
ConfigMap=/tmp/config.map
--configmap /tmp/config.map
ContainersConfModule=/etc/nvd.conf
--module=/etc/nvd.conf
ExitCodePropagation=how
How to propagate container error status
GlobalArgs=--log-level=debug
--log-level=debug
KubeDownForce=true
--force (for podman kube down)
LogDriver=journald
--log-driver journald
Network=host
--network host
PodmanArgs=--annotation=key=value
--annotation=key=value
PublishPort=8080:80
--publish 8080:80
SetWorkingDirectory=yaml
Set WorkingDirectory of unit file to location of the YAML file
UserNS=keep-id:uid=200,gid=210
--userns keep-id:uid=200,gid=210
Yaml=/tmp/kube.yaml
podman kube play /tmp/kube.yaml
Supported keys in the [Kube] section are:
AutoUpdate=
Indicates whether pods and containers from this Kubernetes workload are auto-updated (podman-auto-update(1)). AutoUpdate can be specified multiple times. The following values are supported:
registry: Requires a fully-qualified image reference (e.g., quay.io/podman/stable:latest) to be used to create the container. This enforcement is necessary to know which images to actually check and pull. If an image ID was used, Podman does not know which image to check/pull anymore.
local: Tells Podman to compare the image a container is using to the image with its raw name in local storage. If an image is updated locally, Podman simply restarts the systemd unit executing the Kubernetes Quadlet.
name/(local|registry): Tells Podman to perform the local or registry auto-update on the specified container name.
ConfigMap=path
Use the Kubernetes ConfigMap YAML as the path to provide environment variable values within the containers of the pod. (This option is not available with the remote Podman client)
The value may contain only one path but it may be absolute or relative to the location of the unit file.
ContainersConfModule=module
Load the specified containers.conf(5) module.
This option can be listed multiple times.
ExitCodePropagation=how
Control how the main PID of the systemd service should exit. The following values are supported:
all: exit non-zero if all containers have failed (i.e., exited non-zero)
any: exit non-zero if any container has failed
none: exit zero and ignore failed containers
The current default value is none.
GlobalArgs=
This key contains a list of arguments passed directly after the podman command in the generated
file. It can be used to access Podman features otherwise unsupported by the generator. Since the
generator is unaware of what unexpected interactions can be caused by these arguments, it is not
recommended to use this option.
The format of this is a space separated list of arguments, which can optionally be individually
escaped to allow inclusion of whitespace and other control characters.
This key can be listed multiple times.
KubeDownForce=true
Remove all resources, including volumes, when calling podman kube down.
Equivalent to the Podman --force option.
LogDriver=driver
Logging driver for the container. Currently available options are k8s-file, journald, none, passthrough and passthrough-tty, with json-file aliased to k8s-file for scripting compatibility. (Default journald).
The podman info command below displays the default log-driver for the system.
$ podman info --format '{{ .Host.LogDriver }}'
journald
The passthrough driver passes down the standard streams (stdin, stdout, stderr) to the
container. It is not allowed with the remote Podman client, including Mac and Windows (excluding WSL2) machines, and on a tty, since it is
vulnerable to attacks via TIOCSTI.
The passthrough-tty driver is the same as passthrough except that it also allows it to be used on a TTY if the user really wants it.
Network=mode
Set the network mode for the container.
Special cases:
If the name of the network ends with .network, a Podman network called
systemd-$name is used, and the generated systemd service contains
a dependency on the $name-network.service. Such a network can be automatically
created by using a $name.network Quadlet file. Note: the corresponding .network file must exist.
If the name ends with .container,
the container will reuse the network stack of another container created by $name.container.
The generated systemd service contains a dependency on $name.service. Note: the corresponding .container file must exist.
Valid mode values are:
bridge[:OPTIONS,…]: Create a network stack on the default bridge. This is the default for rootful containers. It is possible to specify these additional options:
alias=name: Add network-scoped alias for the container.
ip=IPv4: Specify a static IPv4 address for this container.
ip6=IPv6: Specify a static IPv6 address for this container.
mac=MAC: Specify a static MAC address for this container.
interface_name=name: Specify a name for the created network interface inside the container.
host_interface_name=name: Specify a name for the created network interface outside the container.
Any other options will be passed through to netavark without validation. This can be useful to pass arguments to netavark plugins.
For rootless bridge networks, port forwarding uses rootlessport by default. rootlessport attempts to preserve the original client source IP for remote TCP clients when nft or iptables is available; UDP, loopback, and same-host connections typically still see a rewritten source. Setting rootless_port_forwarder="pasta" in the [network] section of containers.conf(5) switches to pasta’s kernel-level forwarding (via pesto), which reliably preserves the original client source IP for both TCP and UDP. This option is experimental and its behavior is subject to change.
For example, to set a static IPv4 address and a static mac address, use --network bridge:ip=10.88.0.10,mac=44:33:22:11:00:99.
<network name or ID>[:OPTIONS,…]: Connect to a user-defined network; this is the network name or ID from a network created by podman network create. It is possible to specify the same options described under the bridge mode above. Use the --network option multiple times to specify additional networks.
For backwards compatibility it is also possible to specify comma-separated networks on the first --network argument, however this prevents you from using the options described under the bridge section above.
none: Create a network namespace for the container but do not configure network interfaces for it, thus the container has no network connectivity.
container:id: Reuse another container’s network stack.
host: Use the host’s network namespace for the container instead of creating an isolated namespace. Warning: This gives the container full access to abstract Unix domain sockets and to TCP/UDP sockets bound to localhost. Since these mechanisms are often used to prevent access to sensitive system services, isolating them from access by external entities, use of this option may be considered a security vulnerability.
ns:path: Path to a network namespace to join.
private: Create a new namespace for the container. This uses the bridge mode for rootful containers and pasta for rootless ones.
pasta[:OPTIONS,…]: use pasta(1) to create a user-mode networking
stack.
This is the default for rootless containers and only supported in rootless mode.
By default, IPv4 and IPv6 addresses and routes, as well as the pod interface
name, are copied from the host. Port forwarding preserves the original
source IP address. Options described in pasta(1) can be specified as
comma-separated arguments.
In terms of pasta(1) options, --config-net is given by default, in
order to configure networking when the container is started, and
--no-map-gw is also assumed by default, to avoid direct access from
container to host using the gateway address. The latter can be overridden
by passing --map-gw in the pasta-specific options (despite not being an
actual pasta(1) option).
For better integration with DNS handling, --dns-forward 169.254.1.1 is passed by default,
and this address is added to resolv.conf(5) as first resolver. It is possible to pass
--dns-forward explicitly in case a different IP address should be used.
To make the host.containers.internal /etc/hosts entry work and allow connections
to the host, --map-guest-addr 169.254.1.2 is passed by default. Again, it can be set
explicitly to choose a different IP address.
Also, -t none and -u none are passed if, respectively, no TCP or
UDP port forwarding from host to container is configured (via Podman’s
--publish or by passing the pasta -t/-u options directly),
to disable automatic port forwarding based on bound ports. Similarly, -T none
and -U none are given to disable the same functionality from container to
host.
All options can also be set in containers.conf(5);
see the pasta_options key under the network section in that file.
Some examples:
pasta:--map-gw: Allow the container to directly reach the host using the
gateway address.
pasta:--mtu,1500: Specify a 1500 bytes MTU for the tap interface in
the container.
pasta:--ipv4-only,-a,10.0.2.0,-n,24,-g,10.0.2.2,--dns-forward,10.0.2.3,-m,1500,--no-ndp,--no-dhcpv6,--no-dhcp:
disable IPv6, assign 10.0.2.0/24 to the tap0 interface in the container,
with gateway 10.0.2.3, enable DNS forwarder reachable at 10.0.2.3,
set MTU to 1500 bytes, disable NDP, DHCPv6 and DHCP support.
pasta:-I,tap0,--ipv4-only,-a,10.0.2.0,-n,24,-g,10.0.2.2,--dns-forward,10.0.2.3,--no-ndp,--no-dhcpv6,--no-dhcp:
same as above, but leave the MTU to 65520 bytes
pasta:-t,auto,-u,auto,-T,auto,-U,auto: enable automatic port forwarding
based on observed bound ports from both host and container sides
pasta:-T,5201: enable forwarding of TCP port 5201 from container to
host, using the loopback interface instead of the tap interface for improved
performance
PodmanArgs=
This key contains a list of arguments passed directly to the end of the podman command
in the generated file. It can be used to access Podman features otherwise unsupported
by the generator. Since the generator is unaware of what unexpected interactions can be
caused by these arguments, it is not recommended to use this option.
The format of this is a space separated list of arguments, which can optionally be individually
escaped to allow inclusion of whitespace and other control characters.
This key can be listed multiple times.
PublishPort=[[hostIP:][hostPort]:]containerPort[/protocol]
Publish a container’s port, or range of ports, to the host.
Both hostPort and containerPort can be specified as a range of ports.
When specifying ranges for both, the number of container ports in the
range must match the number of host ports in the range.
If hostIP is 0.0.0.0, only IPv4 addresses will be bound, if set to [::] only
IPv6 addresses are bound. In all other cases the exact IP address as given will be bound.
If hostIP is not set at all, the port is bound on all IP addresses on the host,
both v4 and v6 (if possible).
The default hostIP can be configured in containers.conf(5)
using the default_host_ips option under the [network] section.
This option accepts an array to be able to set multiple bind IP addresses.
For example setting default_host_ips = ["127.0.0.1", "::1"] will make the
port be published on the ipv4 and ipv6 localhost address respectively.
An explicit hostIP set on the command will always override the config option.
By default, Podman publishes TCP ports. To publish a UDP port instead, give
udp as protocol. To publish both TCP and UDP ports, set --publish twice,
with tcp, and udp as protocols respectively. Rootful containers can also
publish ports using the sctp protocol.
Host port does not have to be specified (e.g. podman run -p 127.0.0.1::80).
If it is not, the container port is randomly assigned a port on the host.
Use podman port to see the actual mapping: podman port $CONTAINER $CONTAINERPORT.
Port publishing is only supported for containers utilizing their own network namespace
through bridge networks, or the pasta network mode.
For rootless bridge networks, port forwarding uses rootlessport by default,
a userspace proxy. It attempts to preserve the original client source IP for
remote TCP clients when nft or iptables is available in the rootless
network namespace; UDP, loopback, and same-host connections typically still see
a rewritten source address. Setting rootless_port_forwarder="pasta" in the
[network] section of
containers.conf(5)
switches to pasta’s kernel-level forwarding via pesto, which reliably
preserves the original client IP for both TCP and UDP. This option is
experimental and its behavior is subject to change.
SetWorkingDirectory=yaml
Set the WorkingDirectory directive in the [Service] section of the systemd service unit file.
Used to allow podman kube play to correctly resolve relative paths.
Supported values are yaml and unit to set the working directory to that of the YAML file or Quadlet unit file, respectively.
Alternatively, users can explicitly set the WorkingDirectory directive in the [Service] section of the .kube file.
Please note that if the WorkingDirectory directive in the [Service] section is set,
Quadlet will not set it even if SetWorkingDirectory is set.
UserNS=mode
Set the user namespace mode for the container.
If --userns is not set, the default value is determined as follows.
If --pod is set, --userns is ignored and the user namespace of the pod is used.
If the environment variable PODMAN_USERNS is set its value is used.
If userns is specified in containers.conf this value is used.
Otherwise, --userns=host is assumed.
--userns="" (i.e., an empty string) is an alias for --userns=host.
This option is incompatible with GIDMap=, UIDMap=, SubUIDMap= and SubGIDMap=.
Rootless user --userns=Key mappings:
Key
Host User
Container User
auto
$UID
nil (Host User UID is not mapped into container.)
host
$UID
0 (Default User account mapped to root user in container.)
keep-id
$UID
$UID (Map user account to same UID within container.)
keep-id:uid=200,gid=210
$UID
200:210 (Map user account to specified UID, GID value within container.)
nomap
$UID
nil (Host User UID is not mapped into container.)
Valid mode values are:
auto[:OPTIONS,…]: automatically create a unique user namespace.
rootful mode: The --userns=auto flag requires that the user name containers be specified in the /etc/subuid and /etc/subgid files, with an unused range of subordinate user IDs that Podman containers are allowed to allocate. Example: containers:2147483647:2147483648.
rootless mode: The users range from the /etc/subuid and /etc/subgid files will be used. Note running a single container without using --userns=auto will use the entire range of UIDs and not allow further subdividing. See subuid(5).
Podman allocates unique ranges of UIDs and GIDs from the containers subordinate user IDs. The size of the ranges is based on the number of UIDs required in the image. The number of UIDs and GIDs can be overridden with the size option.
The option --userns=keep-id uses all the subuids and subgids of the user.
The option --userns=nomap uses all the subuids and subgids of the user except the user’s own ID.
Using --userns=auto when starting new containers does not work as long as any containers exist that were started with --userns=nomap or --userns=keep-id without limiting the user namespace size.
Valid auto options:
gidmapping=CONTAINER_GID:HOST_GID:SIZE: to force a GID mapping to be present in the user namespace.
size=SIZE: to specify an explicit size for the automatic user namespace. e.g. --userns=auto:size=8192. If size is not specified, auto estimates a size for the user namespace.
uidmapping=CONTAINER_UID:HOST_UID:SIZE: to force a UID mapping to be present in the user namespace.
The host UID and GID in gidmapping and uidmapping can optionally be prefixed with the @ symbol.
In this case, podman will look up the intermediate ID corresponding to host ID and it will map the found intermediate ID to the container id.
For details see UIDMap=.
container:id: join the user namespace of the specified container.
host or “” (empty string): run in the user namespace of the caller. The processes running in the container have the same privileges on the host as any other process launched by the calling user.
keep-id: creates a user namespace where the current user’s UID:GID are mapped to the same values in the container. For containers created by root, the current mapping is created into a new user namespace.
In addition, the init process within the container will run under the current user’s UID. This behavior overrides the image’s USER instruction unless you explicitly set --user.
Valid keep-id options:
uid=UID: override the UID inside the container that is used to map the current user to.
gid=GID: override the GID inside the container that is used to map the current user to.
size=SIZE: override the size of the configured user namespace. It is useful to not saturate all the available IDs. Not supported when running as root.
nomap: creates a user namespace where the current rootless user’s UID:GID are not mapped into the container. This option is not allowed for containers created by the root user.
ns:namespace: run the container in the given existing user namespace.
Yaml=path
The path, absolute or relative to the location of the unit file, to the Kubernetes YAML file to use.
EXAMPLES
Deploy from local YAML:
[Unit]
Description=A kubernetes yaml based service
Before=local-fs.target
[Kube]
Yaml=/opt/k8s/deployment.yml
[Install]
# Start by default on boot
WantedBy=multi-user.target default.target
SEE ALSO
podman-kube-generate(1),
podman-kube-play(1),
podman-systemd.unit(5),
systemd.unit(5)
