# 24 - Recommended Implementation

This chapter answers what the smallest dependable Python setup looks like and how to assemble it end to end. It depends on 07 (static typing workflow), 10 (logging), 16 (supply chain), 18 (uv projects and lock), and 21 (testing for determinism).

## The minimal verified stack

| Layer | Choice | Documented basis | Role |
|---|---|---|---|
| Manifest | `pyproject.toml` with `requires-python` | `samples/concepts__projects__config.md:5-15` | Declares supported interpreters |
| Lock | `uv.lock`, universal resolution | `samples/concepts__resolution.md:65` | One portable locked graph |
| Execution | `uv run` (auto lock + sync) | `samples/concepts__projects__sync.md:7` | Reproducible environment |
| CI gate | `uv sync --locked --all-extras --dev` | `samples/guides__integration__github.md:193` | Fails on a stale lockfile |
| Types | stdlib `typing` constructs | `samples/library__typing.rst:718`, `samples/library__typing.rst:2563` | Contracts at boundaries |
| Tests | `unittest.TestCase` | `samples/library__unittest.rst:715` | Deterministic assertions |
| Logs | `logging.getLogger(__name__)` | `samples/library__logging.rst:35` | Operational evidence |
| Errors | custom `Exception` subclasses | `samples/builtins__exceptions.rst:163` | Classified failure modes |

## End-to-end recipe

### 1. Manifest and lock

`requires-python` declares supported versions in `[project]` (`samples/concepts__projects__config.md:5-15`); `[build-system]` may use the native `uv_build` backend (`samples/concepts__build-backend.md:25`). `dependency-groups` is standardized but not universal across tools (`samples/concepts__projects__dependencies.md:14`).

```toml
[project]
name = "demo"
version = "0.1.0"
requires-python = ">=3.15"   # derived; docs use >=3.12 (samples/concepts__projects__config.md:15)

[build-system]
requires = ["uv_build>=0.13.9,<0.14"]  # concepts__build-backend.md:25
build-backend = "uv_build"
```

Locking resolves dependencies into `uv.lock`; syncing installs a subset into the project environment (`samples/concepts__projects__sync.md:3`). `uv run` locks and syncs automatically (`samples/concepts__projects__sync.md:7`); `--locked` errors on a stale lockfile (`samples/concepts__projects__sync.md:15`), `--frozen` uses it without checking (`samples/reference__cli.md:888`), and `--offline` disables network access (`samples/reference__cli.md:1136`).

```bash
uv init --bare                        # observed locally: succeeded (uv 0.13.7)
uv lock --offline                     # observed locally: succeeded (uv 0.13.7)
uv sync --locked --all-extras --dev   # samples/guides__integration__github.md:193
uv run --offline python -m unittest   # observed locally: succeeded (uv 0.13.7)
```

### 2. Strict typing

`Any` is the static-typing escape hatch (`samples/library__typing.rst:718`); `Protocol` expresses structural subtyping (`samples/library__typing.rst:2563`, `samples/library__typing.rst:820`). **Derived:** treat boundary `Any` as review, annotate public signatures, use `@overload` when return type depends on argument shape (`samples/library__typing.rst:3292`). Checker strict flags are **not verified** here: mypy/pyright are not captured; confirm flags before adding a CI gate.

### 3. Tests

`TestCase` is the base class (`samples/library__unittest.rst:715`); `assertEqual` and `assertRaises` (`samples/library__unittest.rst:90`, `samples/library__unittest.rst:100`) cover values and errors, and `subTest` (`samples/library__unittest.rst:815`) parameterizes cases. **Derived:** inject time and randomness as arguments so tests need no global patching.

```python
import unittest

class TestParse(unittest.TestCase):       # samples/library__unittest.rst:715
    def test_ok(self):
        self.assertEqual(parse("1"), 1)   # samples/library__unittest.rst:90

    def test_bad(self):
        with self.assertRaises(ValueError):  # :100
            parse("x")

    def test_cases(self):
        for text in ("1", "2"):
            with self.subTest(text=text):    # :815
                self.assertIsInstance(parse(text), int)
```

### 4. Logging

Use a module logger from `getLogger(__name__)` (`samples/library__logging.rst:35`), configure once with `basicConfig` (`samples/library__logging.rst:38`), and pass `%s` arguments so formatting is deferred (`samples/library__logging.rst:263-265`). DEBUG is 10 and CRITICAL is 50 (`samples/library__logging.rst:486`, `samples/library__logging.rst:504`). `Logger.exception` logs at ERROR with exception info and should be called only from an exception handler (`samples/library__logging.rst:387`).

```python
import logging
log = logging.getLogger(__name__)         # samples/library__logging.rst:35
logging.basicConfig(level=logging.INFO)   # samples/library__logging.rst:38

try:
    load()
except ConfigError:
    log.exception("load failed")          # samples/library__logging.rst:387
else:
    log.debug("path=%s", path)            # samples/library__logging.rst:263-265
```

### 5. Error taxonomy

Derive custom errors from `Exception` (`samples/builtins__exceptions.rst:163`) and catch narrowly: a `try` may use `except` or `except*`, but not both in one statement (`samples/reference__compound_stmts.rst:340`). `except Exception` catches an `ExceptionGroup` but not a `BaseExceptionGroup` (`samples/builtins__exceptions.rst:977`). **Observed locally** (Python 3.15.2): an `ExceptionGroup` with two subtypes required one `except*` clause per subtype.

```python
class ConfigError(Exception): ...         # samples/builtins__exceptions.rst:163
class ValidationError(ConfigError): ...

try:
    validate()
except ValidationError as exc:            # samples/builtins__exceptions.rst:163
    log.exception("invalid config")       # samples/library__logging.rst:387
    raise ConfigError("bad config") from exc
```

## Decision table

| Decision | Choose | Basis |
|---|---|---|
| Stale lockfile in CI | fail, do not auto-update | `samples/concepts__projects__sync.md:15` |
| Frozen build, no resolution | `--frozen` | `samples/reference__cli.md:888` |
| Air-gapped run | `--offline` | `samples/reference__cli.md:1136` |
| Dynamic boundary input | `Protocol`, then narrow | `samples/library__typing.rst:2563` (derived gate) |
| Concurrent independent failures | `ExceptionGroup` + `except*` | `samples/builtins__exceptions.rst:977` (per-subtype observed locally) |

## Anti-patterns

| Anti-pattern | Why | Basis |
|---|---|---|
| `uv run` with no `--locked` in CI | can silently refresh the lockfile | `samples/concepts__projects__sync.md:15` (derived gate) |
| `except Exception: pass` | hides failures and catches groups | `samples/builtins__exceptions.rst:977` (derived) |
| f-strings inside `log.debug` | eager formatting at disabled levels | `samples/library__logging.rst:263-265` (derived) |
| `Any` spread through core modules | removes static checking | `samples/library__typing.rst:718` (derived) |
| Mutable `default_factory=[]` | shared state across instances | `samples/library__dataclasses.rst:250` (derived) |

## Verification status

| Item | Status |
|---|---|
| `uv init --bare`, `uv lock --offline`, `uv run --offline`, PEP 723 offline run | observed locally on 2026-11-18 with Python 3.15.2, uv 0.13.7 |
| `ExceptionGroup` per-subtype `except*` | observed locally on 2026-11-18 with Python 3.15.2 |
| Doc pins `uv_build>=0.13.9,<0.14`, installer `0.13.9` | documented (`samples/concepts__build-backend.md:25`, `samples/getting-started__installation.md:26`) |
| Checker strict flags, CI secrets, registry auth | not verified in this capture |

## Sources

- https://docs.astral.sh/uv/concepts/projects/config/index.md
- https://docs.astral.sh/uv/concepts/projects/sync/index.md
- https://docs.astral.sh/uv/concepts/resolution/index.md
- https://docs.astral.sh/uv/reference/cli/index.md
- https://docs.astral.sh/uv/guides/integration/github/index.md
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/unittest.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/logging.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/builtins/exceptions.rst
