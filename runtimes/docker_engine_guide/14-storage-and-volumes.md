# 14 - storage-and-volumes

Mount choice decides where data lives, who can see it, and whether it survives container replacement. Prefer named volumes for persistent application state.

## Mount types

| Type | Persistence and scope |
|---|---|
| Volume | Managed by Docker; outside container lifecycle; host-independent; backup/migration friendly |
| Bind mount | Host directory or file, tied to host layout; writable by default |
| tmpfs | Host memory only; removed when the container stops; Linux only |
| Image mount | Read-only content from an image in the daemon store |

Volumes ease backup and migration, work on Linux and Windows, can be shared safely, can be pre-populated, and suit high-performance I/O; they are poor when the host must access files directly. `pages/engine/storage/volumes.md:14-30` Bind mounts are for source code, generated host files, and host configuration, but grant host write access by default, are created on the daemon host (not the client), and tie the container to a host directory structure. `pages/engine/storage/bind-mounts.md:10-66` Use `readonly`/`ro` to block writes. `pages/engine/storage/bind-mounts.md:39-50`

tmpfs data is not persisted, is not shareable between containers, and counts against the container memory limit (`--memory`, Compose `mem_limit`): a larger `size=` does not add RAM, and Linux tmpfs may spill to swap. `pages/engine/storage/tmpfs.md:4-52` Image mounts are always read-only and need a source image already in the daemon image store. `pages/engine/storage/image-mounts.md:21-55`

## Named volume lifecycle

A volume's contents outlive its containers: removing a container does not remove the volume, and an unused volume remains until explicitly pruned. `pages/engine/storage/volumes.md:48-57` Anonymous volumes get unique random names and persist unless the container was created with `--rm`; they are not automatically shared or reused. `pages/engine/storage/volumes.md:80-93` `docker volume prune` removes unused local volumes, by default only anonymous ones; `--all` includes named volumes and `--filter` restricts by label. `pages/reference/cli/docker/volume/prune.md:16-28` `docker volume inspect` returns volume details as JSON. `pages/reference/cli/docker/volume/inspect.md:16-22`

Mounting a non-empty volume over existing container files obscures them; an empty volume is populated from the container path unless `volume-nocopy` is set. `pages/engine/storage/volumes.md:59-78` Compose creates a declared volume on `up` if missing and reuses or recreates it if deleted outside Compose. `pages/reference/compose-file/volumes.md:41-43` `external: true` means Compose does not create the volume and errors if it is absent, and other attributes except `name` are rejected. `pages/reference/compose-file/volumes.md:87-108` Compose labels named volumes with `com.docker.compose.project` and `com.docker.compose.volume`; labels do not apply to bind mounts. `pages/reference/compose-file/volumes.md:110-138`

## Drivers, options, and quotas

`docker volume create` defaults to the `local` driver, accepts `--label`, `-o/--opt` driver options, and Swarm cluster-volume options such as `--limit-bytes` and `--sharing`. `pages/reference/cli/docker/volume/create.md:18-38` Volume names are unique among drivers; reusing a name on the same driver reuses the existing volume. `pages/reference/cli/docker/volume/create.md:61-70` On Linux and Docker Desktop the `local` driver takes mount-like options; a tmpfs volume with a size cap uses `--opt type=tmpfs --opt device=tmpfs --opt o=size=100m,uid=1000`. `pages/reference/cli/docker/volume/create.md:72-103`

Compose volumes accept `driver`, `driver_opts`, `external`, `labels`, and `name`; `name` is used as-is and is not project-scoped. `pages/reference/compose-file/volumes.md:45-83,140-169` A named bind mount uses `driver: local` with `driver_opts` `type: none`, `o: bind`, and an absolute, pre-existing `device` host path. `pages/reference/compose-file/volumes.md:73-85` Third-party drivers can target network storage; `docker volume create` with a driver also works when a container first requests an uncreated volume. `pages/engine/storage/volumes.md:512-518`

Backup and restore use `--volumes-from` to attach the volume to a helper container and tar it through a host bind mount, enabling automated backup, migration, and restore testing. `pages/engine/storage/volumes.md:714-758` A volume can be mounted read-write for some containers and read-only for others simultaneously. `pages/engine/storage/volumes.md:391-401`

## Permissions and deterministic mounts

Service `volumes` long syntax keys are `type` (`volume`, `bind`, `tmpfs`, `image`, `npipe`, `cluster`), `source`, `target`, `read_only`, `bind` (`propagation`, `create_host_path` default true, `selinux` `z`/`Z`), `volume` (`nocopy`, `subpath`), `tmpfs` (`size`, `mode`), and `image` (`subpath`). `pages/reference/compose-file/services.md:2264-2274,2331-2354` Short syntax is `VOLUME:CONTAINER_PATH[:ACCESS_MODE]` with `rw`/`ro` and SELinux `z`/`Z`; relative host paths work only with a local runtime and should start with `.` or `..`. `pages/reference/compose-file/services.md:2302-2329` Short-syntax bind mounts create a missing host directory unless long syntax sets `create_host_path: false`. `pages/reference/compose-file/services.md:2326-2329` Service `tmpfs` accepts per-mount `mode`, `uid`, and `gid`. `pages/reference/compose-file/services.md:2195-2210`

## Storage driver and image layers

Docker Engine 29.0+ defaults to the containerd image store for fresh installs; upgraded daemons keep their classic driver. `pages/engine/storage/drivers/select-storage-driver.md:9-15` On Linux, `containerd` snapshotters are the default, `overlay2` is the widely compatible classic driver, `fuse-overlayfs` targets rootless hosts without rootless `overlay2`, `btrfs`/`zfs` add snapshots with more setup, and `vfs` is for testing. `pages/engine/storage/drivers/select-storage-driver.md:29-37` On Windows the only supported driver is `windowsfilter`. `pages/engine/storage/drivers/select-storage-driver.md:23-27`

`overlay2` unions `lowerdir` and `upperdir` through `merged` and supports up to 128 lower layers; image layers live under `/var/lib/docker/overlay2`, with short identifiers in the `l` directory as symlinks to avoid mount-argument size limits. `pages/engine/storage/drivers/overlayfs-driver.md:100-111,113-137` Never manipulate files under `/var/lib/docker/` directly. `pages/engine/storage/drivers/overlayfs-driver.md:118-122`

OverlayFS shares page-cache entries across containers reading the same file, which favors high-density use; first writes to a lower-layer file trigger copy-up latency, and subsequent writes stay in the upper layer. `pages/engine/storage/drivers/overlayfs-driver.md:400-413` Volumes bypass the storage driver and give the most predictable performance for write-heavy workloads. `pages/engine/storage/drivers/overlayfs-driver.md:423-429` OverlayFS implements only a subset of POSIX semantics and can break applications relying on full behavior. `pages/engine/storage/drivers/overlayfs-driver.md:431-440`

## Sources

- https://docs.docker.com/engine/storage/volumes/
- https://docs.docker.com/engine/storage/bind-mounts/
- https://docs.docker.com/engine/storage/tmpfs/
- https://docs.docker.com/engine/storage/image-mounts/
- https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- https://docs.docker.com/reference/compose-file/volumes/
- https://docs.docker.com/reference/compose-file/services/
- https://docs.docker.com/reference/cli/docker/volume/create/
- https://docs.docker.com/reference/cli/docker/volume/prune/
- https://docs.docker.com/reference/cli/docker/volume/inspect/
