# 13 — Volumes, mounts and secrets

## 1. Volume lifecycle and drivers

`podman volume` covers create, exists, export, import, inspect, ls/list, mount, prune, reload, rename, rm and unmount (`pages/markdown/podman-volume.1.md:7-46`). A named volume persists independently of containers; an anonymous volume (no source given) is removed with `podman rm --volumes` or the container's `--rm` (`pages/markdown/podman-run.1.md:1531-1540`, `:1562-1565`).

| Driver | Backing store | Determinism consequence |
|---|---|---|
| `local` (default) | Directory on disk; with `--opt` can call `mount(8)` for a filesystem | Mutable host state; `--opt copy` (default) copies image content into a new volume on first use (`pages/markdown/podman-volume-create.1.md:11-18`, `:28-34`) |
| `image` | Image plus an overlay filesystem | Changes can be committed as a new layer on the image (`pages/markdown/podman-volume-create.1.md:15-16`); requires `--opt image=...` (`pages/markdown/podman-volume-create.1.md:45-46`) |
| Plugin name | Volume plugin declared in `containers.conf` `volume_plugins` | Behavior and supported options are plugin-defined (`pages/markdown/podman-volume-create.1.md:17-18`, `:47`) |

Useful create controls: `--uid`/`--gid` set ownership of the mount-point directory without passing those values to `mount(8)`, unlike `--opt o=uid=...` (`pages/markdown/podman-volume-create.1.md:19-20`, `:48-49`); `--label` metadata is visible in `inspect`/`ls` (`pages/markdown/podman-volume-create.1.md:25-27`); `--ignore` is idempotent but does not apply new options to an existing volume (`pages/markdown/podman-volume-create.1.md:23-24`). For local volumes, XFS project quotas control size/inode limits and need an XFS filesystem mounted with `pquota` (`pages/markdown/podman-volume-create.1.md:50-66`).

Verbatim examples from `pages/markdown/podman-volume-create.1.md:68-81`:
```text
Create empty volume.
$ podman volume create
Create empty named volume.
$ podman volume create myvol
Create empty named volume with specified label.
$ podman volume create --label foo=bar myvol
Create tmpfs named volume with specified size and mount options.
# podman volume create --opt device=tmpfs --opt type=tmpfs --opt o=size=2M,nodev,noexec myvol
Create tmpfs named volume testvol with specified options.
# podman volume create --opt device=tmpfs --opt type=tmpfs --opt o=uid=1000,gid=1000 testvol
Create volume overriding the owner UID and GID.
# podman volume create --uid 1000 --gid 1000 myvol
Create image named volume using the specified local image in containers/storage.
# podman volume create --driver image --opt image=fedora:latest fedoraVol
```

Host-side access is via `podman volume mount`, which prints the path (`pages/markdown/podman-volume-mount.1.md:5-12`). In rootless mode only file volumes mount directly; other volume types require entering the user namespace with `podman unshare` first (`pages/markdown/podman-volume-mount.1.md:8-9`, `:17-20`).

## 2. Mount surfaces: bind, named, overlay, tmpfs

`-v/--volume` accepts `[[SOURCE-VOLUME|HOST-DIR:]CONTAINER-DIR[:OPTIONS]]`; a host path must exist, while a name that does not exist is auto-created unless `nocreate` is set (`pages/markdown/podman-run.1.md:1531-1540`, `:1555-1569`). Option list: `rw|ro`, `z|Z`, `O`, `U`, `[no]copy`, `[no]dev`, `[no]exec`, `[no]suid`, `[r]bind`, propagation modes and `idmap` (`pages/markdown/podman-run.1.md:1542-1554`). Remote clients mount paths from the **server**, not the client (`pages/markdown/podman-run.1.md:1541`).

`--mount` is the structured form; supported run-time types are `artifact`, `bind`, `devpts`, `glob`, `image`, `ramfs`, `tmpfs`, `volume` (`pages/markdown/podman-run.1.md:656-662`).
Verbatim type examples from `pages/markdown/podman-run.1.md:744-758`:
```text
type=bind,source=/path/on/host,destination=/path/in/container
type=bind,src=/path/on/host,dst=/path/in/container,relabel=shared
type=bind,src=/path/on/host,dst=/path/in/container,relabel=shared,U=true
type=bind,src=/path/on/host,dst=/path/in/container,idmap
type=bind,src=/path/on/host,dst=/path/in/container,idmap=uids=0-1-10;gids=0-100-10
type=devpts,destination=/dev/pts
type=glob,src=/usr/lib/libfoo*,destination=/usr/lib,ro=true
type=image,source=fedora,destination=/fedora-image,rw=true
type=ramfs,tmpfs-size=512M,destination=/path/in/container
type=tmpfs,tmpfs-size=512M,destination=/path/in/container
type=tmpfs,destination=/path/in/container,noswap
type=artifact,src=quay.io/libpod/testartifact:20250206-single,dst=/data
type=artifact,src=quay.io/libpod/testartifact:20250206-multi,dst=/data,title=test1
type=volume,destination=/path/in/container
type=volume,src=test_vol,dst=/data,subpath=/code/docs
```

| Surface | Lifetime / effect | When to use |
|---|---|---|
| Bind mount (`-v /host:/ctr`, `--mount type=bind`) | Host path and container see the same files (`pages/markdown/podman-run.1.md:1864-1870`) | Config files, source code; prefer `ro` when the container must not write |
| Named volume (`--mount type=volume,src=name`) | Podman-managed, persists beyond the container (`pages/markdown/podman-run.1.md:1871-1877`) | Database data, logs that must survive recreation |
| Overlay `:O` | Host dir is lower, container storage is upper; writes are discarded when the container finishes (`pages/markdown/podman-run.1.md:1629-1636`) | Share a read-only package cache with ephemeral writes |
| tmpfs / ramfs (`--mount type=tmpfs`) | In-memory, removed on stop/reboot; `tmpfs-size` and `tmpfs-mode` control size/mode; `notmpcopyup` makes it shadow parent content (`pages/markdown/podman-run.1.md:728-736`, `:1878-1884`) | Caches and transient scratch data |
| `image` mount | Read-only files from another image at a path; `subpath` selects a subtree (`pages/markdown/podman-run.1.md:709-711`) | Shared static content without copying into the final image |

SELinux relabeling: `:z` = `relabel=shared` (all containers may read/write), `:Z` = `relabel=private` (only this container); both recursively walk the tree, so large volumes delay startup, and a prior `:z` relabel avoids a second walk (`pages/markdown/podman-run.1.md:1600-1621`). All containers in a pod share one SELinux label, so `:Z` is private per **pod**, not per container (`pages/markdown/podman-run.1.md:1613-1615`). Do not relabel system directories; use `--security-opt label=disable` for those cases (`pages/markdown/podman-run.1.md:1622-1628`).

Permissions: `U`/`chown` recursively changes source ownership to the container UID/GID (`pages/markdown/podman-run.1.md:697`, `:726`, `:1844`); `--userns=keep-id` maps the host user to the same UID inside and is the clean rootless pattern for host-owned data (`pages/markdown/podman-run.1.md:1489-1494`, `:1515-1520`, `:1845-1850`). `idmap` is rootful-only because the kernel forbids idmapped filesystems for unprivileged users (`pages/markdown/podman-run.1.md:702-703`).

## 3. Secrets: runtime vs build time

Runtime secrets are managed by `podman secret` (create, exists, inspect, ls/list, rm) and injected with `--secret` (`pages/markdown/podman-secret.1.md:7-25`). A secret is sensitive data up to 512 kB, exposed either as a file (default mount at `/run/secrets/<name>`) or as an environment variable (`pages/markdown/podman-run.1.md:1100-1122`).

| `--secret` option | Effect |
|---|---|
| `type=mount|env` | File mount (default) or environment variable (`pages/markdown/podman-run.1.md:1110-1114`) |
| `target=...` | Absolute path for a mount, or env key; relative mount targets live under `/run/secrets/` (`pages/markdown/podman-run.1.md:1115-1122`) |
| `uid`, `gid`, `mode` | Owner and mode of a mounted secret; defaults 0/0/0444 (`pages/markdown/podman-run.1.md:1123-1125`) |

Secrets are written at container creation, and later changes via `podman secret` are reflected inside the running container (`pages/markdown/podman-run.1.md:1105-1109`).
A deterministic workflow (derived from the documented commands):
```bash
printf 's3cr3t' | podman secret create db-password -
podman secret inspect --format '{{.Name}}' db-password
podman run -d --name api --secret db-password,target=/run/secrets/db,mode=0400 \
  registry.example.com/team/api@sha256:<digest>
podman secret ls
podman secret rm db-password
```

Build-time secrets are different: `podman build --secret=id=...[,src=...][,env=...][,type=file|env]` feeds a secret into a `RUN --mount=type=secret,id=...` instruction, mounted at `/run/secrets/<id>` and never stored in the final image (`pages/markdown/podman-build.1.md:778-789`). `type=secret` is **not** a `podman run --mount` type — the run-time list contains artifact/bind/devpts/glob/image/ramfs/tmpfs/volume only (`pages/markdown/podman-run.1.md:656-662`, `:658`). Changing a secret file does not invalidate cached layers that used it (`pages/markdown/podman-build.1.md:790`).

## 4. Backup, restore, pruning and data determinism

`podman volume export` writes a tarball to stdout or `--output`; `podman volume import VOLUME [source]` merges tarball contents into an **existing** volume with tarball contents winning, and accepts `-` for stdin (`pages/markdown/podman-volume-export.1.md:5-14`, `pages/markdown/podman-volume-import.1.md:5-9`).
Verbatim import examples from `pages/markdown/podman-volume-import.1.md:13-18`:
```bash
Import named volume content from the specified file.
$ podman volume import myvol test.tar
Import named volume content from stdin.
$ gunzip -c hello.tar.gz | podman volume import myvol -
Export the content from named volume and pipe it into the named volume via stdin.
$ podman volume export oldmyvol | podman volume import myvol -
```

Prune defaults to **anonymous** unused volumes only; `--all` includes named ones; `--filter label!=keep` protects labeled volumes, and `--dry-run` previews (`pages/markdown/podman-volume-prune.1.md:5-16`, `:44-64`). Confirmation is skipped with `--force` (`pages/markdown/podman-volume-prune.1.md:40-41`). Treat labeled volumes as state: label every volume that must survive maintenance, then prune with `label!=`.

Data determinism rules that follow from the sources: bake immutable state into the image, not a volume; use `image`-driver volumes when changes should be committable as a layer (`pages/markdown/podman-volume-create.1.md:15-16`); use `:O` or tmpfs when writes must be discarded (`pages/markdown/podman-run.1.md:1629-1636`, `:1878-1882`); use `nocreate` to fail fast when a required named volume is missing (`pages/markdown/podman-run.1.md:1566-1570`). FUSE mounts need `allow_other` for a different container user, which removes normal FUSE protections (`pages/markdown/podman-volume-create.1.md:98-107`).

## Pitfalls

- Anonymous volumes vanish with `--rm` / `rm --volumes`; named volumes do not (`pages/markdown/podman-run.1.md:1538-1540`, `:1564-1565`).
- `volume prune` without `--all` leaves named volumes, but `--all` removes them unless they match a protective filter (`pages/markdown/podman-volume-prune.1.md:5-16`).
- `:z`/`:Z` relabeling walks every inode and can make startup slow; never relabel system directories (`pages/markdown/podman-run.1.md:1615-1625`).
- `:Z` is shared across a pod because pod containers share one SELinux label (`pages/markdown/podman-run.1.md:1613-1615`).
- `type=secret` exists for `RUN --mount` at build time, not for `podman run --mount` (`pages/markdown/podman-build.1.md:785-789`, `pages/markdown/podman-run.1.md:658`).
- `volume import` merges into a volume that must already exist and overwrites matching paths (`pages/markdown/podman-volume-import.1.md:6-9`).
- Remote clients resolve volume paths on the server, not locally (`pages/markdown/podman-run.1.md:1541`).
- Rootless `volume mount` for non-file volumes needs `podman unshare` (`pages/markdown/podman-volume-mount.1.md:8-9`, `:17-20`).

## Sources

- Captured pages: `pages/markdown/podman-volume.1.md`, `pages/markdown/podman-volume-create.1.md`, `pages/markdown/podman-volume-mount.1.md`, `pages/markdown/podman-volume-export.1.md`, `pages/markdown/podman-volume-import.1.md`, `pages/markdown/podman-volume-prune.1.md`, `pages/markdown/podman-secret.1.md`, `pages/markdown/podman-run.1.md`, `pages/markdown/podman-build.1.md`.
- https://docs.podman.io/en/latest/markdown/podman-volume.1.html
- https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- https://docs.podman.io/en/latest/markdown/podman-volume-prune.1.html
- https://docs.podman.io/en/latest/markdown/podman-secret.1.html
- https://docs.podman.io/en/latest/markdown/podman-run.1.html
- https://github.com/containers/podman/tree/055de046937d29450f310fce0fe3071485d8bed9
