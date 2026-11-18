NAME
podman-kill - Kill the main process in one or more containers
SYNOPSIS
podman kill [options] [container …]
podman container kill [options] [container …]
DESCRIPTION
The main process inside each container specified is sent SIGKILL or any signal specified with the --signal option.
OPTIONS
--all, -a
Signal all running and paused containers.
--cidfile=file
Read container ID from the specified file and kill the container.
Can be specified multiple times.
--latest, -l
Instead of providing the container name or ID, use the last created container.
Note: the last started container can be from other users of Podman on the host machine.
(This option is not available with the remote Podman client, including Mac and Windows
(excluding WSL2) machines)
--signal, -s=signal
Signal to send to the container. For more information on Linux signals, refer to signal(7).
The default is SIGKILL.
EXAMPLE
Kill container with a given name:
$ podman kill mywebserver
Kill container with a given ID:
$ podman kill 860a4b23
Terminate container by sending TERM signal:
$ podman kill --signal TERM 860a4b23
Kill the latest container. (This option is not available with the remote Podman client, including Mac and Windows
(excluding WSL2) machines):
$ podman kill --latest
Terminate all containers by sending KILL signal:
$ podman kill --signal KILL -a
Kill containers using ID specified in a given files:
$ podman kill --cidfile /home/user/cidfile-1
$ podman kill --cidfile /home/user/cidfile-1 --cidfile ./cidfile-2
SEE ALSO
podman(1), podman-stop(1)
