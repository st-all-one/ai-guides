NAME
podman-container.unit - systemd unit files for managing containers using Podman Quadlet
SYNOPSIS
name.container
DESCRIPTION
Container units are named with a .container extension and contain a [Container] section describing
the container that is run as a service. The resulting service file contains a line like
ExecStart=podman run ... image-name, and most of the keys in this section control the command-line
options passed to Podman. However, some options also affect the details of how systemd is set up to run and
interact with the container.
By default, the Podman container has the same name as the unit, but with a systemd- prefix, i.e.
a $name.container file creates a $name.service unit and a systemd-$name Podman container. The
ContainerName option allows for overriding this default name with a user-provided one.
There is only one required key, Image, which defines the container image the service runs.
USAGE SUMMARY
The .container file is parsed by the podman-system-generator at boot or reload, generating a systemd
.service that runs podman run. That service can be managed like any other unit:
systemctl --user start myimage-container.service
OPTIONS
Valid options for [Container] are listed below:
[Container] options
podman run equivalent
AddCapability=CAP
--cap-add CAP
AddDevice=/dev/foo
--device /dev/foo
AddHost=example.com:192.168.10.11
--add-host example.com:192.168.10.11
Annotation=”XYZ”
--annotation “XYZ”
AutoUpdate=registry
--label “io.containers.autoupdate=registry”
CgroupsMode=no-conmon
--cgroups=no-conmon
ContainerName=name
--name name
ContainersConfModule=/etc/nvd.conf
--module=/etc/nvd.conf
DNS=192.168.55.1
--dns=192.168.55.1
DNSOption=ndots:1
--dns-option=ndots:1
DNSSearch=example.com
--dns-search example.com
DropCapability=CAP
--cap-drop=CAP
Entrypoint=/foo.sh
--entrypoint=/foo.sh
Environment=foo=bar
--env foo=bar
EnvironmentFile=/tmp/env
--env-file /tmp/env
EnvironmentHost=true
--env-host
Exec=/usr/bin/command
Command after image specification - /usr/bin/command
ExposeHostPort=50-59
--expose 50-59
GIDMap=0:10000:10
--gidmap=0:10000:10
GlobalArgs=--log-level=debug
--log-level=debug
Group=1234
--user UID:1234
GroupAdd=keep-groups
--group-add=keep-groups
HealthCmd=/usr/bin/command
--health-cmd=/usr/bin/command
HealthInterval=2m
--health-interval=2m
HealthLogDestination=/foo/log
--health-log-destination=/foo/log
HealthMaxLogCount=5
--health-max-log-count=5
HealthMaxLogSize=500
--health-max-log-size=500
HealthOnFailure=kill
--health-on-failure=kill
HealthRetries=5
--health-retries=5
HealthStartPeriod=1m
--health-start-period=1m
HealthStartupCmd=command
--health-startup-cmd=command
HealthStartupInterval=1m
--health-startup-interval=1m
HealthStartupRetries=8
--health-startup-retries=8
HealthStartupSuccess=2
--health-startup-success=2
HealthStartupTimeout=1m33s
--health-startup-timeout=1m33s
HealthTimeout=20s
--health-timeout=20s
HostName=example.com
--hostname example.com
HttpProxy=true
--http-proxy=true
Image=ubi8
Image specification - ubi8
ImageVolume=tmpfs
--image-volume tmpfs
IP=192.5.0.1
--ip 192.5.0.1
IP6=2001:db8::1
--ip6 2001:db8::1
Label=”XYZ”
--label “XYZ”
LogDriver=journald
--log-driver journald
LogOpt=path=/var/log/mykube.json
--log-opt path=/var/log/mykube.json
Mask=/proc/sys/foo:/proc/sys/bar
--security-opt mask=/proc/sys/foo:/proc/sys/bar
Memory=20g
--memory 20g
Mount=type=…
--mount type=…
Network=host
--network host
NetworkAlias=name
--network-alias name
NoNewPrivileges=true
--security-opt no-new-privileges
Notify=true
--sdnotify container
PidsLimit=10000
--pids-limit 10000
Pod=pod-name
--pod=pod-name
PodmanArgs=--publish 8080:80
--publish 8080:80
PublishPort=8080:80
--publish 8080:80
Pull=never
--pull never
ReadOnly=true
--read-only
ReadOnlyTmpfs=true
--read-only-tmpfs
ReloadCmd=/usr/bin/command
Add ExecReload and run exec with the value
ReloadSignal=SIGHUP
Add ExecReload and run kill with the signal
Retry=5
--retry=5
RetryDelay=5s
--retry-delay=5s
Rootfs=/var/lib/rootfs
--rootfs /var/lib/rootfs
RunInit=true
--init
SeccompProfile=/tmp/s.json
--security-opt seccomp=/tmp/s.json
Secret=secret
--secret=secret[,opt=opt …]
SecurityLabelDisable=true
--security-opt label=disable
SecurityLabelFileType=usr_t
--security-opt label=filetype:usr_t
SecurityLabelLevel=s0:c1,c2
--security-opt label=level:s0:c1,c2
SecurityLabelNested=true
--security-opt label=nested
SecurityLabelType=spc_t
--security-opt label=type:spc_t
ShmSize=100m
--shm-size=100m
StartWithPod=true
If Pod= is defined, container is started by pod
StopSignal=SIGINT
--stop-signal=SIGINT
StopTimeout=20
--stop-timeout=20
SubGIDMap=gtest
--subgidname=gtest
SubUIDMap=utest
--subuidname=utest
Sysctl=name=value
--sysctl=name=value
Timezone=local
--tz local
Tmpfs=/work
--tmpfs /work
UIDMap=0:10000:10
--uidmap=0:10000:10
Ulimit=nofile=1000:10000
--ulimit nofile=1000:10000
Unmask=ALL
--security-opt unmask=ALL
User=bin
--user bin
UserNS=keep-id:uid=200,gid=210
--userns keep-id:uid=200,gid=210
Volume=/source:/dest
--volume /source:/dest
WorkingDir=$HOME
--workdir $HOME
Supported keys in the [Container] section are:
AddCapability=capability
Add Linux capabilities.
Granting additional capabilities increases the privileges of the
processes running inside the container and potentially allow it to
break out of confinement. Capabilities like CAP_SYS_ADMIN,
CAP_SYS_PTRACE, CAP_MKNOD and CAP_SYS_MODULE are particularly
dangerous when they are not used within a user namespace. Please
refer to user_namespaces(7) for a more detailed explanation of the
interaction between user namespaces and capabilities.
Before adding any capability, review its security implications and
ensure it is really necessary for the container’s functionality. See
capabilities(7) for more information.
AddDevice=host-device[:container-device][:permissions]
Add a host device to the container. The format of this is
HOST-DEVICE[:CONTAINER-DEVICE][:PERMISSIONS], where HOST-DEVICE is the path of
the device node on the host, CONTAINER-DEVICE is the path of the device node in
the container, and PERMISSIONS is a list of permissions combining ‘r’ for read,
‘w’ for write, and ‘m’ for mknod(2).
Example: --device=/dev/sdc:/dev/xvdc:rwm.
Note: if host-device is a symbolic link then it is resolved first.
The container only stores the major and minor numbers of the host device.
Podman may load kernel modules required for using the specified
device. The devices that Podman loads modules for when necessary are:
/dev/fuse.
In rootless mode, the new device is bind mounted in the container from the host
rather than Podman creating it within the container space. Because the bind
mount retains its SELinux label on SELinux systems, the container can get
permission denied when accessing the mounted device. Modify SELinux settings to
allow containers to use all device labels via the following command:
$ sudo setsebool -P container_use_devices=true
AddHost=hostname[;hostname[;...]]:ip
Add a custom host-to-IP mapping to the container’s /etc/hosts file.
The option takes one or multiple semicolon-separated hostnames to be mapped to
a single IPv4 or IPv6 address, separated by a colon. It can also be used to
overwrite the IP addresses of hostnames Podman adds to /etc/hosts by default
(also see the --name and --hostname options). This option can be
specified multiple times to add additional mappings to /etc/hosts. It
conflicts with the --no-hosts option and conflicts with no_hosts=true in
containers.conf.
Instead of an IP address, the special flag host-gateway can be given. This
resolves to an IP address the container can use to connect to the host. The
IP address chosen depends on your network setup, thus there’s no guarantee that
Podman can determine the host-gateway address automatically, which will then
cause Podman to fail with an error message. You can overwrite this IP address
using the host_containers_internal_ip option in containers.conf.
The host-gateway address is also used by Podman to automatically add the
host.containers.internal and host.docker.internal hostnames to /etc/hosts.
You can prevent that by either giving the --no-hosts option, or by setting
host_containers_internal_ip=”none” in containers.conf. If no host-gateway
address was configured manually and Podman fails to determine the IP address
automatically, Podman will silently skip adding these internal hostnames to
/etc/hosts. If Podman is running in a virtual machine using podman machine
(this includes Mac and Windows hosts), Podman will silently skip adding the
internal hostnames to /etc/hosts, unless an IP address was configured
manually; the internal hostnames are resolved by the gvproxy DNS resolver
instead.
Podman will use the /etc/hosts file of the host as a basis by default, i.e.
any hostname present in this file will also be present in the /etc/hosts file
of the container. A different base file can be configured using the
base_hosts_file config in containers.conf.
Annotation=key=value
Add an annotation to the container. This option can be set multiple times.
AutoUpdate=registry
Indicates whether the container will be auto-updated (podman-auto-update(1)). The following values are supported:
registry: Requires a fully-qualified image reference (e.g., quay.io/podman/stable:latest) to be used to create the container. This enforcement is necessary to know which image to actually check and pull. If an image ID was used, Podman does not know which image to check/pull anymore.
local: Tells Podman to compare the image a container is using to the image with its raw name in local storage. If an image is updated locally, Podman simply restarts the systemd unit executing the container.
CgroupsMode=how
Determines whether the container creates cgroups.
By default, the cgroups mode of the container created by Quadlet is split,
which differs from the default (enabled) used by the Podman CLI.
If the container joins a pod (i.e. Pod= is specified), you may want to change this to
no-conmon or enabled so that pod level cgroup resource limits can take effect.
The enabled option creates a new cgroup under the cgroup-parent.
The disabled option forces the container to not create cgroups, and thus conflicts with cgroup options (--cgroupns and --cgroup-parent).
The no-conmon option disables a new cgroup only for the conmon process.
The split option splits the current cgroup in two sub-cgroups: one for conmon and one for the container payload. It is not possible to set --cgroup-parent with split.
ContainerName=name
Assign a name to the container.
The operator can identify a container in three ways:
UUID long identifier (“f78375b1c487e03c9438c729345e54db9d20cfa2ac1fc3494b6eb60872e74778”);
UUID short identifier (“f78375b1c487”);
Name (“jonah”).
Podman generates a UUID for each container, and if no name is assigned to the
container using ContainerName=,
Podman generates a random string name such as exciting_chebyshev (adjective_noun,
compatible with Docker). Container names are not required to be valid hostnames or
domain names. Underscores and other characters allowed by naming rules are
permitted. On Podman networks with DNS enabled, container-to-container name
resolution still uses the name as given, for example exciting_chebyshev. The
name can be useful as a more human-friendly way to identify containers.
This works for both background and foreground containers.
The container’s name is also added to the /etc/hosts file using the
container’s primary IP address (also see the
AddHost= option).
The name is not the hostname inside the container; see
HostName=. See
podman-network(1) for more on network DNS.
ContainersConfModule=module
Load the specified containers.conf(5) module.
This option can be listed multiple times.
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
DNSOption=option
Set custom DNS options. Invalid if using DNSOption=
with Network= that is set to none or container:id.
DNSSearch=domain
Set custom DNS search domains. Invalid if using DNSSearch=
with Network= that is set to none or container:id.
Use DNSSearch=. to remove the search domain.
DropCapability=capability
Drop these capabilities from the default podman capability set, or all to drop all capabilities.
This is a space separated list of capabilities.
Entrypoint="command"
Override the default ENTRYPOINT from the image.
The ENTRYPOINT of an image is similar to a COMMAND
because it specifies what executable to run when the container starts, but it is
(purposely) more difficult to override. The ENTRYPOINT gives a container its
default nature or behavior. When the ENTRYPOINT is set, the
container runs as if it were that binary, complete with default options. More options can be
passed in via the COMMAND. But, if a user wants to run
something else inside the container, the Entrypoint= option allows a new
ENTRYPOINT to be specified.
Specify multi option commands in the form of a JSON string.
Environment=env=value [env=value ...]
Set environment variables.
This option allows arbitrary environment variables that are available for the process to be launched inside of the container. If an environment variable is specified without a value, Podman checks the host environment for a value and set the variable only if it is set on the host. As a special case, if an environment variable ending in * is specified without a value, Podman searches the host environment for variables starting with the prefix and adds those variables to the container.
EnvironmentFile=file
Read in a line-delimited file of environment variables.
EnvironmentHost=
Use host environment inside of the container. See Environment note below for precedence. (This option is not available with the remote Podman client, including Mac and Windows (excluding WSL2) machines)
Exec=command
Additional arguments for the container; this has exactly the same effect as passing
more arguments after a podman run <image> <arguments> invocation.
The format is the same as for systemd command lines,
However, unlike the similarly named systemd ExecStart= directive
which operates on the ambient root filesystem, it is very common for container
images to have their own ENTRYPOINT or CMD metadata which this interacts with.
The default expectation for many images is that the image will include an ENTRYPOINT
with a default binary, and this field will add arguments to that entrypoint.
Another way to describe this is that it works the same way as the args field in a Kubernetes pod.
ExposeHostPort=port[/protocol]
Expose a port or a range of ports (e.g. Expose=3300-3310).
The protocol can be tcp, udp or sctp and if not given tcp is assumed.
This option matches the EXPOSE instruction for image builds and has no effect on
the actual networking rules unless -P/--publish-all is used to forward to all
exposed ports from random host ports. To forward specific ports from the host
into the container use the PublishPort= option instead.
GIDMap=[flags]container_gid:from_gid[:amount]
Run the container in a new user namespace using the supplied GID mapping. This
option conflicts with the UserNS= and
SubGIDMap= options. This
option provides a way to map host GIDs to container GIDs in the same way as
--uidmap maps host UIDs to container UIDs. For details see --uidmap.
Note: the GIDMap= option cannot be
called in conjunction with the Pod= option as
a gidmap cannot be set on the container level when in a pod.
GlobalArgs=
This key contains a list of arguments passed directly after the podman command in the generated
file. It can be used to access Podman features otherwise unsupported by the generator. Since the
generator is unaware of what unexpected interactions can be caused by these arguments, it is not
recommended to use this option.
The format of this is a space separated list of arguments, which can optionally be individually
escaped to allow inclusion of whitespace and other control characters.
This key can be listed multiple times.
Group=gid
The (numeric) GID to run as inside the container. This does not need to match the GID on the host,
which can be modified with UserNS, but if that is not specified, this GID is also used on the host.
GroupAdd=group | keep-groups
Assign additional groups to the primary user running within the container process.
keep-groups is a special flag that tells Podman to keep the supplementary group access.
Allows container to use the user’s supplementary group access. If file systems or
devices are only accessible by the rootless user’s group, this flag tells the OCI
runtime to pass the group access into the container. Currently only available
with the crun OCI runtime. Note: keep-groups is exclusive, other groups cannot be specified
with this flag. (Not available for remote commands, including Mac and Windows (excluding WSL2) machines)
Note: keep-groups passes the supplementary groups that the calling process
already has into the container, it does not look the user’s groups up at
container start. When Podman is started from a systemd user service, for example
a rootless Quadlet, the calling process is the systemd --user manager, which
only holds the groups the user had when that manager was started. Groups the user
is added to afterwards, for example with usermod, are therefore not passed into
the container. Restart the user’s systemd manager to pick them up, for example
with loginctl terminate-user <user> followed by a new login, or by rebooting.
HealthCmd="command"
Set or alter a healthcheck command for a container. The command is a command to be executed inside the
container that determines the container health. The command is required for other healthcheck options
to be applied. A value of none disables existing healthchecks.
Multiple options can be passed in the form of a JSON array; otherwise, the command is interpreted
as an argument to /bin/sh -c.
Note: The default values are used even if healthcheck is configured in the image.
HealthInterval=interval
Set an interval for the healthchecks. An interval of disable results in no automatic timer setup. The default is 30s.
Note: This parameter will overwrite related healthcheck configuration from the image.
HealthLogDestination=directory_path
Set the destination of the HealthCheck log. Directory path, local or events_logger (local use container state file) (Default: local)
local: (default) HealthCheck logs are stored in overlay containers. (For example: $runroot/healthcheck.log)
directory: creates a log file named <container-ID>-healthcheck.log with HealthCheck logs in the specified directory.
events_logger: The log will be written with logging mechanism set by events_logger. It also saves the log to a default directory, for performance on a system with a large number of logs.
HealthMaxLogCount=number
Set maximum number of attempts in the HealthCheck log file. (‘0’ value means an infinite number of attempts in the log file) (Default: 5 attempts)
HealthMaxLogSize=size
Set maximum length in characters of stored HealthCheck log. (“0” value means an infinite log length) (Default: 500 characters)
HealthOnFailure=action
Action to take once the container transitions to an unhealthy state. The default is none.
none: Take no action.
kill: Kill the container.
restart: Restart the container. Do not combine the restart action with the --restart flag. When running inside of a systemd unit, consider using the kill or stop action instead to make use of systemd’s restart policy.
stop: Stop the container.
HealthRetries=retries
The number of retries allowed before a healthcheck is considered to be unhealthy. The default value is 3.
Note: This parameter can overwrite the healthcheck configuration from the image.
HealthStartPeriod=period
The initialization time needed for a container to bootstrap. The value can be expressed in time format like
2m3s. The default value is 0s.
Note: The health check command is executed as soon as a container is started, if the health check is successful
the container’s health state will be updated to healthy. However, if the health check fails, the health state will
stay as starting until either the health check is successful or until
the HealthStartPeriod= time is over. If the
health check command fails after the HealthStartPeriod=
time is over, the health state will be updated to unhealthy.
The health check command is executed periodically based on the value of
HealthInterval=.
Note: This parameter will overwrite related healthcheck configuration from the image.
HealthStartupCmd="command"
Set a startup healthcheck command for a container. This command is executed inside the container and is used to gate the regular
healthcheck. When the startup command succeeds, the regular healthcheck begins and the startup healthcheck ceases. Optionally,
if the command fails a set number of times, the container is restarted. A startup healthcheck can be used to ensure that
containers with an extended startup period are not marked as unhealthy until they are fully started. Startup healthchecks can only be
used when a regular healthcheck (from the container’s image or the
HealthCmd= option) is also set.
If HealthCmd= option was set, but HealthStartupCmd= one was missed, then value of HealthCmd= option is used for startup health check.
HealthStartupInterval=interval
Set an interval for the startup healthcheck. An interval of 0s results in no automatic timer setup. The default is 0s.
HealthStartupRetries=retries
The number of attempts allowed before the startup healthcheck restarts the container. If set to 0, the container is never restarted. The default is 0.
HealthStartupSuccess=retries
The number of successful runs required before the startup healthcheck succeeds and the regular healthcheck begins. A value
of 0 means that any success begins the regular healthcheck. The default is 0.
HealthStartupTimeout=timeout
The maximum time a startup healthcheck command has to complete before it is marked as failed. The value can be expressed in a time
format like 2m3s. The default value is 30s.
HealthTimeout=timeout
The maximum time allowed to complete the healthcheck before an interval is considered failed. Like start-period, the
value can be expressed in a time format such as 1m22s. The default value is 30s.
Note: A timeout marks the healthcheck as failed. If the healthcheck command itself runs longer than the specified timeout,
it will be sent a SIGKILL signal.
Note: This parameter will overwrite related healthcheck configuration from the image.
HostName=name
Set the container’s hostname inside the container.
This option can only be used with a private UTS namespace --uts=private
(default). If Pod= is given and the pod shares the same UTS namespace
(default), the pod’s hostname is used. The given hostname is also added to the
/etc/hosts file using the container’s primary IP address (also see the
AddHost= option).
When HostName= is unset and the container uses a private UTS namespace (default), Podman sets the hostname to the first 12 characters of the container ID. The container name assigned with ContainerName= is not used unless container_name_as_hostname=true is set in containers.conf.
Podman network DNS registers the container name, the short container ID (first 12 characters), and any explicitly set --hostname as DNS names. The default hostname matches the short ID alias. See podman-network(1).
HttpProxy=
By default proxy environment variables are passed into the container if set
for the Podman process. This can be disabled by setting the value to false.
The environment variables passed in include http_proxy,
https_proxy, ftp_proxy, no_proxy, and also the upper case versions of
those. This option is only needed when the host system must use a proxy but
the container does not use any proxy. Proxy environment variables specified
for the container in any other way overrides the values that have
been passed through from the host. (Other ways to specify the proxy for the
container include passing the values with the --env flag, or hard coding the
proxy environment at container build time.)
When used with the remote client it uses the proxy environment variables
that are set on the server process.
The default for this option is taken from the http_proxy setting in the
[containers] table of containers.conf(5). If unset, that value defaults to
true.
Image=name
The image to run in the container.
It is recommended to use a fully qualified image name rather than a short name, both for
performance and robustness reasons.
The format of the name is the same as when passed to podman pull. So, it supports using
:tag or digests to guarantee the specific image version.
Special Cases:
If the name of the image ends with .image, Quadlet will use the image pulled by the corresponding .image file, and the generated systemd service contains a dependency on the $name-image.service (or the service name set in the .image file). Note that the corresponding .image file must exist.
If the name of the image ends with .build, Quadlet will use the image built by the corresponding .build file, and the generated systemd service contains a dependency on the $name-build.service. Note: the corresponding .build file must exist.
ImageVolume=mode
Tells Podman how to handle the builtin image volumes. Default is anonymous.
anonymous: An anonymous named volume is created and mounted into the container.
tmpfs: The volume is mounted onto the container as a tmpfs, which allows the users to create
content that disappears when the container is stopped.
ignore: All volumes are just ignored and no action is taken.
In the past, a bind option was accepted as well. This is deprecated, and currently aliased to anonymous.
IP=IPv4
Specify a static IPv4 address for the container, for example 10.88.64.128.
This option can only be used if the container is joined to only a single network - i.e.,
Network=network-name is used at most once -
and if the container is not joining another container’s network namespace via
Network=container:id.
The address must be within the network’s IP address pool (default 10.88.0.0/16).
To specify multiple static IP addresses per container, set multiple networks using
the Network= option with a static IP address specified for each using the ip mode for that option.
IP6=IPv6
Specify a static IPv6 address for the container, for example fd46:db93:aa76:ac37::10.
This option can only be used if the container is joined to only a single network - i.e.,
Network=network-name is used at most once -
and if the container is not joining another container’s network namespace via
Network=container:id.
The address must be within the network’s IPv6 address pool.
To specify multiple static IPv6 addresses per container, set multiple networks using the
Network= option with a static IPv6 address
specified for each using the ip6 mode for that option.
Label=key=value [key=value ...]
Add metadata to a container.
LogDriver=driver
Logging driver for the container. Currently available options are k8s-file, journald, none, passthrough and passthrough-tty, with json-file aliased to k8s-file for scripting compatibility. (Default journald).
The podman info command below displays the default log-driver for the system.
$ podman info --format '{{ .Host.LogDriver }}'
journald
The passthrough driver passes down the standard streams (stdin, stdout, stderr) to the
container. It is not allowed with the remote Podman client, including Mac and Windows (excluding WSL2) machines, and on a tty, since it is
vulnerable to attacks via TIOCSTI.
The passthrough-tty driver is the same as passthrough except that it also allows it to be used on a TTY if the user really wants it.
LogOpt=name=value
Logging driver specific options.
Set custom logging configuration. The following names are supported:
path: specify a path to the log file
(e.g. LogOpt=path=/var/log/container/mycontainer.json);
max-size: specify a max size of the log file
(e.g. LogOpt=max-size=10mb);
max-file: specify the maximum number of rotated log files to keep when log
rotation is enabled (requires conmon >= 2.2.0)
(e.g. LogOpt=max-file=5).
Setting this option implicitly enables log rotation. If log rotation is enabled
without setting max-file, conmon keeps 1 backup file by default.
log-rotate: enable or disable log rotation for the container log file
(requires conmon >= 2.2.0). When enabled, the log file is rotated with a numbered
suffix instead of being truncated when it reaches the maximum size
(e.g. LogOpt=log-rotate=true).
tag: specify a custom log tag for the container
(e.g. LogOpt=tag=”{{.ImageName}}”.
It supports the same keys as podman inspect --format.
This option is currently supported only by the journald log driver.
label: specify a custom log label for the container
(e.g. --log-opt label=”CONTAINER_IMAGE={{.ImageName}}”.
It supports the same keys as podman inspect --format.
This option can be repeated multiple times.
This option is currently supported only by the journald log driver.
Mask=/path/1:/path/2
Specify the paths to mask separated by a colon. Mask=/path/1:/path/2. A masked path cannot be accessed inside the container.
Memory=number[unit]
Memory limit. A unit can be b (bytes), k (kibibytes), m (mebibytes), or g (gibibytes).
Allows the memory available to a container to be constrained. If the host
supports swap memory, then the Memory= memory setting can be larger than physical
RAM. If a limit of 0 is specified (not using Memory=), the container’s memory is
not limited. The actual limit may be rounded up to a multiple of the operating
system’s page size (the value is very large, that’s millions of trillions).
This option is not supported on cgroups V1 rootless systems.
Mount=type=TYPE,TYPE-SPECIFIC-OPTION[,...]
Attach a filesystem mount to the container.
Special cases:
For type=volume, if source ends with .volume, the Podman named volume generated by the corresponding .volume file is used.
For type=image, if source ends with .image, the image generated by the corresponding .image file is used.
In both cases, the generated systemd service will contain a dependency on the service generated for the corresponding unit. Note: the corresponding .volume or .image file must exist.
Current supported mount TYPEs are artifact, bind, devpts, glob, image, ramfs, tmpfs and volume.
Options common to all mount types:
src, source: mount source spec for bind, glob, and volume.
Mandatory for artifact, bind, glob, and image.
Optional for volume; if omitted, an anonymous volume is created.
dst, dest, destination, target: mount destination spec.
When source globs are specified without the destination directory,
the files and directories are mounted with their complete path
within the container. When the destination is specified, the
files and directories matching the glob on the base file name
on the destination directory are mounted. The option
type=glob,src=/foo*,destination=/tmp/bar tells container engines
to mount host files matching /foo* to the /tmp/bar/
directory in the container.
Options specific to type=artifact:
digest: If the artifact source contains multiple blobs a digest can be
specified to only mount the one specific blob with the digest.
title: If the artifact source contains multiple blobs a title can be set
which is compared against org.opencontainers.image.title annotation.
name: This can be used to overwrite the filename we use inside the container
for mounting. On a single blob artifact the name is used as is if dst is a
directory and otherwise ignored. With a multi blob artifact the name will be
used with an index suffix <name>-x where x is the layer index in the artifact
starting with 0.
The src argument contains the name of the artifact, which must already exist locally.
The dst argument contains the target path, if the path in the container is a
directory the blob title (org.opencontainers.image.title annotation) will be used as
filename and joined to the path. If the annotation does not exist the digest will be
used as filename instead. This results in all blobs of the artifact mounted into the
container at the given path.
However, if the dst path is an existing file in the container, then the blob will be
mounted directly on it. This only works when the artifact contains a single blob
or when either digest or title are specified.
If the dst path does not already exist in the container then if the artifact contains
a single blob it behaves like existing file case and mounts directly to that path.
If the artifact has more than one blob it works like the existing directory case and
mounts each blob as file within the dst path.
Options specific to type=volume:
ro, readonly: true or false (default if unspecified: false).
U, chown: true or false (default if unspecified: false). Recursively change the owner and group of the source volume based on the UID and GID of the container.
subpath: Mount only a specific subpath within the volume, instead of the whole volume.
relabel: shared, private. Recursively walk the mount and set the security system (e.g. SELinux) label on each file to grant access permissions from the container context.
shared applies a label that grants permissions to all containers, while private applies a label that grants permissions to this specific container.
z, Z: shorthand for relabel=shared and relabel=private, respectively.
idmap: If specified, create an idmapped mount to the target user namespace in the container.
The idmap option is only supported by Podman in rootful mode. The Linux kernel does not allow the use of idmapped file systems for unprivileged users.
The idmap option supports a custom mapping that can be different from the user namespace used by the container.
The mapping can be specified after the idmap option like: idmap=uids=0-1-10#10-11-10;gids=0-100-10. For each triplet, the first value is the
start of the backing file system IDs that are mapped to the second value on the host. The length of this mapping is given in the third value.
Multiple ranges are separated with #. If the specified mapping is prepended with a ‘@’, then the mapping is considered relative to the container
user namespace. The host ID for the mapping is changed to account for the relative position of the container user in the container user namespace.
Options specific to type=image:
rw, readwrite: true or false (default if unspecified: false).
subpath: Mount only a specific path within the image, instead of the whole image.
Options specific to bind and glob:
ro, readonly: true or false (default if unspecified: false).
bind-propagation: shared, slave, private, unbindable, rshared, rslave, runbindable, or rprivate (default).[1] See also mount(2).
bind-nonrecursive: do not set up a recursive bind mount. By default it is recursive.
relabel: shared, private. Recursively walk the mount and set the security system (e.g. SELinux) label on each file to grant access permissions from the container context.
shared applies a label that grants permissions to all containers, while private applies a label that grants permissions to this specific container.
z, Z: shorthand for relabel=shared and relabel=private, respectively.
idmap: If specified, create an idmapped mount to the target user namespace in the container.
The idmap option is only supported by Podman in rootful mode. The Linux kernel does not allow the use of idmapped file systems for unprivileged users.
The idmap option supports a custom mapping that can be different from the user namespace used by the container.
The mapping can be specified after the idmap option like: idmap=uids=0-1-10#10-11-10;gids=0-100-10. For each triplet, the first value is the
start of the backing file system IDs that are mapped to the second value on the host. The length of this mapping is given in the third value.
Multiple ranges are separated with #. If the specified mapping is prepended with a ‘@’, then the mapping is considered relative to the container
user namespace. The host ID for the mapping is changed to account for the relative position of the container user in the container user namespace.
U, chown: true or false (default if unspecified: false). Recursively change the owner and group of the source volume based on the UID and GID of the container.
no-dereference: do not dereference symlinks but copy the link source into the mount destination.
Options specific to type=tmpfs and ramfs:
ro, readonly: true or false (default if unspecified: false).
tmpfs-size: Size of the tmpfs/ramfs mount, in bytes. Unlimited by default in Linux.
tmpfs-mode: Octal file mode of the tmpfs/ramfs (e.g. 700 or 0700.).
tmpcopyup: Enable copyup from the image directory at the same location to the tmpfs/ramfs. Used by default.
When the tmpfs destination is inside a volume or bind mount, files from the parent mount are also copied into the tmpfs, so the parent content remains visible. Use notmpcopyup to mount an empty tmpfs that shadows the parent mount’s subtree.
noatime: Disable updating file access times when the file is read.
notmpcopyup: Disable copying files from the image to the tmpfs/ramfs.
Use this option when mounting a tmpfs inside a volume or bind mount to ensure the tmpfs properly shadows the parent mount’s subtree.
U, chown: true or false (default if unspecified: false). Set the uid and gid options for the tmpfs filesystem based on the UID and GID of the container. This is not recursive.
Options specific to type=devpts:
uid: numeric UID of the file owner (default: 0).
gid: numeric GID of the file owner (default: 0).
mode: octal permission mask for the file (default: 600).
max: maximum number of PTYs (default: 1048576).
Examples:
type=bind,source=/path/on/host,destination=/path/in/container
type=bind,src=/path/on/host,dst=/path/in/container,relabel=shared
type=bind,src=/path/on/host,dst=/path/in/container,relabel=shared,U=true
type=bind,src=/path/on/host,dst=/path/in/container,idmap
type=bind,src=/path/on/host,dst=/path/in/container,idmap=uids=0-1-10;gids=0-100-10
type=devpts,destination=/dev/pts
type=glob,src=/usr/lib/libfoo*,destination=/usr/lib,ro=true
type=image,source=fedora,destination=/fedora-image,rw=true
type=ramfs,tmpfs-size=512M,destination=/path/in/container
type=tmpfs,tmpfs-size=512M,destination=/path/in/container
type=tmpfs,destination=/path/in/container,noswap
type=artifact,src=quay.io/libpod/testartifact:20250206-single,dst=/data
type=artifact,src=quay.io/libpod/testartifact:20250206-multi,dst=/data,title=test1
type=volume,destination=/path/in/container
type=volume,src=test_vol,dst=/data,subpath=/code/docs
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
NetworkAlias=alias
Add a network-scoped alias for the container, setting the alias for all networks that the container joins. To set a
name only for a specific network, use the alias option as described under the --network option.
If the network has DNS enabled (podman network inspect -f {{.DNSEnabled}} <name>),
these aliases can be used for name resolution on the given network. This option can be specified multiple times.
NoNewPrivileges=bool (defaults to false)
If enabled, this disables the container processes from gaining additional privileges via things like
setuid and file capabilities.
Notify=bool (defaults to false)
By default, Podman is run in such a way that the systemd startup notify command is handled by
the container runtime. In other words, the service is deemed started when the container runtime
starts the child in the container. However, if the container application supports
sd_notify, then setting
Notify to true passes the notification details to the container allowing it to notify
of startup on its own.
In addition, setting Notify to healthy will postpone startup notifications until such time as
the container is marked healthy, as determined by Podman healthchecks. Note that this requires
setting up a container healthcheck, see the HealthCmd option for more.
PidsLimit=limit
Tune the container’s pids limit. Set to -1 to have unlimited pids for the container. The default is 2048 on systems that support “pids” cgroup controller.
Pod=name
Specify a Quadlet .pod unit to link the container to.
The value must take the form of <name>.pod and the .pod unit must exist.
In this value, Quadlet expands the %N specifier to the container’s service name (the
ServiceName= value if set, otherwise the name derived from the unit file), for example
Pod=%N.pod. The expansion happens while the unit is generated, and %N is the only
specifier resolved in this key.
Quadlet will add all the necessary parameters to link between the container and the pod and between their corresponding services.
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
Pull=policy
Pull image policy. The default is missing.
always: Always pull the image and throw an error if the pull fails.
missing: Pull the image only when the image is not in the local containers storage. Throw an error if no image is found and the pull fails.
never: Never pull the image but use the one from the local containers storage. Throw an error if no image is found.
newer: Pull if the image on the registry is newer than the one in the local containers storage. An image is considered to be newer when the digests are different. Comparing the time stamps is prone to errors. Pull errors are suppressed if a local image was found.
ReadOnly=
Mount the container’s root filesystem as read-only.
By default, container root filesystems are writable, allowing processes
to write files anywhere. By specifying the ReadOnly= flag,
the container’s root filesystem is mounted read-only prohibiting any writes.
ReadOnlyTmpfs=true|false
When running --read-only containers, mount a read-write tmpfs on /dev, /dev/shm, /run, /tmp, and /var/tmp. The default is true.
--read-only
--read-only-tmpfs
/
/run, /tmp, /var/tmp
true
true
r/o
r/w
true
false
r/o
r/o
false
false
r/w
r/w
false
true
r/w
r/w
When ReadOnly=true and
ReadOnlyTmpfs=true additional tmpfs are mounted on
the /tmp, /run, and /var/tmp directories.
When ReadOnly=true and
ReadOnlyTmpfs=false /dev and /dev/shm are marked
Read/Only and no tmpfs are mounted on /tmp, /run and /var/tmp. The directories
are exposed from the underlying image, meaning they are read-only by default.
This makes the container totally read-only. No writable directories exist within
the container. In this mode writable directories need to be added via external
volumes or mounts.
By default, when ReadOnly=false , the /dev and /dev/shm are read/write, and the /tmp, /run, and /var/tmp are read/write directories from the container image.
ReloadCmd=/usr/bin/command
Add an ExecReload= line to the Service section that runs podman exec with this command in this container.
To reload the service, run systemctl reload <Service>.
Mutually exclusive with ReloadSignal.
ReloadSignal=signal
Add an ExecReload= line to the Service section that runs podman kill with this signal, which sends the signal to the main container process.
To reload the service, run systemctl reload <Service>.
Mutually exclusive with ReloadCmd.
Retry=attempts
Number of times to retry pulling or pushing images between the registry and
local storage in case of failure. Default is 3.
RetryDelay=duration
Duration of delay between retry attempts when pulling or pushing images between
the registry and local storage in case of failure. The default is to start at two seconds and then exponentially back off. The delay is used when this value is set, and no exponential back off occurs.
Rootfs=
If specified, the first argument refers to an exploded container on the file system.
This option conflicts with the Image option.
This is useful to run a container without requiring any image management, the rootfs
of the container is assumed to be managed externally.
Overlay Rootfs Mounts
The :O flag tells Podman to mount the directory from the rootfs path as
storage using the overlay file system. The container processes
can modify content within the mount point which is stored in the
container storage in a separate directory. In overlay terms, the source
directory is the lower, and the container storage directory is the
upper. Modifications to the mount point are destroyed when the container
finishes executing, similar to a tmpfs mount point being unmounted.
Note: On SELinux systems, the rootfs needs the correct label, which is by default
unconfined_u:object_r:container_file_t:s0.
idmap
If idmap is specified, create an idmapped mount to the target user
namespace in the container.
The idmap option supports a custom mapping that can be different than the user
namespace used by the container. The mapping can be specified after the idmap
option like: idmap=uids=0-1-10#10-11-10;gids=0-100-10. For each triplet, the
first value is the start of the backing file system IDs that are mapped to the
second value on the host. The length of this mapping is given in the third value.
Multiple ranges are separated with #.
RunInit=
Run an init inside the container that forwards signals and reaps processes.
The container-init binary is mounted at /run/podman-init.
Mounting over /run breaks container execution.
The default is the init setting in the [containers] section of
containers.conf, which defaults to false.
Set RunInit=true or RunInit=false to override this default.
SeccompProfile=path
Set the seccomp profile to use in the container. If unset, the default Podman profile is used.
Set to either the pathname of a JSON file, or unconfined to disable the seccomp filters.
Secret=secret[,opt=opt ...]
Give the container access to a secret. Can be specified multiple times.
A secret is a blob of sensitive data which a container needs at runtime but
is not stored in the image or in source control, such as usernames and passwords,
TLS certificates and keys, SSH keys or other important generic strings or binary content (up to 512 kB in size).
When secrets are specified as type mount, the secrets are copied and mounted into the container when a container is created.
When secrets are specified as type env, the secret is set as an environment variable within the container.
Secrets are written in the container at the time of container creation, and modifying the secret using podman secret commands
after the container is created affects the secret inside the container.
Secrets and its storage are managed using the podman secret command.
Secret Options
type=mount|env : How the secret is exposed to the container.
mount mounts the secret into the container as a file.
env exposes the secret as an environment variable.
Defaults to mount.
target=target : Target of secret.
For mounted secrets, this is the path to the secret inside the container.
If a fully qualified path is provided, the secret is mounted at that location.
Otherwise, the secret is mounted to
/run/secrets/target for Linux containers or
/var/run/secrets/target for FreeBSD containers.
If the target is not set, the secret is mounted to /run/secrets/secretname by default.
For env secrets, this is the environment variable key. Defaults to secretname.
uid=0 : UID of secret. Defaults to 0. Mount secret type only.
gid=0 : GID of secret. Defaults to 0. Mount secret type only.
mode=0 : Mode of secret. Defaults to 0444. Mount secret type only.
Examples
Mount at /my/location/mysecret with UID 1:
--secret mysecret,target=/my/location/mysecret,uid=1
Mount at /run/secrets/customtarget with mode 0777:
--secret mysecret,target=customtarget,mode=0777
Create a secret environment variable called ENVSEC:
--secret mysecret,type=env,target=ENVSEC
SecurityLabelDisable=bool
Turn off label separation for the container.
SecurityLabelFileType=label
Set the label file type for the container files.
SecurityLabelLevel=s0:c1,c2
Set the label process level for the container processes.
SecurityLabelNested=bool
Allow SecurityLabels to function within the container. This allows separation of containers created within the container.
SecurityLabelType=type
Set the label process type for the container processes.
ShmSize=number[unit]
Size of /dev/shm. A unit can be b (bytes), k (kibibytes), m (mebibytes), or g (gibibytes).
If the unit is omitted, the system uses bytes. If the size is omitted, the default is 64m.
When size is 0, there is no limit on the amount of memory used for IPC by the container.
This option conflicts with --ipc=host.
StartWithPod=bool
Start the container after the associated pod is created. Defaults to true.
If true, the container will be started/stopped/restarted alongside the pod.
If false, the container will not be started when the pod starts. The container will be stopped with the pod. Restarting the pod will also restart the container as long as the container was also running before.
Note, the container can still be started manually or through a target by configuring the [Install] section. The pod will be started as needed in any case.
StopSignal=signal
Signal to stop a container. Default is SIGTERM.
StopTimeout=seconds
Timeout to stop a container. Default is 10.
Remote connections use local containers.conf for defaults.
Note: this value should be lower than the actual systemd unit timeout to ensure the podman rm command is not killed by systemd.
SubGIDMap=name
Run the container in a new user namespace using the map with name in the /etc/subgid file.
When running rootless, the user needs the necessary permissions to use the mapping. See subgid(5).
This flag conflicts with UserNS= and GIDMap=.
Together with GIDMap= it acts as if GIDMap= was passed with all mappings of the name group in /etc/subgid.
SubUIDMap=name
Run the container in a new user namespace using the map with name in the /etc/subuid file.
When running rootless, the user needs the necessary permissions to use the mapping. See subuid(5).
This flag conflicts with UserNS= and UIDMap=.
Together with UIDMap= it acts as if UIDMap= was passed with all mappings of the name user in /etc/subuid.
Sysctl=name=value
Configure namespaced kernel parameters at runtime.
For the IPC namespace, the following sysctls are allowed:
kernel.msgmax
kernel.msgmnb
kernel.msgmni
kernel.sem
kernel.shmall
kernel.shmmax
kernel.shmmni
kernel.shm_rmid_forced
Sysctls beginning with fs.mqueue.*
Note: if using the --ipc=host option, the above sysctls are not allowed.
For the network namespace, only sysctls beginning with net.* are allowed.
Note: if using the --network=host option, the above sysctls are not allowed.
Timezone=timezone
Set timezone in container. This flag takes area-based timezones, GMT time, as well as local, which sets the timezone in the container to match the host machine. See /usr/share/zoneinfo/ for valid timezones.
Remote connections use local containers.conf for defaults
Tmpfs=
Create a tmpfs mount.
Mount a temporary filesystem (tmpfs) mount into a container, for example:
$ podman podman-container.unit.5.md.in -d --tmpfs /tmp:rw,size=787448k,mode=1777 my_image
This command mounts a tmpfs at /tmp within the container. The supported mount
options are the same as the Linux default mount flags. If no options are specified,
the system uses the following options:
rw,noexec,nosuid,nodev.
By default, Podman enables tmpcopyup on tmpfs mounts, which copies the contents
of the underlying image directory into the tmpfs before mounting it. This also
applies when the tmpfs destination is inside a volume or bind mount: files from
the parent mount are copied into the tmpfs, so the parent content remains visible.
To mount an empty tmpfs that shadows a parent mount’s subtree, use the
notmpcopyup option:
$ podman podman-container.unit.5.md.in --volume myvolume:/data --tmpfs /data/sub:notmpcopyup my_image
UIDMap=[flags]container_uid:from_uid[:amount]
Run the container in a new user namespace using the supplied UID mapping. This
option conflicts with the UserNS= and SubUIDMap= options. This
option provides a way to map host UIDs to container UIDs. It can be passed
several times to map different ranges.
The possible values of the optional flags are discussed further down on this page.
The amount value is optional and assumed to be 1 if not given.
The from_uid value is based upon the user running the command, either rootful or rootless users.
rootful user: [flags]container_uid:host_uid[:amount]
rootless user: [flags]container_uid:intermediate_uid[:amount]
Rootful mappings
When podman podman-container.unit.5.md.in is called by a privileged user, the option UIDMap=
works as a direct mapping between host UIDs and container UIDs.
host UID -> container UID
The amount specifies the number of consecutive UIDs that is mapped.
If for example amount is 4 the mapping looks like:
host UID
container UID
from_uid
container_uid
from_uid + 1
container_uid + 1
from_uid + 2
container_uid + 2
from_uid + 3
container_uid + 3
Rootless mappings
When podman podman-container.unit.5.md.in is called by an unprivileged user (i.e. running rootless),
the value from_uid is interpreted as an “intermediate UID”. In the rootless
case, host UIDs are not mapped directly to container UIDs. Instead the mapping
happens over two mapping steps:
host UID -> intermediate UID -> container UID
The UIDMap= option only influences the second mapping step.
The first mapping step is derived by Podman from the contents of the file
/etc/subuid and the UID of the user calling Podman.
First mapping step:
host UID
intermediate UID
UID for Podman user
0
1st subordinate UID
1
2nd subordinate UID
2
3rd subordinate UID
3
nth subordinate UID
n
To be able to use intermediate UIDs greater than zero, the user needs to have
subordinate UIDs configured in /etc/subuid. See subuid(5).
The second mapping step is configured with UIDMap=.
If for example amount is 5 the second mapping step looks like:
intermediate UID
container UID
from_uid
container_uid
from_uid + 1
container_uid + 1
from_uid + 2
container_uid + 2
from_uid + 3
container_uid + 3
from_uid + 4
container_uid + 4
When running as rootless, Podman uses all the ranges configured in the /etc/subuid file.
The current user ID is mapped to UID=0 in the rootless user namespace.
Every additional range is added sequentially afterward:
host
rootless user namespace
length
$UID
0
1
1
$FIRST_RANGE_ID
$FIRST_RANGE_LENGTH
1+$FIRST_RANGE_LENGTH
$SECOND_RANGE_ID
$SECOND_RANGE_LENGTH
Referencing a host ID from the parent namespace
As a rootless user, the given host ID in UIDMap= or GIDMap=
is mapped from the intermediate namespace generated by Podman. Sometimes
it is desirable to refer directly to the host namespace. It is possible
to manually do so, by running podman unshare cat /proc/self/gid_map,
finding the desired host id at the second column of the output, and getting
the corresponding intermediate id from the first column.
Podman can perform all that by preceding the host id in the mapping
with the @ symbol. For instance, by specifying --gidmap 100000:@2000:1,
podman will look up the intermediate id corresponding to host id 2000 and
it will map the found intermediate id to the container id 100000. The
given host id must have been subordinated (otherwise it would not be mapped
into the intermediate space in the first place).
If the length is greater than one, for instance with --gidmap 100000:@2000:2,
Podman will map host ids 2000 and 2001 to 100000 and 100001, respectively,
regardless of how the intermediate mapping is defined.
Extending previous mappings
Some mapping modifications may be cumbersome. For instance, a user
starts with a mapping such as --gidmap="0:0:65000", that needs to be
changed such as the parent id 1 is mapped to container id 100000
instead, leaving container id 1 unassigned. The corresponding --gidmap
becomes --gidmap="0:0:1" --gidmap="2:2:65534" --gidmap="100000:1:1".
This notation can be simplified using the + flag, that takes care of
breaking previous mappings removing any conflicting assignment with
the given mapping. The flag is given before the container id
as follows: --gidmap="0:0:65000" --gidmap="+100000:1:1"
Flag
Example
Description
+
+100000:1:1
Extend the previous mapping
This notation leads to gaps in the assignment, so it may be convenient to
fill those gaps afterwards: --gidmap="0:0:65000" --gidmap="+100000:1:1" --gidmap="1:65001:1"
One specific use case for this flag is in the context of rootless
users. A rootless user may specify mappings with the + flag as
in --gidmap="+100000:1:1". Podman will then “fill the gaps” starting
from zero with all the remaining intermediate ids. This is convenient when
a user wants to map a specific intermediate id to a container id, leaving
the rest of subordinate ids to be mapped by Podman at will.
Passing only one of --uidmap or --gidmap
Usually, subordinated user and group ids are assigned simultaneously, and
for any user the subordinated user ids match the subordinated group ids.
For convenience, if only one of UIDMap= or GIDMap= is given,
podman assumes the mapping refers to both UIDs and GIDs and applies the
given mapping to both. If only one value of the two needs to be changed,
the mappings should include the u or the g flags to specify that
they only apply to UIDs or GIDs and should not be copied over.
flag
Example
Description
u
u20000:2000:1
The mapping only applies to UIDs
g
g10000:1000:1
The mapping only applies to GIDs
For instance given the command
podman podman-container.unit.5.md.in --gidmap "0:0:1000" --gidmap "g2000:2000:1"
Since no UIDMap= is given, the GIDMap= is copied to UIDMap=,
giving a command equivalent to
podman podman-container.unit.5.md.in --gidmap "0:0:1000" --gidmap "2000:2000:1" --uidmap "0:0:1000"
The --gidmap "g2000:2000:1" used the g flag and therefore it was
not copied to UIDMap=.
Rootless mapping of additional host GIDs
A rootless user may desire to map a specific host group that has already been
subordinated within /etc/subgid without specifying the rest of the mapping.
This can be done with GIDMap=”+gcontainer_gid:@host_gid”
Where:
The host GID is given through the @ symbol
The mapping of this GID is not copied over to --usermap thanks to the g flag.
The rest of the container IDs will be mapped starting from 0 to n,
with all the remaining subordinated GIDs, thanks to the + flag.
For instance, if a user belongs to the group 2000 and that group is
subordinated to that user (with usermod --add-subgids 2000-2000 $USER),
the user can map the group into the container with: GIDMap=+g100000:@2000.
If this mapping is combined with the option, GroupAdd=keep-groups, the
process in the container will belong to group 100000, and files belonging
to group 2000 in the host will appear as being owned by group 100000
inside the container.
podman run --group-add=keep-groups --gidmap="+g100000:@2000" ...
No subordinate UIDs
Even if a user does not have any subordinate UIDs in /etc/subuid,
UIDMap= can be used to map the normal UID of the user to a
container UID by running podman podman-container.unit.5.md.in --uidmap $container_uid:0:1 --user $container_uid ....
Pods
The UIDMap= option cannot be called in conjunction with the Pod= option as a uidmap cannot be set on the container level when in a pod.
Ulimit=option
Ulimit options. Sets the ulimits values inside of the container.
--ulimit with a soft and hard limit in the format =[:]. For example:
$ podman run --ulimit nofile=1024:1024 --rm ubi9 ulimit -n
1024
Here is the list of the different resources and the limits’ units:
Type
Unit of the value given to --ulimit
core, fsize
bytes
data, memlock, rss, stack
bytes
msgqueue
bytes
rttime
microseconds
cpu
seconds
locks, nice, nofile, nproc, rtprio, sigpending
count
For example, a locked memory limit given in bytes is reported in kbytes:
$ podman run --ulimit memlock=4096 --rm ubi9 ulimit -l
4
Unit suffixes such as k or m are not accepted.
Set -1 for the soft or hard limit to set the limit to the maximum limit of the current
process. In rootful mode this is often unlimited.
If nofile is unset, a default value of 1048576 will be used, unless overridden
in containers.conf(5). However, if the default value exceeds the hard limit for the current
rootless user, the current hard limit will be applied instead.
Use host to copy the current configuration from the host.
Don’t use nproc with the ulimit flag as Linux uses nproc to set the
maximum number of processes available to a user, not to a container.
Use the --pids-limit option to modify the cgroup control to limit the number
of processes within a container.
Unmask=
Specify the paths to unmask separated by a colon. unmask=ALL or /path/1:/path/2, or shell expanded paths (/proc/*):
If set to ALL, Podman will unmask all the paths that are masked or made read-only by default.
The default masked paths are /proc/acpi, /proc/kcore, /proc/keys, /proc/latency_stats, /proc/sched_debug, /proc/scsi, /proc/timer_list, /proc/timer_stats, /sys/firmware, and /sys/fs/selinux.
The default paths that are read-only are /proc/asound, /proc/bus, /proc/fs, /proc/irq, /proc/sys, /proc/sysrq-trigger, /sys/fs/cgroup.
User=user[:group]
Sets the username or UID used and, optionally, the groupname or GID for the specified command. Both user and group may be symbolic or numeric.
Without this argument, the command runs as the user specified in the container image. Unless overridden by a USER command in the Containerfile or by a value passed to this option, this user generally defaults to root.
When a user namespace is not in use, the UID and GID used within the container and on the host match. When user namespaces are in use, however, the UID and GID in the container may correspond to another UID and GID on the host. In rootless containers, for example, a user namespace is always used, and root in the container by default corresponds to the UID and GID of the user invoking Podman.
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
Volume=[[SOURCE-VOLUME|HOST-DIR:]CONTAINER-DIR[:OPTIONS]]
Create a bind mount. If -v /HOST-DIR:/CONTAINER-DIR is specified, Podman
bind mounts /HOST-DIR from the host into /CONTAINER-DIR in the Podman
container. Similarly, -v SOURCE-VOLUME:/CONTAINER-DIR mounts the named
volume from the host into the container. If no such named volume exists,
Podman creates one. The nocreate option can be used to disable this
behavior and require the volume to already exist. If no source is given,
the volume is created as an anonymously named volume with a randomly
generated name, and is removed when the container is removed via
the --rm flag or the podman rm --volumes command.
Special case:
If SOURCE-VOLUME ends with .volume, a Podman named volume called systemd-$name is used as the source, and the generated systemd service contains a dependency on the $name-volume.service. Note that the corresponding .volume file must exist.
(Note when using the remote client, including Mac and Windows (excluding WSL2) machines, the volumes are mounted from the remote server, not necessarily the client machine.)
The OPTIONS is a comma-separated list and can be one or more of:
rw|ro
z|Z
[O]
[U]
[no]copy
[no]dev
[no]exec
[no]suid
[r]bind
[r]shared|[r]slave|[r]private[r]unbindable [1]
idmap[=options]
nocreate
The CONTAINER-DIR must be an absolute path such as /src/docs. The volume
is mounted into the container at this directory.
If a volume source is specified, it must be a path on the host or the name of a
named volume. Host paths are allowed to be absolute or relative; relative paths
are resolved relative to the directory Podman is run in. If the source does not
exist, Podman returns an error. Users must pre-create the source files or
directories.
Any source that does not begin with a . or / is treated as the name of
a named volume. If a volume with that name does not exist, it is created.
Volumes created with names are not anonymous, and they are not removed by the --rm
option and the podman rm --volumes command.
The nocreate option can be specified for named volumes to prevent automatic
volume creation. If nocreate is set and the volume does not exist, Podman
returns an error instead of creating the volume. This is useful when you want
to ensure that a volume was explicitly created before use.
$ podman podman-container.unit.5.md.in -v myvolume:/data:nocreate alpine
Specify multiple -v options to mount one or more volumes into a
container.
Write Protected Volume Mounts
Add :ro or :rw option to mount a volume in read-only or
read-write mode, respectively. By default, the volumes are mounted read-write.
See examples.
Chowning Volume Mounts
When a named volume is first mounted to a container, Podman
automatically adjusts the ownership of the volume’s mount point during
container initialization. This chown operation occurs under the
following conditions:
The volume was not used yet (has NeedsChown set to true)
The volume is empty or has not been copied up yet
The volume is not managed by an external volume driver
The volume driver is not “image”
For volumes with idmapped mounts (using the idmap option), the
ownership change takes into account the container’s user namespace
mappings, but the idmapped volume retains proper UID/GID mapping. For
volumes without idmapping, the mount point is chowned to match the
container’s process user and group, mapped to the host user namespace
if user namespace remapping is enabled.
If a container is created in a new user namespace, the UID and
GID in the container may correspond to another UID and GID on the host.
The :U suffix tells Podman to use the correct host UID and GID based on the
UID and GID within the container, to change recursively the owner and
group of the source volume. Chowning walks the file system under the volume and
changes the UID/GID on each file. If the volume has thousands of inodes, this
process takes a long time, delaying the start of the container.
Warning use with caution since this modifies the host filesystem.
Labeling Volume Mounts
Labeling systems like SELinux require that proper labels are placed on volume
content mounted into a container. Without a label, the security system
might prevent the processes running inside the container from using the
content. By default, Podman does not change the labels set by the OS.
To change a label in the container context, add either of two suffixes
:z or :Z to the volume mount. These suffixes tell Podman to relabel file
objects on the shared volumes. The z option tells Podman that two or more
containers share the volume content. As a result, Podman labels the
content with a shared content label. Shared volume labels allow all containers
to read/write content. The Z option tells Podman to label the content with
a private unshared label. Only the current container can use a private
volume.
Note: all containers within a pod share the same SELinux label. This
means all containers within said pod can read/write volumes shared into the
container created with the :Z on any one of the containers. Relabeling walks
the file system under the volume and changes the label on each file; if the
volume has thousands of inodes, this process takes a long time, delaying the
start of the container. If the volume was previously relabeled with the
z option, Podman is optimized to not relabel a second time. If files are
moved into the volume, then the labels can be manually changed with the
chcon -Rt container_file_t PATH command.
Note: Do not relabel system files and directories. Relabeling system content
might cause other confined services on the machine to fail. For these types
of containers we recommend disabling SELinux separation. The option
--security-opt label=disable disables SELinux separation for the container.
For example if a user wanted to volume mount their entire home directory into a
container, they need to disable SELinux separation.
$ podman podman-container.unit.5.md.in --security-opt label=disable -v $HOME:/home/user fedora touch /home/user/file
Overlay Volume Mounts
The :O flag tells Podman to mount the directory from the host as a
temporary storage using the overlay file system. The container processes
can modify content within the mountpoint which is stored in the
container storage in a separate directory. In overlay terms, the source
directory is the lower, and the container storage directory is the
upper. Modifications to the mount point are destroyed when the container
finishes executing, similar to a tmpfs mount point being unmounted.
For advanced users, the overlay option also supports custom non-volatile
upperdir and workdir for the overlay mount. Custom upperdir and
workdir can be fully managed by the users themselves, and Podman does not
remove it on lifecycle completion.
Example :O,upperdir=/some/upper,workdir=/some/work
Subsequent executions of the container sees the original source directory
content, any changes from previous container executions no longer exist.
One use case of the overlay mount is sharing the package cache from the
host into the container to allow speeding up builds.
Note: The O flag conflicts with other options listed above.
Content mounted into the container is labeled with the private label.
On SELinux systems, labels in the source directory must be readable
by the container label. Usually containers can read/execute container_share_t
and can read/write container_file_t. If unable to change the labels on a
source volume, SELinux container separation must be disabled for the container
to work.
Do not modify the source directory mounted into the container with an overlay mount,
it can cause unexpected failures. Only modify the directory after the container finishes running.
Mounts propagation
By default, bind-mounted volumes are private. That means any mounts done
inside the container are not visible on the host and vice versa.
One can change this behavior by specifying a volume mount propagation property.
When a volume is shared, mounts done under that volume inside the container
are visible on host and vice versa. Making a volume slave[1]
enables only one-way mount propagation: mounts done on the host under that volume
are visible inside the container but not the other way around.
To control mount propagation property of a volume one can use the [r]shared,
[r]slave, [r]private or the [r]unbindable propagation flag.
Propagation property can be specified only for bind mounted volumes and not for
internal volumes or named volumes. For mount propagation to work the source mount
point (the mount point where source dir is mounted on) has to have the right propagation
properties. For shared volumes, the source mount point has to be shared. And for
slave volumes, the source mount point has to be either shared or slave.
[1]
To recursively mount a volume and all of its submounts into a
container, use the rbind option. By default the bind option is
used, and submounts of the source directory is not mounted into the
container.
Mounting the volume with a copy option tells podman to copy content from
the underlying destination directory onto newly created internal volumes. The
copy only happens on the initial creation of the volume. Content is not
copied up when the volume is subsequently used on different containers. The
copy option is ignored on bind mounts and has no effect.
Mounting volumes with the nosuid options means that SUID executables on the
volume can not be used by applications to change their privilege. By default
volumes are mounted with nosuid.
Mounting the volume with the noexec option means that no executables on the
volume can be executed within the container.
Mounting the volume with the nodev option means that no devices on the volume
can be used by processes within the container. By default volumes
are mounted with nodev.
If the HOST-DIR is a mount point, then dev, suid, and exec options are
ignored by the kernel.
Use df HOST-DIR to figure out the source mount, then use
findmnt -o TARGET,PROPAGATION source-mount-dir to figure out propagation
properties of source mount. If findmnt(1) utility is not available, then one
can look at the mount entry for the source mount point in /proc/self/mountinfo. Look
at the “optional fields” and see if any propagation properties are specified.
In there, shared:N means the mount is shared, master:N means mount
is slave, and if nothing is there, the mount is private. [1]
To change propagation properties of a mount point, use mount(8) command. For
example, if one wants to bind mount source directory /foo, one can do
mount --bind /foo /foo and mount --make-private --make-shared /foo. This
converts /foo into a shared mount point. Alternatively, one can directly
change propagation properties of source mount. Say / is source mount for
/foo, then use mount --make-shared / to convert / into a shared mount.
Note: if the user only has access rights via a group, accessing the volume
from inside a rootless container fails.
Idmapped mount
If idmap is specified, create an idmapped mount to the target user
namespace in the container. The idmap option supports a custom mapping
that can be different than the user namespace used by the
container. The mapping can be specified after the idmap option like:
idmap=uids=0-1-10#10-11-10;gids=0-100-10.
For each triplet, the first value is the start of the backing file
system IDs that are mapped to the second value on the host. The
length of this mapping is given in the third value.
Multiple ranges are separated with #.
WorkingDir=dir
Working directory inside the container.
The default working directory for running binaries within a container is the root directory (/).
The image developer can set a different default with the WORKDIR instruction. The operator
can override the working directory by using the WorkingDir= option.
SERVICE TYPE
By default, the generator sets Type=notify for .container units.
This can be overridden by explicitly setting Type= in the [Service] section.
For one-shot containers (e.g., init tasks), use:
[Service]
Type=oneshot
RemainAfterExit=yes
Refer to systemd.service(5) for full details on service types and related behaviors.
INSTALL SECTION
To ensure a container starts on boot, include an [Install] section:
[Install]
WantedBy=multi-user.target
Only Alias=, WantedBy=, RequiredBy=, and UpheldBy= keys are supported.
TIMEOUTS
Container startup may exceed systemd’s default 90s timeout (e.g., when pulling images). Use:
[Service]
TimeoutStartSec=900
Note: TimeoutStartSec is ignored for Type=oneshot.
NETWORK DEPENDENCIES
Quadlet adds:
After=network-online.target (for root units)
After=podman-user-wait-network-online.service (for user units)
To disable this, add:
[Quadlet]
DefaultDependencies=false
RESOURCE NAMING
By default, the container is named systemd-<unitname>. Use ContainerName= to override.
Avoid using systemd specifiers like %N in resource names—they break inter-resource linking.
The exception is %N in Pod=, which Quadlet expands while generating the unit.
TEMPLATE UNITS
Quadlet supports templated container units, e.g., foo@.container creates foo@.service.
You can instantiate with:
systemctl start foo@bar.service
You may also symlink instances:
ln -s foo@.container foo@bar.container
Use drop-ins for instance-specific customization:
foo@bar.container.d/10-override.conf
DROP-IN FILES
Quadlet supports drop-in configuration in .container.d/ directories.
For example, a drop-in:
test.container.d/10-extra.conf
can override or extend the main unit file.
Drop-ins follow the same override and merging behavior as systemd units.
EXAMPLE
Minimal container unit:
[Unit]
Description=A minimal container
[Container]
Image=quay.io/centos/centos:latest
Exec=sleep 60
[Install]
WantedBy=multi-user.target
SEE ALSO
podman-run(1),
podman-systemd.unit(5),
systemd.service(5),
systemd.unit(5)
