NAME
podman-machine-set - Set a virtual machine setting
SYNOPSIS
podman machine set [options] [name]
DESCRIPTION
Change a machine setting.
The default machine name is podman-machine-default. If a machine name is not specified as an argument,
then the settings will be applied to podman-machine-default.
Rootless only.
Default Podman machine settings can be set via the [machine] section in the containers.conf(5) file.
OPTIONS
--cpus=number
Number of CPUs.
Only supported for QEMU machines.
--disk-size=number
Size of the disk for the guest VM in GB.
Can only be increased. Only supported for QEMU machines.
--help
Print usage statement.
--import-native-ca
Import the host’s trusted CA certificates into the machine.
When set to true, the certificates from the host system are imported during machine startup.
This allows containers running in the machine to trust the same Certificate Authorities
as the host OS. The default value is false.
--memory, -m=number
Memory (in MB).
Only supported for QEMU machines.
--rootful
Whether this machine prefers rootful (true) or rootless (false)
container execution. This option updates the current podman
remote connection default if it is currently pointing at the specified
machine name (or podman-machine-default if no name is specified).
Unlike podman system connection default
this option makes the API socket, if available, forward to the rootful/rootless
socket in the VM.
Note that changing this option means that all the existing containers/images/volumes, etc…
are no longer visible with the default connection/socket. This is because the root and rootless
users in the VM are completely separated and do not share any storage. The data however is not
lost and you can always change this option back or use the other connection to access it.
--usb=bus=number,devnum=number or vendor=hexadecimal,product=hexadecimal or “”
Assign a USB device from the host to the VM.
Only supported for QEMU Machines.
The device needs to be present when the VM starts.
The device needs to have proper permissions in order to be assign to podman machine.
Use an empty string to remove all previously set USB devices.
Note that using bus and device number are simpler but the values can change every boot or when the
device is unplugged. Using vendor and product might lead to collision in the case of multiple
devices with the same vendor product value, the first available device is assigned.
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
EXAMPLES
To switch the default Podman machine from rootless to rootful:
$ podman machine set --rootful
or more explicitly set with value true.
$ podman machine set --rootful=true
Switch the default Podman machine from rootful to rootless.
$ podman machine set --rootful=false
Switch the specified Podman machine from rootless to rootful.
$ podman machine set --rootful myvm
SEE ALSO
podman(1), podman-machine(1), containers.conf(5)
