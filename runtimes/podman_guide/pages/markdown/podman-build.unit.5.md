NAME
podman-build.unit - systemd unit files for building container images using Podman Quadlet
SYNOPSIS
name.build
DESCRIPTION
Build files are named with a .build extension and contain a section [Build] describing the image
build command. The generated service is a one-shot service that ensures that the image is built on
the host from a supplied Containerfile and context directory. Subsequent (re-)starts of the
generated build service will usually finish quickly, as image layer caching will skip unchanged
build steps.
A minimal .build unit needs at least ImageTag= and either File= or SetWorkingDirectory=.
Using build units allows containers and volumes to depend on images being built locally. This can be
interesting for creating container images not available on container registries, or for local
testing and development.
USAGE SUMMARY
The .build file is parsed by the podman-system-generator at boot or reload, generating a systemd
.service that runs podman build. That service can be managed like any other unit:
systemctl --user start myimage-build.service
The resulting image can be referenced by .container or .volume units via:
Image=myimage.build
OPTIONS
Valid options for [Build] section are listed below:
[Build] options
podman build equivalent
Annotation=annotation=value
--annotation=annotation=value
Arch=aarch64
--arch=aarch64
AuthFile=/etc/registry/auth.json
--authfile=/etc/registry/auth.json
ContainersConfModule=/etc/nvd.conf
--module=/etc/nvd.conf
DNS=192.168.55.1
--dns=192.168.55.1
DNSOption=ndots:1
--dns-option=ndots:1
DNSSearch=example.com
--dns-search example.com
Environment=foo=bar
--env foo=bar
File=/path/to/Containerfile
--file=/path/to/Containerfile
ForceRM=false
--force-rm=false
GlobalArgs=--log-level=debug
--log-level=debug
GroupAdd=keep-groups
--group-add=keep-groups
ImageTag=localhost/imagename
--tag=localhost/imagename
Label=label
--label=label
Network=host
--network=host
PodmanArgs=--pull never
--pull never
Pull=never
--pull never
Retry=5
--retry=5
RetryDelay=10s
--retry-delay=10s
Secret=secret
--secret=id=mysecret,src=path
SetWorkingDirectory=unit
Set WorkingDirectory of systemd unit file
Target=my-app
--target=my-app
TLSVerify=false
--tls-verify=false
Variant=arm/v7
--variant=arm/v7
Volume=/source:/dest
--volume /source:/dest
Annotation=annotation=value [annotation=value ...]
Add an image annotation (e.g. annotation=value) to the image metadata. Can
be used multiple times.
Note: this information is not present in Docker image formats, so it is
discarded when writing images in Docker formats.
Arch=ARCH
Override the architecture, defaults to the host, of the image to be pulled. For example, arm.
Unless overridden, subsequent lookups of the same image in the local storage matches this architecture, regardless of the host.
AuthFile=path
Path of the authentication file. Default is ${XDG_RUNTIME_DIR}/containers/auth.json on Linux, and $HOME/.config/containers/auth.json on Windows/macOS.
The file is created by podman login. If the authorization state is not found there, $HOME/.docker/config.json is checked, which is set using docker login.
Note: There is also the option to override the default path of the authentication file by setting the REGISTRY_AUTH_FILE environment variable. This can be done with export REGISTRY_AUTH_FILE=path.
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
Set custom DNS options to be used during the build.
DNSSearch=domain
Set custom DNS search domains to be used during the build.
Environment=env=value [env=value ...]
Set environment variables.
This option allows arbitrary environment variables that are available for the process to be launched inside of the container. If an environment variable is specified without a value, Podman checks the host environment for a value and set the variable only if it is set on the host. As a special case, if an environment variable ending in * is specified without a value, Podman searches the host environment for variables starting with the prefix and adds those variables to the container.
File=Containerfile
Specifies a Containerfile which contains instructions for building the image,
either a local file or an http or https URL. If more than one
Containerfile is specified, FROM instructions are only accepted from the
last specified file.
Note that for a given relative path to a Containerfile, or when using a http(s):// URL, also set
SetWorkingDirectory= in order for podman build to find a valid context directory for the
resources specified in the Containerfile.
Note that setting a File= field is mandatory for a .build file, unless SetWorkingDirectory (or
a WorkingDirectory in the Service group) has also been set.
Specifying the option File=- causes
the Containerfile contents to be read from stdin.
ForceRM=
Always remove intermediate containers after a build, even if the build fails (default true).
GlobalArgs=
This key contains a list of arguments passed directly after the podman command in the generated
file. It can be used to access Podman features otherwise unsupported by the generator. Since the
generator is unaware of what unexpected interactions can be caused by these arguments, it is not
recommended to use this option.
The format of this is a space separated list of arguments, which can optionally be individually
escaped to allow inclusion of whitespace and other control characters.
This key can be listed multiple times.
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
ImageTag=imageName
Specifies the name which is assigned to the resulting image if the build process completes successfully.
If imageName does not include a registry name, the registry name localhost is prepended to the image name.
Label=label
Add an image label (e.g. label=value) to the image metadata. Can be used
multiple times.
Users can set a special LABEL io.containers.capabilities=CAP1,CAP2,CAP3 in
a Containerfile that specifies the list of Linux capabilities required for the
container to run properly. This label specified in a container image tells
Podman to run the container with just these capabilities. Podman launches the
container with just the specified capabilities, as long as this list of
capabilities is a subset of the default list.
If the specified capabilities are not in the default set, Podman prints an error
message and runs the container with the default capabilities.
Network=mode
Sets the configuration for network namespaces when handling RUN instructions.
Special case:
If the name of the network ends with .network, Quadlet will look for the corresponding .network Quadlet unit. If found, Quadlet will use the name of the Network set in the Unit, otherwise, systemd-$name is used. The generated systemd service contains a dependency on the service unit generated for that .network unit, or on $name-network.service if the .network unit is not found. Note: the corresponding .network file must exist.
Valid mode values are:
none: no networking.
host: use the Podman host network stack. Note: the host mode gives the
container full access to local system services such as D-bus and is therefore
considered insecure.
ns:path: path to a network namespace to join.
private: create a new namespace for the container (default)
<network name|ID>: Join the network with the given name or ID, e.g. use --network mynet to join the network with the name mynet. Only supported for rootful users.
pasta[:OPTIONS,…]: use pasta(1) to create a user-mode networking
stack.
This is the default for rootless containers and only supported in rootless mode.
By default, IPv4 and IPv6 addresses and routes, as well as the pod interface
name, are copied from the host. If port forwarding isn’t configured, ports
are forwarded dynamically as services are bound on either side (init
namespace or container namespace). Port forwarding preserves the original
source IP address. Options described in pasta(1) can be specified as
comma-separated arguments.
In terms of pasta(1) options, --config-net is given by default, in
order to configure networking when the container is started, and
--no-map-gw is also assumed by default, to avoid direct access from
container to host using the gateway address. The latter can be overridden
by passing --map-gw in the pasta-specific options (despite not being an
actual pasta(1) option).
Also, -t none and -u none are passed to disable
automatic port forwarding based on bound ports. Similarly, -T none and
-U none are given to disable the same functionality from container to
host.
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
Pull=policy
Pull image policy. The default is missing.
always: Always pull the image and throw an error if the pull fails.
missing: Pull the image only when the image is not in the local containers storage. Throw an error if no image is found and the pull fails.
never: Never pull the image but use the one from the local containers storage. Throw an error if no image is found.
newer: Pull if the image on the registry is newer than the one in the local containers storage. An image is considered to be newer when the digests are different. Comparing the time stamps is prone to errors. Pull errors are suppressed if a local image was found.
Retry=attempts
Number of times to retry pulling or pushing images between the registry and
local storage in case of failure. Default is 3.
RetryDelay=duration
Duration of delay between retry attempts when pulling or pushing images between
the registry and local storage in case of failure. The default is to start at two seconds and then exponentially back off. The delay is used when this value is set, and no exponential back off occurs.
Secret=id=id[,src=envOrFile][,env=ENV][,type=file | env]
Pass secret information to be used in the Containerfile for building images
in a safe way that will not end up stored in the final image, or be seen in other stages.
The value of the secret will be read from an environment variable or file named
by the “id” option, or named by the “src” option if it is specified, or from an
environment variable specified by the “env” option. See EXAMPLES.
The secret will be mounted in the container at /run/secrets/id by default.
To later use the secret, use the --mount flag in a RUN instruction within a Containerfile:
RUN --mount=type=secret,id=mysecret cat /run/secrets/mysecret
The location of the secret in the container can be overridden using the
“target”, “dst”, or “destination” option of the RUN --mount flag.
RUN --mount=type=secret,id=mysecret,target=/run/secrets/myothersecret cat /run/secrets/myothersecret
Note: changing the contents of secret files will not trigger a rebuild of layers that use said secrets.
SetWorkingDirectory=path
Provide context (a working directory) to podman build. Supported values are a path, a URL, or the
special keys file or unit to set the context directory to the parent directory of the file from
the File= key or to that of the Quadlet .build unit file, respectively. This allows Quadlet to
resolve relative paths.
When using one of the special keys (file or unit), the WorkingDirectory field of the Service
group of the Systemd service unit will also be set accordingly. Alternatively, users can
explicitly set the WorkingDirectory field of the Service group in the .build file. Please note
that if the WorkingDirectory field of the Service group is set by the user, Quadlet will not
overwrite it even if SetWorkingDirectory is set to file or unit.
By providing a URL to SetWorkingDirectory= you can instruct podman build to clone a Git
repository or download an archive file extracted to a temporary location by podman build as build
context. Note that in this case, the WorkingDirectory of the Systemd service unit is left
untouched by Quadlet.
URLs are interpreted in the same way as podman-build(1).
A URL is treated as a Git repository if it starts with git:// or its last path
component ends with .git. The URL may include a fragment of the form
#branch-or-commit[:subdir] to select a branch or commit and, optionally, a
subdirectory to use as the build context.
For example:
# use the main branch as the build context
SetWorkingDirectory=https://github.com/containers/PodmanHello.git
# use a specific commit as the build context
SetWorkingDirectory=https://github.com/containers/PodmanHello.git#76b262056eae09851d0a952d0f42b5bbeedde471
# use a specific subdirectory as the build context
SetWorkingDirectory=https://github.com/containers/PodmanHello.git#:python
Note that providing a context directory is mandatory for a .build file, unless a File= key has
also been provided.
Target=stageName
Set the target build stage to build. When building a Containerfile with multiple build stages, --target can be used to specify an intermediate build stage by name as the final stage for the resulting image. Commands after the target stage is skipped.
TLSVerify=
Require HTTPS and verify certificates when contacting registries (default: true).
If explicitly set to true, TLS verification is used.
If set to false, TLS verification is not used.
If not specified, TLS verification is used unless the target registry
is listed as an insecure registry in containers-registries.conf(5)
Variant=VARIANT
Set the architecture variant of the image to be built, and that of the base
image to be pulled, if the build uses one, to the provided value instead of
using the architecture variant of the build host.
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
$ podman podman-build.unit.5.md.in -v myvolume:/data:nocreate alpine
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
$ podman podman-build.unit.5.md.in --security-opt label=disable -v $HOME:/home/user fedora touch /home/user/file
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
EXAMPLES
Simple build
[Build]
ImageTag=localhost/myapp
File=Containerfile
SetWorkingDirectory=unit
From Git repository
[Build]
ImageTag=localhost/mygitimage
File=Containerfile
SetWorkingDirectory=https://github.com/example/repo.git
Build with secret
[Build]
ImageTag=localhost/secureimage
Secret=mysecret
SEE ALSO
podman-build(1),
podman-systemd.unit(5),
systemd.unit(5)
