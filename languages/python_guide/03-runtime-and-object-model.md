# 03 - Runtime and Object Model

This chapter answers how CPython executes code, manages memory, exposes object behaviour and loads modules, so an agent can reason about concurrency, lifetime and attribute access. It depends on 01 for the source pin and on 02 for version gates; performance measurement is in 13-14 and concurrency in 11.

## Execution tiers

| Layer | Role | Evidence |
|---|---|---|
| Tier 1 bytecode | Ordinary specialised bytecode, inline caches | `samples/whatsnew__3.11.rst:1432`, `samples/whatsnew__3.11.rst:1607` |
| Tier 2 IR ("uops") | Internal IR produced when Tier 1 code gets hot | `samples/whatsnew__3.13.rst:394`, `samples/whatsnew__3.13.rst:396` |
| Tier 2 interpreter | Mostly a debugging aid for the pipeline | `samples/whatsnew__3.13.rst:401` |
| JIT | Translates optimised Tier 2 IR to machine code | `samples/whatsnew__3.13.rst:406` |
| Tail-call interpreter | Opcode-per-C-function dispatch instead of one big `case` | `samples/whatsnew__3.14.rst:442` |

PEP 659 introduced the specializing adaptive interpreter in 3.11 (`samples/whatsnew__3.11.rst:1432`): at runtime Python replaces common operations with specialized fast paths using type stability and inline caching (`samples/whatsnew__3.11.rst:1436-1441`). It only specializes "hot" code and can de-specialize when code is too dynamic (`samples/whatsnew__3.11.rst:1450-1452`). `derived` — benchmark warm, repeated code paths; cold one-shot code never benefits.

## JIT status

The JIT arrived experimentally in 3.13 via `--enable-experimental-jit` and "may speed up some Python programs" (`samples/whatsnew__3.13.rst:365`, `samples/whatsnew__3.13.rst:369-370`). The flag accepts values including `no`, `interpreter` and the full JIT pipeline (`samples/whatsnew__3.13.rst:382`, `samples/whatsnew__3.13.rst:387`). In 3.15, pyperformance reports a 7-8% geometric-mean gain on x86-64 Linux and 11-12% on AArch64 macOS (`samples/whatsnew__3.15.rst:2028`, `samples/whatsnew__3.15.rst:2032`), but per-benchmark results range from about 15% slower to over 100% faster (`samples/whatsnew__3.15.rst:2035`). `derived` — never promise a JIT speedup for a specific workload without measuring that workload.

## GIL versus free-threaded builds

3.13 added experimental free-threaded mode with the GIL disabled (`samples/whatsnew__3.13.rst:68`, `samples/whatsnew__3.13.rst:307-308`). It needs a different executable or a source build with `--disable-gil` (`samples/whatsnew__3.13.rst:310`, `samples/whatsnew__3.13.rst:315`); the GIL can still be enabled at runtime with `PYTHON_GIL` or `-X gil=1` (`samples/whatsnew__3.13.rst:323-325`). Detect it via `python -VV` / `sys.version` containing "experimental free-threading build" (`samples/whatsnew__3.13.rst:327-328`) or `sys._is_gil_enabled()` (`samples/library__sys.rst:1364`, added 3.13 at `samples/library__sys.rst:1369`). PEP 779 made free-threaded Python officially supported in 3.14 (`samples/whatsnew__3.14.rst:134`), and PEP 803 provided a Stable ABI for free-threaded builds in 3.15 (`samples/whatsnew__3.15.rst:548`).

```python
import sys

if hasattr(sys, "_is_gil_enabled"):
    print("GIL enabled:", sys._is_gil_enabled())
print("build:", sys.version)
```

| Check | Meaning | Evidence |
|---|---|---|
| `sys._is_gil_enabled() is True` | Classic GIL build, or GIL re-enabled at runtime | `samples/library__sys.rst:1364` |
| `"free-threading build" in sys.version` | Free-threaded interpreter binary | `samples/whatsnew__3.13.rst:327-328` |
| `concurrent.interpreters` (3.14) | Multiple interpreters no longer C-API-only | `samples/whatsnew__3.14.rst:211-212` |

## Reference counting and the cycle collector

The `gc` module is an *optional* cycle-detecting collector that supplements the reference counting already used by Python (`samples/library__gc.rst:9`, `samples/library__gc.rst:12-13`). If a program creates no reference cycles, automatic collection can be disabled with `gc.disable()` (`samples/library__gc.rst:13-15`). `gc.collect()` runs a full collection or a single generation 0-2 (`samples/library__gc.rst:38-43`). For diagnostics, `sys.getrefcount(object)` reports a reference count (`samples/library__sys.rst:949`, `samples/library__sys.rst:953`) and `sys.getallocatedblocks()` counts allocated blocks (`samples/library__sys.rst:815`).

```python
import gc, sys

gc.disable()                      # safe only with no cycles
n = sys.getrefcount(some_object)  # includes the temporary call argument
gc.collect(0)                     # collect the youngest generation
```

`derived` — treat `getrefcount()` values as relative probes, not absolute counts, because passing the object is itself a reference. `derived` — prefer weak references for caches to avoid creating cycles in the first place.

## Descriptors and `__slots__`

A descriptor is an object attribute with binding behaviour whose access is overridden by `__get__`, `__set__` or `__delete__` (`samples/reference__datamodel.rst:2540-2545`). Defining `__set__` or `__delete__` makes it a *data descriptor* (`samples/reference__datamodel.rst:2514-2515`). `__slots__` explicitly declares data members and denies creation of `__dict__` and `__weakref__` unless listed (`samples/reference__datamodel.rst:2639-2641`); the payoff is significant space savings and faster attribute lookup (`samples/reference__datamodel.rst:2643-2644`). Slots are implemented at class level by creating descriptors (`samples/reference__datamodel.rst:2676`).

| Mechanism | Effect | Evidence |
|---|---|---|
| `__get__` only | Non-data descriptor, instance dict can shadow it | `samples/reference__datamodel.rst:2541-2545` |
| `__set__` / `__delete__` | Data descriptor, takes precedence | `samples/reference__datamodel.rst:2514-2515` |
| `__slots__` | No instance `__dict__`; smaller, faster objects | `samples/reference__datamodel.rst:2639-2644` |
| `@dataclass(slots=True)` | Generated `__slots__`, new class returned | `samples/library__dataclasses.rst:201` |

## Import and module ownership

The `import` statement performs both the module search and the binding into the local namespace, whereas `__import__` and `importlib.import_module` do only the search/creation part (`samples/reference__import.rst:25-28`). A module is searched once and initialised on first import (`samples/reference__import.rst:36-38`), with `sys.modules` as the cache consulted by the machinery (`samples/reference__import.rst:28`). `importlib.import_module` is a simplifying wrapper around the lower-level functions and raises on failure (`samples/library__importlib.rst:99`, `samples/library__importlib.rst:112`, `samples/library__importlib.rst:124`); `importlib.reload` re-executes a module in its existing dictionary (`samples/library__importlib.rst:145`, `samples/library__importlib.rst:174`). `derived` — avoid `reload()` in application code: module-level globals are shared state that breaks determinism (see 05).

## Sources

- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.11.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.13.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.14.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.15.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/datamodel.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/sys.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/gc.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/importlib.rst
