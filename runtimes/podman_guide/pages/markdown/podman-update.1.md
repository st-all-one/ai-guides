NAME
podman-update - Update the configuration of a given container
SYNOPSIS
podman update [options] container
podman container update [options] container
DESCRIPTION
Updates the configuration of an existing container, allowing changes to resource limits and healthchecks.
OPTIONS
--blkio-weight=weight
Block IO relative weight. The weight is a value between 10 and 1000.
This option is not supported on cgroups V1 rootless systems.
--blkio-weight-device=device:weight
Block IO relative device weight.
--cpu-period=limit
Set the CPU period for the Completely Fair Scheduler (CFS), which is a
duration in microseconds. Once the container’s CPU quota is used up, it will not
be scheduled to run until the current period ends. Defaults to 100000
microseconds.
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--cpu-quota=limit
Limit the CPU Completely Fair Scheduler (CFS) quota.
Limit the container’s CPU usage. By default, containers run with the full
CPU resource. The limit is a number in microseconds. If a number is provided,
the container is allowed to use that much CPU time until the CPU period
ends (controllable via --cpu-period).
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--cpu-shares, -c=shares
CPU shares (relative weight).
By default, all containers get the same proportion of CPU cycles. This
proportion can be modified by changing the container’s CPU share weighting
relative to the combined weight of all the running containers.
Default weight is 1024.
The proportion only applies when CPU-intensive processes are running.
When tasks in one container are idle, other containers can use the
left-over CPU time. The actual amount of CPU time varies depending on
the number of containers running on the system.
For example, consider three containers, one has a cpu-share of 1024 and
two others have a cpu-share setting of 512. When processes in all three
containers attempt to use 100% of CPU, the first container receives
50% of the total CPU time. If a fourth container is added with a cpu-share
of 1024, the first container only gets 33% of the CPU. The remaining containers
receive 16.5%, 16.5% and 33% of the CPU.
On a multi-core system, the shares of CPU time are distributed over all CPU
cores. Even if a container is limited to less than 100% of CPU time, it can
use 100% of each individual CPU core.
For example, consider a system with more than three cores.
If the container C0 is started with --cpu-shares=512 running one process,
and another container C1 with --cpu-shares=1024 running two processes,
this can result in the following division of CPU shares:
PID
container
CPU
CPU share
100
C0
0
100% of CPU0
101
C1
1
100% of CPU1
102
C1
2
100% of CPU2
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--cpus=number
Number of CPUs. The default is 0.0 which means no limit. This is shorthand
for --cpu-period and --cpu-quota, therefore the option cannot be specified with
--cpu-period or --cpu-quota.
On some systems, changing the CPU limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--cpuset-cpus=number
CPUs in which to allow execution. Can be specified as a comma-separated list
(e.g. 0,1), as a range (e.g. 0-3), or any combination thereof
(e.g. 0-3,7,11-15).
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--cpuset-mems=nodes
Memory nodes (MEMs) in which to allow execution (0-3, 0,1). Only effective on
NUMA systems.
If there are four memory nodes on the system (0-3), use --cpuset-mems=0,1
then processes in the container only uses memory from the first
two memory nodes.
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--device-read-bps=path:rate
Limit read rate (in bytes per second) from a device (e.g. --device-read-bps=/dev/sda:1mb).
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--device-read-iops=path:rate
Limit read rate (in IO operations per second) from a device (e.g. --device-read-iops=/dev/sda:1000).
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--device-write-bps=path:rate
Limit write rate (in bytes per second) to a device (e.g. --device-write-bps=/dev/sda:1mb).
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--device-write-iops=path:rate
Limit write rate (in IO operations per second) to a device (e.g. --device-write-iops=/dev/sda:1000).
On some systems, changing the resource limits may not be allowed for non-root
users. For more details, see
https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
This option is not supported on cgroups V1 rootless systems.
--env, -e=env
Add a value (e.g. env=value) to the container. Can be used multiple times.
If the value already exists in the container, it is overridden.
To remove an environment variable from the container, use the --unsetenv
option.
Note that the env updates only affect the main container process after
the next start.
--health-cmd=”command” | ‘[“command”, “arg1”, …]’
Set or alter a healthcheck command for a container. The command is a command to be executed inside the
container that determines the container health. The command is required for other healthcheck options
to be applied. A value of none disables existing healthchecks.
Multiple options can be passed in the form of a JSON array; otherwise, the command is interpreted
as an argument to /bin/sh -c.
Note: The default values are used even if healthcheck is configured in the image.
--health-interval=interval
Set an interval for the healthchecks. An interval of disable results in no automatic timer setup. The default is 30s.
Note: This parameter will overwrite related healthcheck configuration from the image.
Changing this setting resets the timer.
--health-log-destination=directory_path
Set the destination of the HealthCheck log. Directory path, local or events_logger (local use container state file) (Default: local)
local: (default) HealthCheck logs are stored in overlay containers. (For example: $runroot/healthcheck.log)
directory: creates a log file named <container-ID>-healthcheck.log with HealthCheck logs in the specified directory.
events_logger: The log will be written with logging mechanism set by events_logger. It also saves the log to a default directory, for performance on a system with a large number of logs.
Warning: Changing this setting may cause the loss of previous logs.
--health-max-log-count=number of stored logs
Set maximum number of attempts in the HealthCheck log file. (‘0’ value means an infinite number of attempts in the log file) (Default: 5 attempts)
--health-max-log-size=size of stored logs
Set maximum length in characters of stored HealthCheck log. (“0” value means an infinite log length) (Default: 500 characters)
--health-on-failure=action
Action to take once the container transitions to an unhealthy state. The default is none.
none: Take no action.
kill: Kill the container.
restart: Restart the container. Do not combine the restart action with the --restart flag. When running inside of a systemd unit, consider using the kill or stop action instead to make use of systemd’s restart policy.
stop: Stop the container.
--health-retries=retries
The number of retries allowed before a healthcheck is considered to be unhealthy. The default value is 3.
Note: This parameter can overwrite the healthcheck configuration from the image.
--health-start-interval=interval
This is an alias for --health-startup-interval option made for Docker compatibility.
--health-start-period=period
The initialization time needed for a container to bootstrap. The value can be expressed in time format like
2m3s. The default value is 0s.
Note: The health check command is executed as soon as a container is started, if the health check is successful
the container’s health state will be updated to healthy. However, if the health check fails, the health state will
stay as starting until either the health check is successful or until
the --health-start-period time is over. If the
health check command fails after the --health-start-period
time is over, the health state will be updated to unhealthy.
The health check command is executed periodically based on the value of
--health-interval.
Note: This parameter will overwrite related healthcheck configuration from the image.
--health-startup-cmd=”command” | ‘[“command”, “arg1”, …]’
Set a startup healthcheck command for a container. This command is executed inside the container and is used to gate the regular
healthcheck. When the startup command succeeds, the regular healthcheck begins and the startup healthcheck ceases. Optionally,
if the command fails a set number of times, the container is restarted. A startup healthcheck can be used to ensure that
containers with an extended startup period are not marked as unhealthy until they are fully started. Startup healthchecks can only be
used when a regular healthcheck (from the container’s image or the
--health-cmd option) is also set.
If --health-cmd option was set, but --health-startup-cmd one was missed, then value of --health-cmd option is used for startup health check.
--health-startup-interval=interval
Set an interval for the startup healthcheck. An interval of 0s results in no automatic timer setup. The default is 0s.
Changing this setting resets the timer, depending on the state of the container.
--health-startup-retries=retries
The number of attempts allowed before the startup healthcheck restarts the container. If set to 0, the container is never restarted. The default is 0.
--health-startup-success=retries
The number of successful runs required before the startup healthcheck succeeds and the regular healthcheck begins. A value
of 0 means that any success begins the regular healthcheck. The default is 0.
--health-startup-timeout=timeout
The maximum time a startup healthcheck command has to complete before it is marked as failed. The value can be expressed in a time
format like 2m3s. The default value is 30s.
--health-timeout=timeout
The maximum time allowed to complete the healthcheck before an interval is considered failed. Like start-period, the
value can be expressed in a time format such as 1m22s. The default value is 30s.
Note: A timeout marks the healthcheck as failed. If the healthcheck command itself runs longer than the specified timeout,
it will be sent a SIGKILL signal.
Note: This parameter will overwrite related healthcheck configuration from the image.
--latest, -l
Instead of providing the container name or ID, use the last created container.
Note: the last started container can be from other users of Podman on the host machine.
(This option is not available with the remote Podman client, including Mac and Windows
(excluding WSL2) machines)
--memory, -m=number[unit]
Memory limit. A unit can be b (bytes), k (kibibytes), m (mebibytes), or g (gibibytes).
Allows the memory available to a container to be constrained. If the host
supports swap memory, then the --memory memory setting can be larger than physical
RAM. If a limit of 0 is specified (not using --memory), the container’s memory is
not limited. The actual limit may be rounded up to a multiple of the operating
system’s page size (the value is very large, that’s millions of trillions).
This option is not supported on cgroups V1 rootless systems.
--memory-reservation=number[unit]
Memory soft limit. A unit can be b (bytes), k (kibibytes), m (mebibytes), or g (gibibytes).
After setting memory reservation, when the system detects memory contention
or low memory, containers are forced to restrict their consumption to their
reservation. So always set the value below --memory, otherwise the
hard limit takes precedence. By default, memory reservation is the same
as memory limit.
This option is not supported on cgroups V1 rootless systems.
--memory-swap=number[unit]
A limit value equal to memory plus swap.
A unit can be b (bytes), k (kibibytes), m (mebibytes), or g (gibibytes).
Must be used with the -m (--memory) flag.
The argument value must be larger than that of
-m (--memory) By default, it is set to double
the value of --memory.
Set number to -1 to enable unlimited swap.
This option is not supported on cgroups V1 rootless systems.
--memory-swappiness=number
Tune a container’s memory swappiness behavior. Accepts an integer between 0 and 100.
This flag is only supported on cgroups V1 rootful systems.
--no-healthcheck
Disable any defined healthchecks for container.
--pids-limit=limit
Tune the container’s pids limit. Set to -1 to have unlimited pids for the container. The default is 2048 on systems that support “pids” cgroup controller.
--restart=policy
Restart policy to follow when containers exit.
Restart policy does not take effect if a container is stopped via the podman kill or podman stop commands.
Valid policy values are:
no : Do not restart containers on exit
never : Synonym for no; do not restart containers on exit
on-failure[:max_retries] : Restart containers when they exit with a non-zero exit code, retrying indefinitely or until the optional max_retries count is hit
always : Restart containers when they exit, regardless of status, retrying indefinitely
unless-stopped : Restart containers when they exit, unless the container was explicitly stopped by the user. After a system reboot, containers with this policy will be restarted by podman-restart.service only if they were not explicitly stopped by the user before the reboot. This differs from always, which restarts containers after a system reboot regardless of whether they were user-stopped
Podman provides a systemd unit file, podman-restart.service, which restarts containers after a system reboot.
When running containers in systemd services, use the restart functionality provided by systemd.
In other words, do not use this option in a container unit, instead set the Restart= systemd directive in the [Service] section.
See podman-systemd.unit(5) and systemd.service(5).
--ulimit=option
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
Note: Ulimit changes apply after container restart.
--unsetenv=env
Unset environment variables from the container.
Note that the env updates only affect the main container process after
the next start.
EXAMPLES
Update a container with a new cpu quota and period:
$ podman update --cpus=0.5 ctrID
Update the latest container with a new cpu value:
$ podman update --latest --cpus=1
Update a container’s ulimit:
$ podman update --ulimit nofile=1024:1024 ctrID
Update a container with multiple options at once:
$ podman update --cpus 5 --cpuset-cpus 0 --cpu-shares 123 --cpuset-mems 0 \\
  --memory 1G --memory-swap 2G --memory-reservation 2G \\
  --blkio-weight-device /dev/sda:123 --blkio-weight 123 \\
  --device-read-bps /dev/sda:10mb --device-write-bps /dev/sda:10mb \\
  --device-read-iops /dev/sda:1000 --device-write-iops /dev/sda:1000 \\
  --pids-limit 123 ctrID
SEE ALSO
podman(1), podman-create(1), podman-run(1)
