NAME
podman-machine-start - Start a virtual machine
SYNOPSIS
podman machine start [name]
DESCRIPTION
Starts a virtual machine for Podman.
Rootless only.
Podman on MacOS and Windows requires a virtual machine. This is because containers are Linux -
containers do not run on any other OS because containers’ core functionality is
tied to the Linux kernel. Podman machine must be used to manage MacOS and Windows machines,
but can be optionally used on Linux.
The default machine name is podman-machine-default. If a machine name is not specified as an argument,
then podman-machine-default will be started.
Only one Podman managed VM can be active at a time. If a VM is already running,
podman machine start returns an error.
podman machine start starts a Linux virtual machine where containers are run.
OPTIONS
--help
Print usage statement.
--no-info
Suppress informational tips.
--quiet, -q
Suppress machine starting status output.
--update-connection, -u
When used in conjunction with podman machine init --now or podman machine start, this option sets the
associated machine system connection as the default. When using this option, a -u or -update-connection will
set the value to true. To set this value to false, meaning no change and no prompting,
use --update-connection=false. If the value is unset and stdin is not a tty, no prompt or update
shall occur.
If the value is set to true, the machine connection will be set as the system default.
If the value is set to false, the system default will be unchanged.
If the option is not set, the user will be prompted and asked if it should be changed.
EXAMPLES
Start the specified podman machine.
$ podman machine start myvm
Starting machine "myvm"
This machine is currently configured in rootless mode. If your containers
require root permissions (e.g. ports < 1024), or if you run into compatibility
issues with non-podman clients, you can switch using the following command:
	podman machine set --rootful myvm
API forwarding listening on: /var/folders/my/k1kpd8ds7p938mchyb1r_4mw0000gn/T/podman/myvm-api.sock
The system helper service is not installed; the default Docker API socket
address can't be used by podman. If you would like to install it, run the following commands:
        sudo /opt/homebrew/Cellar/podman/5.2.4/bin/podman-mac-helper install
        podman machine stop myvm; podman machine start myvm
You can still connect Docker API clients by setting DOCKER_HOST using the
following command in your terminal session:
        export DOCKER_HOST='unix:///var/folders/my/k1kpd8ds7p938mchyb1r_4mw0000gn/T/podman/myvm-api.sock'
Machine "myvm" started successfully
Start with --no-info:
$ podman machine start --no-info myvm
Starting machine "myvm"
Machine "myvm" started successfully
Start with --quiet:
$ podman machine start --quiet myvm
Machine "myvm" started successfully
SEE ALSO
podman(1), podman-machine(1)
