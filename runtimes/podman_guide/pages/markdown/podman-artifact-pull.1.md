NAME
podman-artifact-pull - Pulls an artifact from a registry and stores it locally
SYNOPSIS
podman artifact pull [options] source
DESCRIPTION
podman artifact pull copies an artifact from a registry onto the local machine.
SOURCE
SOURCE is the location from which the artifact image is obtained.
# Pull from a registry
$ podman artifact pull quay.io/foobar/artifact:special
OPTIONS
--authfile=path
Path of the authentication file. Default is ${XDG_RUNTIME_DIR}/containers/auth.json on Linux, and $HOME/.config/containers/auth.json on Windows/macOS.
The file is created by podman login. If the authorization state is not found there, $HOME/.docker/config.json is checked, which is set using docker login.
Note: There is also the option to override the default path of the authentication file by setting the REGISTRY_AUTH_FILE environment variable. This can be done with export REGISTRY_AUTH_FILE=path.
--cert-dir=path
Use certificates at path (*.crt, *.cert, *.key) to connect to the registry. (Default: /etc/containers/certs.d)
For details, see containers-certs.d(5).
(This option is not available with the remote Podman client, including Mac and Windows (excluding WSL2) machines)
--creds=[username[:password]]
The [username[:password]] to use to authenticate with the registry, if required.
If one or both values are not supplied, a command line prompt appears and the
value can be entered. The password is entered without echo.
Note that the specified credentials are only used to authenticate against
target registries. They are not used for mirrors or when the registry gets
rewritten (see containers-registries.conf(5)); to authenticate against those
consider using a containers-auth.json(5) file.
--decryption-key=key[:passphrase]
The [key[:passphrase]] to be used for decryption of images. Key can point to keys and/or certificates. Decryption is tried with all keys. If the key is protected by a passphrase, it is required to be passed in the argument and omitted otherwise.
--quiet, -q
Suppress informational output messages (which indicate which instruction is being processed, and the progress of the instruction). Print only the final error message or successful completion information, such as the image or container ID.
--retry=attempts
Number of times to retry pulling or pushing images between the registry and
local storage in case of failure. Default is 3.
--retry-delay=duration
Duration of delay between retry attempts when pulling or pushing images between
the registry and local storage in case of failure. The default is to start at two seconds and then exponentially back off. The delay is used when this value is set, and no exponential back off occurs.
--tls-verify
Require HTTPS and verify certificates when contacting registries (default: true).
If explicitly set to true, TLS verification is used.
If set to false, TLS verification is not used.
If not specified, TLS verification is used unless the target registry
is listed as an insecure registry in containers-registries.conf(5)
EXAMPLES
Pull an artifact from a registry
$ podman artifact pull quay.io/baude/artifact:josey
Getting image source signatures
Copying blob e741c35a27bb done   |
Copying config 44136fa355 done   |
Writing manifest to image destination
SEE ALSO
podman(1), podman-artifact(1), podman-login(1), containers-certs.d(5)
Troubleshooting
See podman-troubleshooting(7)
for solutions to common issues.
