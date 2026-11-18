What is Podman?
Podman is a daemonless, open source, Linux native tool designed to make it easy to find, run, build, share and deploy applications using Open Containers Initiative (OCI) Containers and Container Images. Podman provides a command line interface (CLI) familiar to anyone who has used the Docker Container Engine. Most users can simply alias Docker to Podman (alias docker=podman) without any problems. Similar to other common Container Engines (Docker, CRI-O, containerd), Podman relies on an OCI compliant Container Runtime (runc, crun, runv, etc) to interface with the operating system and create the running containers. This makes the running containers created by Podman nearly indistinguishable from those created by any other common container engine.
Containers under the control of Podman can either be run by root or by a non-privileged user. Podman manages the entire container ecosystem which includes pods, containers, container images, and container volumes using the libpod library. Podman specializes in all of the commands and functions that help you to maintain and modify OCI container images, such as pulling and tagging. It allows you to create, run, and maintain those containers and container images in a production environment.
There is a RESTFul API to manage containers. We also have a remote Podman client that can interact with
the RESTFul service. We currently support clients on Linux, Mac, and Windows. The RESTFul service is only
supported on Linux.
If you are completely new to containers, we recommend that you check out the Introduction. For power users or those coming from Docker, check out our Tutorials. For advanced users and contributors, you can get very detailed information about the Podman CLI by looking at our Commands page. Finally, for Developers looking at how to interact with the Podman API, please see our API documentation Reference.
Contents:
Introduction
Commands
Reference
Tutorials
Search
Podman Python
