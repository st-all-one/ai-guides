NAME
podman-artifact - Manage OCI artifacts
SYNOPSIS
podman artifact subcommand
DESCRIPTION
podman artifact is a set of subcommands that manage OCI artifacts.
OCI artifacts are a common way to distribute files that are associated with OCI images and
containers. Podman is capable of managing (pulling, inspecting, pushing) these artifacts
from its local “artifact store”.
COMMANDS
Command
Man Page
Description
add
podman-artifact-add(1)
Add an OCI artifact to local artifact store
exists
podman-artifact-exists(1)
Check if an OCI artifact exists in local storage
extract
podman-artifact-extract(1)
Extract an OCI artifact to a local path
inspect
podman-artifact-inspect(1)
Inspect an OCI artifact
ls
podman-artifact-ls(1)
List OCI artifacts in local store (alias list)
pull
podman-artifact-pull(1)
Pulls an artifact from a registry and stores it locally
push
podman-artifact-push(1)
Push an OCI artifact from local storage to an image registry
rm
podman-artifact-rm(1)
Remove one or more OCI artifacts from local storage
SEE ALSO
podman(1)
