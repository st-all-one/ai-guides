# Samples

Verbatim captures used by the guide's `samples/<file>:LINE` citations. No file is
edited, normalised or reformatted. Each source family has its own manifest with
exact URLs, byte counts, line counts, pin details and line-cited key facts:

| Manifest | Source | Pin | Files |
|---|---|---|---:|
| `MANIFEST-cpython.md` | CPython documentation sources (`docs.python.org/3` links to these `.rst` files) | tag `v3.15.2`, captured 2026-11-18 | 58 |
| `MANIFEST-uv.md` | uv documentation markdown endpoints from `llms.txt` | release `0.13.9`, captured 2026-11-18 | 55 |
| `MANIFEST-wiki.md` | `www.python.org/doc/` + community wiki (`wiki.python.org/python/`) | captured 2026-11-18 | 59 (18 copied here) |

## Citation rules

- `samples/<file>:LINE` and `samples/<file>:A-B` must resolve inside the copied file.
- Pin-equivalent URL form for CPython:
  `https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/<path>:LINE`.
  Two files moved in this tag: exceptions live at `Doc/builtins/exceptions.rst`
  (`builtins__exceptions.rst`) and profiling at `Doc/library/profile.rst`
  (`library__profile.rst`).
- Pin-equivalent URL form for uv:
  `https://docs.astral.sh/uv/<path>/index.md:LINE` (the explicit `.md` path
  returns clean markdown, per `llms.txt`).
- Wiki pages are community-curated and carry an "information may be outdated"
  banner; use them for orientation, not as the authority for current behaviour.
- A claim that is neither in a sample nor in an official URL is marked
  `not verified` or `derived` in the chapter; it is never presented as sourced.

## Integrity

The delivery checker resolves every sample token against these files and
range-checks it. It also checks that every row in the three source manifests
names a file that exists here. `VERSION` records the pins and the local smoke
environment; no sample was produced by executing code.
