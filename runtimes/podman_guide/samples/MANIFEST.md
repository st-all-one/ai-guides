# Samples — provenance and integrity

Source snapshot: `podman-container-tools/podman` @ `v6.2.0`, commit
`055de046937d29450f310fce0fe3071485d8bed9` (tag published 2026-11-10). Every file below is a
**byte-exact** copy of a file in that snapshot; the verifier checks SHA-256 and `cmp` against the
origin when the snapshot is available. Never edit a sample, never add a header.

| Sample | Origin in snapshot | SHA-256 | Why it is critical |
|---|---|---|---|
| `containers.conf` | `vendor/go.podman.io/common/pkg/config/containers.conf` | `4ed5e169e9bb20089bceede07dca6e0dc91176f7df01699b31f68c3f78e305d3` | Default engine/runtime/containers/network values; the single source for deterministic config |
| `storage.conf` | `vendor/go.podman.io/storage/storage.conf` | `322dffd5a543bb9e1ca9c67cc56999c62b746118674d004180fe60dddfc21979` | Graph root, runroot, overlay options, `mount_program` |
| `policy.json` | `test/policy.json` | `19fad0b878a431254a159fd2d0ed4ca05b577ddf19de6d3f3f92f88f33dbff05` | Minimal image signature policy example (test fixture, not a production policy) |
| `registries.conf` | `test/registries.conf` | `50623aa8f28f4518dd4876e5c65186c5c94cab54eef7347a6df19fc22d82322f` | Registry blocking/mirror syntax (test fixture) |
| `rootless_tutorial.md` | `docs/tutorials/rootless_tutorial.md` | `e5f815aca66b71e2824991f01944c9e472245b253bf82f0ec8ee5b24c6abea21` | subuid/subgid, pasta, XDG paths, unshare, migrate, rootless limits |
| `podman-compose.1.md.in` | `docs/source/markdown/podman-compose.1.md.in` | `23400b5c1d2bc7bcbe250e8aab26d47984aab7c730357e8dab63aa4fa773958b` | `podman compose` is a wrapper; provider precedence and env knobs |
| `podman-run.1.md.in` | `docs/source/markdown/podman-run.1.md.in` | `1f5cd4b3cd3b5fb5a457e8ab75ee9e7675241c1966ab1ea247009f9925201269` | Full modern run-flag surface (parse-time source of `podman-run(1)`) |
| `podman-build.1.md.in` | `docs/source/markdown/podman-build.1.md.in` | `deab71ae2a6efdade09ab14d1e95e71f29b782df6abc3771f175fdab5d46c54d` | Build flags, cache, layers, platform, secrets, determinism levers |
| `podman-quadlet-basic-usage.7.md` | `docs/source/markdown/podman-quadlet-basic-usage.7.md` | `f9f34ea13e0db08e76fed3ff621f73577a91876b428a255dec5385f6549348c0` | Canonical Quadlet unit examples and install paths |
| `podman-systemd.unit.5.md` | `docs/source/markdown/podman-systemd.unit.5.md` | `0d35fd3358a5d052a2d13f1edff3cca39587103ead920cab35fe4a61115b7051` | All Quadlet unit types and keys |
| `podman-container.unit.5.md.in` | `docs/source/markdown/podman-container.unit.5.md.in` | `555d4f636ca3bc5116a56508eea6d28971c0d95a3eb915be88a64bd9893eae5b` | `.container` unit key reference |
| `podman-network.unit.5.md.in` | `docs/source/markdown/podman-network.unit.5.md.in` | `f4893d276ec9ed974ac282b492aaa829ba58ca93b84194be6b193e39682ffad3` | `.network` unit key reference |

`pages/installation.md` is a **derived text extraction** of
`https://podman.io/docs/installation` (481 non-empty lines, captured 2026-11-18); it is not a
byte-exact sample and is therefore listed here separately, without a hash claim against the repo.
All other `pages/*.md` files are derived text extractions of the corresponding
`https://docs.podman.io/en/latest/<path>.html` pages, mapped by identical relative path.
