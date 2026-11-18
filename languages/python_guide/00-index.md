# 00 - Index, snapshot and citation contract

This is a static, line-cited map of Python 3.15.2 and uv 0.13.9 for agents that
need a correct answer without reading the whole documentation. Start here for
the source hierarchy; jump straight to a numbered chapter for a task. Chapters
`01`-`15` cover the language, `16`-`21` cover workflow, safety and tests, `22`-`24`
synthesise decisions, and `25`-`26` measure what this guide can and cannot prove.

## 1. Snapshot

| Item | Value | Evidence |
|---|---|---|
| Python documentation | **3.15.2** | `samples/python-org-docs-index.html:6,217,219`; portal link `samples/python-org-doc-portal.html:510` |
| CPython source pin | tag `v3.15.2`, `.rst` files under `Doc/` | `VERSION`; docs site links to `github.com/python/cpython/blob/3.15/Doc/library/functools.rst` (`samples/library__functools.rst:1`) |
| uv documentation | **0.13.9**, released 2026-11-17 | installer pin `samples/getting-started__installation.md:26`, release evidence in `samples/MANIFEST-uv.md` |
| uv capability statement | package/project manager that can replace pip, pip-tools, pipx, poetry, pyenv, twine, virtualenv | `samples/llms.txt:3-10` |
| Wiki | community wiki in a new Sphinx tree with a migration warning | `samples/wiki-index.html:94,157,216` |
| Capture date | 2026-11-18 | `VERSION`; three manifests in `samples/` |
| Local smoke runtime | Python 3.15.2, uv 0.13.7 (not 0.13.9) | `VERSION`; `observed locally`, not a docs citation |

All facts from the CPython docs cite the tag-pinned `.rst` text that generated
the rendered pages. Markdown endpoints for uv are explicit: `llms.txt` says to
use `/index.md` paths to obtain clean markdown (`samples/llms.txt:12-14`).
Nothing here was inferred from a search-result snippet.

## 2. Authority ladder

When two sources disagree, use the higher row.

| Rank | Source | Use it for |
|---:|---|---|
| 1 | `docs.python.org/3` rendered docs and the tag-pinned `Doc/*.rst` captured here | Language, standard library, version gates, defaults |
| 2 | `https://docs.astral.sh/uv/` `.md` endpoints pinned at 0.13.9 | uv behaviour, flags, lockfile, workspaces, integrations |
| 3 | `https://www.python.org/doc/` | Portal: where official docs, PEPs and HOWTOs live (`samples/python-org-doc-portal.html:286,492`) |
| 4 | `https://wiki.python.org/python/...` | Orientation only: community pages may be outdated (`samples/wiki-index.html:216`) |
| — | Third-party tools (mypy, pyright, pytest, Hypothesis, structlog, ty) | `not verified` here unless a captured page mentions them; check their own docs |

The wiki moved from `/moin/` to `/python/`; python.org/doc still contains both
old and new links (`samples/python-org-doc-portal.html:280` is new-style,
`288` and `322` are legacy). Do not treat a wiki page as a current default.

## 3. Citation contract

- `samples/<file>:LINE` or `samples/<file>:A-B` points to a **byte-identical**
  capture. `samples/MANIFEST.md` lists the three per-source manifests with pins.
- Equivalent URL forms are recorded in `samples/MANIFEST.md`. Two CPython files
  moved in this tag: exceptions are `Doc/builtins/exceptions.rst` and profiling
  is `Doc/library/profile.rst`.
- `derived` marks engineering advice assembled from documented facts.
  `observed locally` marks a smoke result. `not verified` marks a claim outside
  the capture. These labels are not interchangeable.
- Code blocks are literal syntax, <= 25 lines. A block without a source is a
  `derived` example, never an assertion about an upstream API.
- The delivery checker resolves every sample token and range-checks it. A
  broken citation is a document bug, not a reader exercise.

## 4. File map

| File | Content |
|---|---|
| `00-index.md` | Snapshot, authority ladder, citation contract, map |
| `01-sources-and-version-map.md` | Three roots, version matrix, pinning, scope boundaries |
| `02-modern-language-core.md` | 3.10-3.15 syntax and version gates |
| `03-runtime-and-object-model.md` | Interpreter, GIL/free-threading, data model, memory |
| `04-functional-foundations.md` | Pure functions, iterators, generators, combinators |
| `05-immutability-and-determinism.md` | Frozen data, hashing, ordering, seeded time and randomness |
| `06-static-typing-core.md` | Generics, Protocol, narrowing, aliases, annotationlib |
| `07-static-typing-workflow.md` | Checkers, strict config, PEP 561, CI gates |
| `08-data-modeling.md` | Dataclasses, Enum, NamedTuple vs TypedDict |
| `09-errors-and-exception-groups.md` | Exception taxonomy, chaining, `except*` |
| `10-logging-and-observability.md` | Levels, handlers, structured records, redaction |
| `11-async-and-concurrency.md` | asyncio, threads, free-threading, executors |
| `12-iterators-generators-deep.md` | Generator protocol, cleanup, lazy pipelines |
| `13-performance-measurement.md` | timeit, profilers, tracemalloc, method |
| `14-performance-runtime.md` | Specialisation, JIT, GC, data-structure costs |
| `15-security-core.md` | Secrets, crypto, subprocess, paths, deserialisation |
| `16-security-supply-chain.md` | uv lock determinism, indexes, audit preview, publishing |
| `17-uv-first-steps.md` | Install, run, venv, pip interface, toolchains |
| `18-uv-projects-and-lock.md` | pyproject, lock, sync, groups, resolution |
| `19-uv-scripts-and-tools.md` | PEP 723 scripts, uvx, tool isolation |
| `20-uv-workspaces-and-integration.md` | Workspaces, Docker, CI, config precedence |
| `21-testing-for-determinism.md` | unittest, doctest, fixtures, seeding, CI |
| `22-simplification-patterns.md` | Idiomatic reductions and API shape |
| `23-standard-library-cookbook.md` | High-value stdlib recipes |
| `24-recommended-implementation.md` | Minimal verified stack, end to end |
| `25-coverage-evidence.md` | 5 topics x 20 requirements, evidence per item |
| `26-coverage-and-limits.md` | Measured surface, gaps, path to a real guarantee |

## 5. Read order

Learn: `00` → `01` → `02` → `04` → `06`. Review code: `05`, `06`, `08`, `09`,
`15`. Operate: `10`, `13`, `16`-`21`. Decide: `22`-`24`. Audit the guide itself:
`25`-`26`. For uv-only tasks start at `17` or `18`; for typing-only tasks start
at `06` or `07`.

## 6. Boundaries

This guide does not execute your program, prove a benchmark on your hardware,
or replace the live PEP index. It deliberately omits Django/FastAPI/PyTorch,
scientific computing, non-CPython implementation internals and GUI stacks.
Claims that need a live service, a credential or a network install remain
`not verified` even when the documentation describes the mechanism.

## Sources

- https://www.python.org/doc/
- https://docs.python.org/3/
- https://wiki.python.org/python/index.html
- https://peps.python.org/
- https://docs.astral.sh/uv/
- https://docs.astral.sh/uv/llms.txt
- https://github.com/python/cpython/tree/v3.15.2/Doc
- https://api.github.com/repos/astral-sh/uv/releases/latest
