NAME
podman-quadlet - Allows users to manage Quadlets
SYNOPSIS
podman quadlet subcommand
DESCRIPTION
podman quadlet is a set of subcommands that manage Quadlets.
Podman Quadlets allow users to manage containers, pods, volumes, networks, and images declaratively using systemd unit files. This simplifies container management on Linux systems without requiring full orchestration tools like Kubernetes. The syntax of quadlet files is described in podman-systemd.unit(5).
COMMANDS
Command
Man Page
Description
install
podman-quadlet-install(1)
Install a quadlet file or quadlet application
list
podman-quadlet-list(1)
List installed quadlets (alias ls)
print
podman-quadlet-print(1)
Display the contents of a quadlet
rm
podman-quadlet-rm(1)
Removes an installed quadlet
SEE ALSO
podman(1), podman-systemd.unit(5)
