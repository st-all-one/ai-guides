# 01 - Sources, versions and pinning

This chapter answers "which documentation is authoritative, which version am I
targeting, and how do I keep the answer stable?". It depends on `00` for the
citation contract and feeds every later chapter.

## 1. The three roots

| Root | What it actually provides | Captured form | Authority |
|---|---|---|---|
| `https://www.python.org/doc/` | Portal to docs by version, PEP index, HOWTOs, wiki and translations | `samples/python-org-doc-portal.html` (verbatim HTML) | Navigation, not semantics |
| `https://docs.python.org/3/` | Rendered Python 3.15.2 docs: language reference, library, WHAT'S NEW, HOWTOs | 58 tag-pinned `.rst` files + rendered index (`samples/MANIFEST-cpython.md`) | Primary for the language |
| `https://wiki.python.org/python/index.html` | Community pages: language notes, speed tips, testing and security sections | 59 captured pages, 18 shipped (`samples/MANIFEST-wiki.md`) | Orientation only |

The portal explicitly advertises "Browse Python 3.15.2 Documentation" and links
the PEP index (`samples/python-org-doc-portal.html:510,492`). The rendered index
repeats the version in its title and body (`samples/python-org-docs-index.html:6,217,219`).
The wiki's new tree is Sphinx-based (`samples/wiki-index.html:94`) and warns that
migrated MoinMoin pages "may be outdated" (`samples/wiki-index.html:216`); its
security section itself says coverage is thin (`samples/security__index.html:221`).

Astral uv is a fourth, separate authority for tooling: its `llms.txt` describes a
Rust package/project manager that can replace pip, pip-tools, pipx, poetry,
pyenv, twine and virtualenv (`samples/llms.txt:3-10`) and prescribes explicit
`.md` paths for clean markdown (`samples/llms.txt:12-14`). Fifty-five pages were
captured at 0.13.9 (`samples/MANIFEST-uv.md`); the installer pin is visible at
`samples/getting-started__installation.md:26`.

## 2. Version matrix

| Python | Documented change relevant to this guide | Evidence |
|---:|---|---|
| 3.10 | Structural pattern matching; PEP 604 union operator | `samples/whatsnew__3.10.rst:461,721` |
| 3.11 | Exception groups + `except*`; `asyncio.TaskGroup`; `asyncio.timeout` | `samples/whatsnew__3.11.rst:182,578,585` |
| 3.12 | PEP 695 type parameter syntax | `samples/whatsnew__3.12.rst:180` |
| 3.13 | Experimental free-threaded mode; experimental JIT behind a build flag | `samples/whatsnew__3.13.rst:68,365` |
| 3.14 | Deferred annotations + `annotationlib`; t-strings; free-threaded builds officially supported | `samples/whatsnew__3.14.rst:148,162,301,134` |
| 3.15 | Free-threaded Stable ABI; JIT reports 7-8% geomean gain but -15% to >100% per benchmark; `profile` deprecated | `samples/whatsnew__3.15.rst:548,2028,2035,337` |

Read the version gate before prescribing syntax. `type` aliases and PEP 695
generics require 3.12 (`samples/whatsnew__3.12.rst:180`); t-strings and deferred
annotations require 3.14 (`samples/whatsnew__3.14.rst:301,148`); an
`ExceptionGroup` handler requires 3.11 (`samples/whatsnew__3.11.rst:182`).
Deferring every annotation is only safe when the consumer uses the 3.14
introspection API (`samples/library__annotationlib.rst:18`).

## 3. Pinning rules

1. **Language facts:** cite `v3.15.2` tag sources. The docs site links to the
   `3.15` branch; the tag is immutable and therefore safer for a durable guide.
2. **Tooling facts:** cite uv 0.13.9 pages. Lockfile schema is a public API
   bumped only in minor releases, and a newer schema is rejected by older uv
   (`samples/concepts__resolution.md:728,732`). A guide that hard-codes a flag
   without the version is already stale.
3. **Community facts:** prefix `wiki, lower authority`. A wiki statement about
   generators or speed is useful context (`samples/language__Generators.html:263`,
   `samples/performance__PythonSpeed.html:259`), not a contract.
4. **Third-party tools:** mypy, pyright, basedpyright, pytest, Hypothesis, Ruff
   and ty are outside the three roots. Name them only as `not verified` unless
   a captured page mentions them explicitly; send the reader to their docs.

```python
# derived: choose a feature gate by capability, not by a guessed version
import sys

if sys.version_info >= (3, 14):
    import annotationlib
    def annotations(obj):
        return annotationlib.get_annotations(obj)
else:
    def annotations(obj):
        return getattr(obj, "__annotations__", {})
```

The check above is `derived`; the underlying version facts are cited in the
matrix. `sys._is_gil_enabled()` is the documented runtime probe for the
free-threaded build (`samples/library__sys.rst:1366`).

## 4. How to refresh this guide

1. Re-read `https://www.python.org/doc/` and the rendered `docs.python.org/3/`
   index; record the announced version before touching any syntax chapter.
2. Re-fetch the same `Doc/*.rst` paths at the new tag, byte for byte; regenerate
   the manifest; then re-check every `samples/<file>:LINE` token. Never edit a
   line number to make a citation pass — re-read and rewrite the claim.
3. Re-fetch uv via `llms.txt` and the explicit `.md` endpoints; compare the
   installer pin, release tag and lock schema notes before changing a flag.
4. Re-run the smoke script recorded in `VERSION` and update `25` and `26` with
   the exact runtime versions. A doc-only refresh must not silently upgrade
   the claimed execution evidence.

## 5. Explicitly out of scope

- Web frameworks, ORMs, async servers and the scientific stack.
- Non-CPython implementation internals; the wiki notes that multiple
  implementations exist but this guide cites CPython only
  (`samples/implementations__CPython.html:242`, wiki).
- C-API extension authoring, embedding and cross-compilation.
- Securing a specific deployment, which needs the target's own threat model.
- Any claim that a documented command was executed in production.

## Sources

- https://www.python.org/doc/
- https://docs.python.org/3/
- https://docs.python.org/3/whatsnew/3.15.html
- https://wiki.python.org/python/index.html
- https://docs.astral.sh/uv/llms.txt
- https://docs.astral.sh/uv/getting-started/installation/
- https://peps.python.org/
- https://github.com/python/cpython/tree/v3.15.2/Doc
