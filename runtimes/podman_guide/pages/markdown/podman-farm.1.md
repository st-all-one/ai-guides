NAME
podman-farm - Farm out builds to machines running podman for different architectures
SYNOPSIS
podman farm subcommand
DESCRIPTION
Farm out builds to machines running Podman for different architectures.
Manage farms by creating, updating, and removing them.
Note: All farm machines must have a minimum podman version of v4.9.0.
Podman manages the farms by writing and reading the podman-connections.json file located under
$XDG_CONFIG_HOME/containers or if the env is not set it defaults to $HOME/.config/containers.
Or the PODMAN_CONNECTIONS_CONF environment variable can be set to a full file path which podman
will use instead.
This file is managed by the podman commands and should never be edited by users directly. To manually
configure the farms use the [farm] section in containers.conf.
If the ReadWrite column in the podman farm list output is set to true the farm is stored in the
podman-connections.json file otherwise it is stored in containers.conf and can therefore not be
edited with the podman farm remove/update commands. It can still be used with podman farm build.
COMMANDS
Command
Man Page
Description
build
podman-farm-build(1)
Build images on farm nodes, then bundle them into a manifest list
create
podman-farm-create(1)
Create a new farm
list
podman-farm-list(1)
List the existing farms
remove
podman-farm-remove(1)
Delete one or more farms
update
podman-farm-update(1)
Update an existing farm
SEE ALSO
podman(1)
