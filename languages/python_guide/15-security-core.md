# 15 - Security Core: Randomness, Crypto, Processes and Paths

This chapter answers which standard-library primitives to use for secrets, hashing, TLS, subprocesses and filesystem paths, and which claims are outside the captured sources. It builds on chapter 03 (object model) and chapter 10 (logging redaction); it does not cover dependency provenance, which is chapter 16.

## Randomness: `secrets` for security, `random` for simulation

The two modules have explicitly different purposes. `secrets` generates cryptographically strong random numbers for passwords, account authentication and tokens (`samples/library__secrets.rst:18-20`) and should be preferred over the default PRNG in `random` (`samples/library__secrets.rst:22-24`). The `random` core generator is the Mersenne Twister, which is "completely unsuitable for cryptographic purposes" (`samples/library__random.rst:25-30`), and the module warns its generators should not be used for security (`samples/library__random.rst:44-48`).

| Need | Use | Evidence |
|---|---|---|
| Password/token bytes | `secrets.token_bytes`, `token_hex`, `token_urlsafe` | `samples/library__secrets.rst:63`, `samples/library__secrets.rst:76`, `samples/library__secrets.rst:89` |
| Uniform choice / bounded int | `secrets.choice`, `secrets.randbelow` | `samples/library__secrets.rst:43`, `samples/library__secrets.rst:47` |
| OS-backed entropy | `secrets.SystemRandom` (uses the best OS source) | `samples/library__secrets.rst:37-41` |
| Simulation only | `random.Random` instances, seedable and independent | `samples/library__random.rst:32-34` |
| Constant-time comparison | `secrets.compare_digest` | `samples/library__secrets.rst:134-141` |

Derived: any value that gates access (reset links, session ids, CSRF tokens) must come from `secrets`; a seeded `random` value is reproducible by design and therefore unsafe there.

## Hashing, HMAC and password derivation

`hashlib` exposes SHA-224/256/384/512, SHA-3, SHAKE and BLAKE2 constructors (`samples/library__hashlib.rst:20-23`, `samples/library__hashlib.rst:52-56`), but warns that MD5 and SHA1 have known collision weaknesses (`samples/library__hashlib.rst:68-72`). HMAC implements RFC 2104 and requires a fixed-size digest, so extendable-output functions such as SHAKE cannot be used with it (`samples/library__hmac.rst:11-13`).

| Function | Documented contract | Evidence |
|---|---|---|
| `hashlib.pbkdf2_hmac` | PKCS#5 PBKDF2 using HMAC as pseudorandom function | `samples/library__hashlib.rst:326-329` |
| Salt sizing | About 16+ bytes from a proper source such as `os.urandom` | `samples/library__hashlib.rst:333-335` |
| Iterations | Hundreds of thousands of SHA-256 iterations suggested as of 2022 | `samples/library__hashlib.rst:337-341` |
| `hashlib.scrypt` | scrypt KDF with `n`, `r`, `p` and `maxmem` parameters | `samples/library__hashlib.rst:360-362` |
| `hmac.compare_digest` | Reduces timing attacks versus `==` for external digests | `samples/library__hmac.rst:73-76` |

```python
import hashlib, hmac, secrets

salt = secrets.token_bytes(16)
dk = hashlib.pbkdf2_hmac("sha256", b"password", salt, 500_000)
stored = hmac.compare_digest(dk, dk)  # constant-time verification
token = secrets.token_urlsafe(32)     # transportable secret
```

Derived: store salt and iteration count alongside the derived key, use `compare_digest` for any attacker-supplied MAC or token, and never substitute a plain SHA digest for a KDF when deriving keys from passwords.

## TLS: use the secure-default constructor

`ssl.create_default_context()` returns a context with secure default settings (`samples/library__ssl.rst:77-80`); those settings include `PROTOCOL_TLS_CLIENT`/`PROTOCOL_TLS_SERVER`, no SSLv2/SSLv3, high cipher suites without RC4 or unauthenticated suites (`samples/library__ssl.rst:140-143`). `PROTOCOL_TLS_CLIENT` sets `CERT_REQUIRED` and enables `check_hostname` by default (`samples/library__ssl.rst:534-537`); passing `Purpose.SERVER_AUTH` sets `verify_mode` to `CERT_REQUIRED` and loads CA certificates (`samples/library__ssl.rst:143-147`). The module warns that using it without reading its security section may create a false sense of security (`samples/library__ssl.rst:29-31`). Derived: start from `create_default_context()` and weaken settings only with a documented reason.

## Subprocess: keep the shell out

`subprocess` does not implicitly invoke a shell, so shell metacharacters can be passed safely as argument list elements (`samples/library__subprocess.rst:760-762`). If `shell=True` is used, the application is responsible for quoting whitespace and metacharacters to avoid shell injection, with `shlex.quote` available on some platforms (`samples/library__subprocess.rst:763-766`).

```python
import subprocess

# Safe: arguments are passed directly, no shell parses them.
result = subprocess.run(["ls", "-l", "/tmp"], capture_output=True, check=True)
```

Derived: pass an argument list with `shell=False` (the default), validate the executable path, and never build the list by concatenating untrusted input into a single string.

## Paths: resolve before trusting

`Path.resolve()` makes a path absolute and resolves symlinks (`samples/library__pathlib.rst:974-976`); the docs recommend resolving first when walking an arbitrary path upwards, specifically to remove symlinks and `..` components (`samples/library__pathlib.rst:440-442`). `PurePath.is_relative_to()` provides a containment check (`samples/library__pathlib.rst:541`). Derived: to serve a file under a base directory, resolve both the base and the user path, then verify containment before opening — a raw prefix string comparison is not a boundary check.

## Deserialisation: explicitly not verified

`library__pickle.rst` and the wiki `libraries__UsingPickle.html` are **not present in the capture**, so the usual "do not unpickle untrusted data" rule is marked **not verified** here rather than attributed to a line. The community wiki security hub is itself **thin** and defers to the Python Security Response Team and project docs (`samples/security__index.html:221` — **wiki, lower authority**). Derived policy: keep serialization formats data-only (for example `json`) at trust boundaries and treat any object-reconstructing format as a remote-code-execution surface until verified against current documentation.

## Validation, env secrets and redaction

3.14 t-strings preserve interpolations at runtime, which makes `Template` instances useful for sanitising user input (`samples/whatsnew__3.14.rst:354-355`). Derived: use that separation to escape interpolated values instead of concatenating them into a query or HTML string. Reading secrets from environment variables and keeping them out of logs is **derived** engineering advice, not a documented library guarantee: inject configuration at startup, wrap values in a small secret type, and redact at the logging filter (chapter 10) rather than at each call site.

| Boundary | Documented primitive | Status |
|---|---|---|
| Untrusted text escaping | 3.14 template strings | `samples/whatsnew__3.14.rst:354-355` |
| Secret transport | `secrets.token_urlsafe` | `samples/library__secrets.rst:89` |
| Untrusted object deserialisation | none captured | not verified |
| Env-var secret handling / log redaction | none captured | derived |

## Sources

- https://docs.python.org/3/library/secrets.html
- https://docs.python.org/3/library/random.html
- https://docs.python.org/3/library/hashlib.html
- https://docs.python.org/3/library/hmac.html
- https://docs.python.org/3/library/ssl.html
- https://docs.python.org/3/library/subprocess.html
- https://docs.python.org/3/library/pathlib.html
- https://wiki.python.org/python/security/index.html (community wiki, lower authority; thin)
