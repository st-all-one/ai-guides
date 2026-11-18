NAME
podman-stop - Stop one or more running containers
SYNOPSIS
podman stop [options] container …
podman container stop [options] container …
DESCRIPTION
Stops one or more containers using container IDs or names as input. The --time option
specifies the number of seconds to wait before forcibly stopping the container after the stop command
is issued to the container. The default is 10 seconds. By default, containers are stopped with SIGTERM
and then SIGKILL after the timeout. The SIGTERM default can be overridden by the image used to create the
container and also via command line when creating the container.
OPTIONS
--all, -a
Stop all running containers. This does not include paused containers.
--cidfile=file
Read container ID from the specified file and stop the container.
Can be specified multiple times.
Command does not fail when file is missing and user specified --ignore.
--filter, -f=filter
Filter what containers stop.
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
--ignore, -i
Ignore errors when specified containers are not in the container store. A user
might have decided to manually remove a container which leads to a failure
during the ExecStop directive of a systemd service referencing that container.
--latest, -l
Instead of providing the container name or ID, use the last created container.
Note: the last started container can be from other users of Podman on the host machine.
(This option is not available with the remote Podman client, including Mac and Windows
(excluding WSL2) machines)
--time, -t=seconds
Seconds to wait before forcibly stopping the container.
Use -1 for infinite wait.
EXAMPLES
Stop the specified container via its name.
$ podman stop mywebserver
Stop the container via its id.
$ podman stop 860a4b235279
Stop multiple containers.
$ podman stop mywebserver 860a4b235279
Stop the container identified in the cidfile.
$ podman stop --cidfile /home/user/cidfile-1
Stop the containers identified in the cidfiles.
$ podman stop --cidfile /home/user/cidfile-1 --cidfile ./cidfile-2
Stop the specified container in 2 seconds.
$ podman stop --time 2 860a4b235279
Stop all running containers.
$ podman stop -a
Stop the last created container (This option is not available with the remote Podman client, including Mac and Windows (excluding WSL2) machines)
$ podman stop --latest
Stop by label.
$ podman stop --filter label=app=frontend
9351ccb3ef4272532bc0c188bd4f0ddfc2b0de217732cd108259ea126b014647
Stop by name.
$ podman stop --filter name=db-replica
6c2680da61d54690718ac3aecdb04a8aad95ae353e42cc942736823bd05c8a1d
Stop by role label.
$ podman stop --filter label=role=primary
bb3ff91d969a8dc622d627e4a8d76c18bdbd417d317c5e7e66543c0b0c8ed1e8
SEE ALSO
podman(1), podman-rm(1)
