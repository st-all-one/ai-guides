NAME
podman-pause - Pause one or more containers
SYNOPSIS
podman pause [options] [container…]
podman container pause [options] [container…]
DESCRIPTION
Pauses all the processes in one or more containers. You may use container IDs or names as input.
OPTIONS
--all, -a
Pause all running containers.
--cidfile=file
Read container ID from the specified file and pause the container.
Can be specified multiple times.
--filter, -f=filter
Filter what containers pause.
Multiple filters can be given with multiple uses of the --filter flag.
Filters with the same key work inclusive with the only exception being
label which is exclusive. Filters with different keys always work exclusive.
Valid filters are listed below:
Filter
Description
id
[ID] Container’s ID (CID prefix match by default; accepts regex)
name
[Name] Container’s name (accepts regex)
annotation
[Key] or [Key=Value] Annotation assigned to a container
annotation!
[Key] or [Key=Value] Annotation NOT assigned to a container
label
[Key] or [Key=Value] Label assigned to a container
label!
[Key] or [Key=Value] Label NOT assigned to a container
exited
[Int] Container’s exit code
status
[Status] Container’s status: ‘created’, ‘initialized’, ‘running’, ‘stopped’, ‘paused’, ‘exited’, ‘removing’, ‘stopping’, ‘unknown’
status!
[Status] Container’s status is NOT the specified status
ancestor
[ImageName] Image or descendant used to create container (accepts regex)
before
[ID] or [Name] Containers created before this container
since
[ID] or [Name] Containers created since this container
volume
[VolumeName] or [MountpointDestination] Volume mounted in container
health
[Status] healthy or unhealthy
pod
[Pod] name or full or partial ID of pod
network
[Network] name or full ID of network
restart-policy
[Policy] Container’s restart policy (e.g., ‘no’, ‘on-failure’, ‘always’, ‘unless-stopped’)
until
[DateTime] Containers created before the given duration or time.
command
[Command] the command the container is executing, only argv[0] is taken
should-start-on-boot
[Bool] Containers that need to be restarted after system reboot. True for containers with restart policy ‘always’, or ‘unless-stopped’ that were not explicitly stopped by the user
--latest, -l
Instead of providing the container name or ID, use the last created container.
Note: the last started container can be from other users of Podman on the host machine.
(This option is not available with the remote Podman client, including Mac and Windows
(excluding WSL2) machines)
EXAMPLE
Pause specified container:
$ podman pause mywebserver
Pause container by partial container ID:
$ podman pause 860a4b23
Pause all running containers:
$ podman pause --all
Pause container using ID specified in given files:
$ podman pause --cidfile /home/user/cidfile-1
$ podman pause --cidfile /home/user/cidfile-1 --cidfile ./cidfile-2
Pause the latest container. (This option is not available with the remote Podman client, including Mac and Windows (excluding WSL2) machines):
$ podman pause --latest
SEE ALSO
podman(1), podman-unpause(1)
