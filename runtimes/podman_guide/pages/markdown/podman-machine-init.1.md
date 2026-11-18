NAME
podman-machine-init - Initialize a new virtual machine
SYNOPSIS
podman machine init [options] [name]
DESCRIPTION
Initialize a new virtual machine for Podman.
The default machine name is podman-machine-default. If a machine name is not specified as an argument,
then the new machine will be named podman-machine-default.
Rootless only.
Podman on MacOS and Windows requires a virtual machine. This is because containers are Linux -
containers do not run on any other OS because containers’ core functionality are
tied to the Linux kernel. Podman machine must be used to manage MacOS and Windows machines,
but can be optionally used on Linux.
podman machine init initializes a new Linux virtual machine where containers are run.
SSH keys are automatically generated to access the VM, and system connections to the root account
and a user account inside the VM are added.
By default, the VM distribution is a custom Fedora CoreOS
based image pushed to quay.io/podman/machine-os (build in https://github.com/containers/podman-machine-os).
WSL is an exception and is based on a custom Fedora image.
To check if there is an upgrade available for your machine os, you can run the following command:
$ podman machine ssh 'sudo rpm-ostree upgrade --check'
If an update is available, you can rerun the above command and remove the --check and your operating system will
be updated. After updating, you must stop and start your machine with podman machine stop && podman machine start for
it to take effect.
The above mechanism is only used to update patch (Z) versions of podman. For updates to new major and minor
version (X.Y) use the podman machine os apply command, see the docs there for
more information.
Note: Updating as described above can result in version mismatches between Podman on the host and Podman in the
machine. Executing podman info should reveal versions of both. A configuration where the Podman host and machine
mismatch are unsupported.
To update the WSL image you must run dnf update inside, use the following command:
$ podman machine ssh dnf update
Default Podman machine settings can be set via the [machine] section in the containers.conf(5) file.
OPTIONS
--cpus=number
Number of CPUs.
--disk-size=number
Size of the disk for the guest VM in GiB.
--help
Print usage statement.
--ignition-path
Fully qualified path of the ignition file.
If an ignition file is provided, the file
is copied into the user’s CONF_DIR and renamed. Additionally, no SSH keys are generated, nor are any system connections made. It is assumed that the user does these things manually or handled otherwise.
--image
Fully qualified registry, path, or URL to a VM image.
Registry target must be in the form of docker://registry/repo/image:version.
Note: Only images provided by podman will be supported.
--import-native-ca
Import the host’s trusted CA certificates into the machine.
When set to true, the certificates from the host system are imported during machine startup.
This allows containers running in the machine to trust the same Certificate Authorities
as the host OS. The default value is false.
--memory, -m=number
Memory (in MiB). Note: 1024MiB = 1GiB.
--now
Start the virtual machine immediately after it has been initialized.
--playbook
Add the provided Ansible playbook to the machine and execute it after the first boot.
Note: The playbook will be executed with the same privileges given to the user in the virtual machine. The playbook provided cannot include other files from the host system, as they will not be copied.
Use of the --playbook flag will require the image to include Ansible. The default image provided will have Ansible included.
--provider
Specify the provider for the machine to be created. This allows users to override the default provider on platforms
that have multiple providers.
--rootful
Whether this machine prefers rootful (true) or rootless (false)
container execution. This option determines the remote connection default
if there is no existing remote connection configurations.
API forwarding, if available, follows this setting.
--swap, -s=number
Swap (in MiB). Note: 1024MiB = 1GiB.
Renders a zram-generator.conf file with zram-size set to the value passed to --swap
--timezone
Set the timezone for the machine and containers. Valid values are local or
a timezone such as America/Chicago. A value of local, which is the default,
means to use the timezone of the machine host.
The timezone setting is not used with WSL. WSL automatically sets the timezone to the same
as the host Windows operating system.
--tls-verify
Require HTTPS and verify certificates when contacting registries (default: true).
If explicitly set to true, TLS verification is used.
If set to false, TLS verification is not used.
If not specified, TLS verification is used unless the target registry
is listed as an insecure registry in containers-registries.conf(5)
--update-connection, -u
When used in conjunction with podman machine init --now or podman machine start, this option sets the
associated machine system connection as the default. When using this option, a -u or -update-connection will
set the value to true. To set this value to false, meaning no change and no prompting,
use --update-connection=false. If the value is unset and stdin is not a tty, no prompt or update
shall occur.
If the value is set to true, the machine connection will be set as the system default.
If the value is set to false, the system default will be unchanged.
If the option is not set, the user will be prompted and asked if it should be changed.
--usb=bus=number,devnum=number or vendor=hexadecimal,product=hexadecimal
Assign a USB device from the host to the VM via USB passthrough.
Only supported for QEMU Machines.
The device needs to have proper permissions in order to be passed to the machine. This
means the device needs to be under your user group.
Note that using bus and device number are simpler but the values can change every boot
or when the device is unplugged.
When specifying a USB using vendor and product ID’s, if more than one device has the
same vendor and product ID, the first available device is assigned.
--user-mode-networking
This option can only be used for the WSL provider on Windows. On all other
platforms this option is ignored and user mode networking will always be
true there because these providers always depend on gvproxy (our user
mode networking tool for the VMs)
In contrast, The Windows/WSL backend defaults to false, and follows the
standard WSL network setup.
Changing this setting to true on Windows/WSL informs Podman to replace
the WSL networking setup on start of this machine instance with a user-mode
networking distribution. Since WSL shares the same kernel across
distributions, all other running distributions reuses this network.
Likewise, when the last machine instance with a true setting stops, the
original networking setup is restored.
In some VPN configurations the VPN may drop traffic from alternate network
interfaces, including VM network devices. By enabling user-mode networking
VPNs observe all podman machine traffic as coming from the host, bypassing
the problem.
--username
Username to use for executing commands in remote VM. Default value is core
for FCOS and user for Fedora (default on Windows hosts). Should match the one
used inside the resulting VM image.
--volume, -v=source:target[:options]
Mounts a volume from source to target.
Create a mount. If /host-dir:/machine-dir is specified as the *source:target*,
Podman mounts host-dir in the host to machine-dir in the Podman machine.
Additional options may be specified as a comma-separated string. Recognized
options are:
ro: mount volume read-only
rw: mount volume read/write (default)
security_model=[model]: specify 9p security model (see below)
Note: The following destinations are forbidden for volumes: /bin, /boot, /dev, /etc,
/home, /proc, /root, /run, /sbin, /sys, /tmp, /usr, and /var. Subdirectories
of these destinations are allowed but users should be careful to not mount to important directories
as unexpected results may occur.
The 9p security model [determines] https://wiki.qemu.org/Documentation/9psetup#Starting_the_Guest_directly
if and how the 9p filesystem translates some filesystem operations before
actual storage on the host.
In order to allow symlinks to work, on MacOS the default security model is
none.
The value of mapped-xattr specifies that 9p store symlinks and some file
attributes as extended attributes on the host. This is suitable when the host
and the guest do not need to interoperate on the shared filesystem, but has
caveats for actual shared access; notably, symlinks on the host are not usable
on the guest and vice versa. If interoperability is required, then choose
none instead, but keep in mind that the guest is not able to do things
that the user running the virtual machine cannot do, e.g. create files owned by
another user. Using none is almost certainly the best choice for read-only
volumes.
Example: -v "$HOME/git:$HOME/git:ro,security_model=none"
Default volume mounts are defined in containers.conf. Unless changed, the default values
is $HOME:$HOME.
Note on Windows Subsystem for Linux (WSL)
Since all drives are mounted at /mnt on startup by default in WSL, passing
--volume is redundant and has no effect. The host home directory for a C:
drive will be mounted at /mnt/c/Users/<my username>.
EXAMPLES
Initialize the default Podman machine, pulling the content from the internet.
$ podman machine init
Initialize a Podman machine for the specified name pulling the content from the internet.
$ podman machine init myvm
Initialize and start a new Podman machine in one step.
$ podman machine init --now
Initialize the default Podman machine pulling the content from the internet defaulting to rootful mode. The default is rootless.
$ podman machine init --rootful
Initialize the default Podman machine overriding its disk size override, pulling the content from the internet.
$ podman machine init --disk-size 50
Initialize the specified Podman machine overriding its memory size, pulling the content from the internet.
$ podman machine init --memory=1024 myvm
Initialize the default Podman machine with the host directory /Users mounted into the VM at /Users.
$ podman machine init -v /Users:/Users
Initialize the default Podman machine with a usb device passthrough specified with options. Only supported for QEMU Machines.
$ podman machine init --usb vendor=13d3,product=5406
Initialize the default Podman machine with a usb device passthrough with specified with options. Only supported for QEMU Machines.
$ podman machine init --usb bus=1,devnum=3
Initialize a machine on different provider than the default
$ podman machine init --provider applehv
SEE ALSO
podman(1), podman-machine(1), containers.conf(5)
