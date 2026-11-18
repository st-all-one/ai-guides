---
name: python-moderno
description: >
  Python 3.15.2 and uv 0.13.9: modern language features (3.10-3.15), functional
  and deterministic patterns, static typing, frozen data models, exception
  groups, structured logging, async/free-threaded concurrency, measurement and
  runtime performance, secrets and supply-chain security, reproducible uv locks
  and scripts, workspaces, CI integration, simplification cookbook and an
  auditable coverage checklist. Load when writing, reviewing, typing, testing,
  profiling, securing, packaging or running modern Python code or uv projects.
category: languages
version: "3.15.2 / uv 0.13.9"
tags: [python, python3, uv, typing, functional, determinism, immutability, dataclasses, asyncio, logging, errors, performance, security, reproducibility, pep723, pyproject, pytest-like-testing]
license: MIT
---

# Python 3.15.2 + uv 0.13.9

**Baseline:** official docs captured 2026-11-18. Python docs announce 3.15.2
(`samples/python-org-docs-index.html:6,217,219`); CPython sources are pinned at
tag `v3.15.2`; uv docs and release are 0.13.9
(`samples/getting-started__installation.md:26`). Community wiki pages are marked
lower authority (`samples/wiki-index.html:216`). Local smoke ran Python 3.15.2
with uv 0.13.7 — see `VERSION` for the exact boundary.

**Load when:** choosing syntax by version gate, typing a public API, removing
mutable global state, classifying failures, designing log records, measuring
performance, hardening a pipeline, or making an environment reproducible with
`uv.lock`.

## Use When

- Write or review Python 3.10-3.15 code with modern typing and functional idioms
- Decide dataclass / NamedTuple / TypedDict / Protocol / Enum shapes
- Classify exceptions, use `except*`, log with redaction and correlation ids
- Choose asyncio vs threads vs processes vs free-threaded builds
- Profile, benchmark and optimise with evidence rather than intuition
- Pin, lock and reproduce Python environments and scripts with uv
- Audit dependencies, publishing and supply-chain behaviour
- Answer "what is actually covered by this guide?" with measured evidence

## Core Rules

1. **Gate syntax by version.** PEP 695 type parameters need 3.12
   (`samples/whatsnew__3.12.rst:180`); t-strings and deferred annotations need
   3.14 (`samples/whatsnew__3.14.rst:301,148`); `except*` needs 3.11
   (`samples/whatsnew__3.11.rst:182`).
2. **Prefer immutable data.** `@dataclass(frozen=True, slots=True)` generates
   `__slots__` and, with `eq=True`, a `__hash__`
   (`samples/library__dataclasses.rst:46,201,165`). Inject clocks and seeds
   instead of reading globals.
3. **Iterables over materialised lists.** Generators are resumable functions
   (`samples/howto__functional.rst:449`; wiki context at
   `samples/language__Generators.html:263`); build lazy pipelines with
   `itertools` recipes (`samples/library__itertools.rst:802`).
4. **Type the boundary, not every local.** `Protocol` is structural subtyping —
   static duck typing (`samples/library__typing.rst:255,820`); `Any` is the
   documented escape hatch, not a default (`samples/library__typing.rst:718`).
5. **Never swallow `BaseException`.** `except Exception` misses
   `BaseExceptionGroup` (`samples/builtins__exceptions.rst:977`); a `try` cannot
   mix `except` and `except*` (`samples/reference__compound_stmts.rst:340`).
6. **Log lazily and redact.** Use `%`-style deferred formatting; keep secrets
   out of records; add a correlation id. `logging` levels are numeric
   (`samples/library__logging.rst:486,504`).
7. **Security primitives are not interchangeable.** `secrets` is for tokens
   (`samples/library__secrets.rst:22`); `random` models and simulates
   (`samples/library__random.rst:11`). `subprocess` never implicitly opens a
   shell, but `shell=True` transfers quoting responsibility to you
   (`samples/library__subprocess.rst:760,763`).
8. **Optimise after measuring.** Use `timeit`/`profiling`/`tracemalloc`; the
   3.15 JIT reports 7-8% geomean gain yet -15% to >100% per benchmark
   (`samples/whatsnew__3.15.rst:2028,2035`).
9. **Make environments reproducible.** `uv run` locks and syncs before invoking
   a command (`samples/concepts__projects__sync.md:7`); `--locked` fails on a
   stale lockfile (`samples/concepts__projects__sync.md:15`) while `--frozen`
   skips the check (`samples/concepts__projects__sync.md:20`).
10. **Lockfiles are universal, not machine-specific.** `uv.lock` is portable
    across OS, architecture and Python version
    (`samples/concepts__resolution.md:65`); do not hand-edit it per host.
11. **Keep config precedence explicit.** CLI > environment > persistent config
    (`samples/concepts__configuration-files.md:49`); `uv.toml` beats
    `pyproject.toml` in the same directory
    (`samples/concepts__configuration-files.md:37`).
12. **Treat preview as preview.** `uv audit` and on-sync malware checks are
    preview features (`samples/concepts__preview.md:77`); do not build a
    compliance claim on them.

## Core Patterns

```python
# Typed, immutable boundary model (3.12+)
from dataclasses import dataclass, field

type UserId = int                       # PEP 695 alias: 3.12+

@dataclass(frozen=True, slots=True, kw_only=True)
class User:
    id: UserId
    tags: tuple[str, ...] = ()

def active(users: list[User]) -> tuple[User, ...]:
    return tuple(u for u in users if u.tags)

# Failure classification: one except* per group member
try:
    raise ExceptionGroup("batch", [ValueError("a"), TypeError("b")])
except* ValueError as eg:
    print("validation", len(eg.exceptions))
except* TypeError as eg:
    print("type", len(eg.exceptions))
```

```bash
# Reproducible run: no implicit lock update
uv sync --locked
uv run --locked python -m unittest discover -s tests
uv run --frozen python -c "import sys; print(sys.version)"
```

```python
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
print("PEP 723 metadata makes uv run self-contained")
```

## File Map

| File | Content |
|---|---|
| `00-index.md` | Snapshot, authority ladder, citation contract, map |
| `01-sources-and-version-map.md` | Roots, version matrix, pinning, refresh |
| `02-modern-language-core.md` | 3.10-3.15 syntax and version gates |
| `03-runtime-and-object-model.md` | Interpreter, GIL/free-threading, data model |
| `04-functional-foundations.md` | Pure functions, iterators, generators, combinators |
| `05-immutability-and-determinism.md` | Frozen data, hashing, seeded randomness/time |
| `06-static-typing-core.md` | Generics, Protocol, narrowing, annotationlib |
| `07-static-typing-workflow.md` | Checkers, strict config, PEP 561, CI |
| `08-data-modeling.md` | Dataclasses, Enum, NamedTuple vs TypedDict |
| `09-errors-and-exception-groups.md` | Taxonomy, chaining, `except*` |
| `10-logging-and-observability.md` | Levels, handlers, structured records, redaction |
| `11-async-and-concurrency.md` | asyncio, threads, free-threading, executors |
| `12-iterators-generators-deep.md` | Generator protocol, cleanup, lazy pipelines |
| `13-performance-measurement.md` | timeit, profilers, tracemalloc, method |
| `14-performance-runtime.md` | Specialisation, JIT, GC, data-structure costs |
| `15-security-core.md` | Secrets, crypto, subprocess, paths, deserialisation |
| `16-security-supply-chain.md` | uv locks, indexes, audit preview, publishing |
| `17-uv-first-steps.md` | Install, run, venv, pip interface, toolchains |
| `18-uv-projects-and-lock.md` | pyproject, lock, sync, groups, resolution |
| `19-uv-scripts-and-tools.md` | PEP 723 scripts, uvx, tool isolation |
| `20-uv-workspaces-and-integration.md` | Workspaces, Docker, CI, config precedence |
| `21-testing-for-determinism.md` | unittest, doctest, fixtures, seeding, CI |
| `22-simplification-patterns.md` | Idiomatic reductions and API shape |
| `23-standard-library-cookbook.md` | High-value stdlib recipes |
| `24-recommended-implementation.md` | Minimal verified stack, end to end |
| `25-coverage-evidence.md` | 5 topics x 20 requirements with evidence |
| `26-coverage-and-limits.md` | Surface, gaps, path to a real guarantee |
| `samples/` | Byte-identical captures + three source manifests |

## Read Order

Start `00` → `01`. Language work: `02`, `04`, `06`, `08`, `09`. Production:
`05`, `10`, `11`, `15`, `21`. Speed: `13` → `14`. Tooling: `17` → `18` → `19`
→ `20`. Decide: `22` → `23` → `24`. Audit: `25` → `26`.

## Prereqs

Python 3.11+ for the examples using `except*`; 3.12+ for PEP 695; 3.14+ for
t-strings and deferred annotations. uv on PATH for chapters `16`-`20`. No
third-party checker is required for the stdlib recipes; checker setup in `07`
is `derived` and points to each tool's own documentation.
