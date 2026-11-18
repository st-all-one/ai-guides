# 14 - Performance and Runtime Costs

This chapter answers where CPython 3.15 spends time and memory, and which 3.14/3.15 runtime changes alter that picture. It depends on chapter 03 (runtime and object model) for the GIL/GC vocabulary and chapter 13 (measurement) for how to confirm a bottleneck before applying anything here.

## Execution model: adaptive, then optionally JIT

CPython does not execute the same bytecode indefinitely. PEP 659 introduced a specializing adaptive interpreter that replaces operations with faster type-specific forms when code is "hot" and de-specializes when behaviour changes (`samples/whatsnew__3.11.rst:1451`, `samples/whatsnew__3.11.rst:1452`); specialization uses inline caching and superinstructions (`samples/whatsnew__3.11.rst:1441`, `samples/whatsnew__3.11.rst:1447`). This is the baseline in every current build, so "interpreted" no longer means "unspecialized".

| Layer | Verified fact | Evidence | Consequence |
|---|---|---|---|
| Tier 1 adaptive interpreter | Specializes hot code, de-specializes dynamic code | `samples/whatsnew__3.11.rst:1450-1455` | Warm-up matters; one-shot code is not specialized |
| Tier 2 IR | Hot Tier 1 bytecode becomes internal micro-ops ("uops") | `samples/whatsnew__3.13.rst:392-397` | Added only when code is hot enough |
| Tier 2 interpreter | Exists mostly for debugging the pipeline | `samples/whatsnew__3.13.rst:401-403` | Not a production speed setting |
| JIT | Experimental, enabled with `--enable-experimental-jit` | `samples/whatsnew__3.13.rst:365-370` | Opt-in build, not the default |
| JIT in 3.14 | Binary releases for Windows/macOS support the experimental JIT | `samples/whatsnew__3.14.rst:135-137` | Available without a custom build on those platforms |

The measured JIT spread in 3.15 is wide enough that it must not be quoted as a single number. pyperformance reports a 7–8% geometric-mean improvement on x86-64 Linux (`samples/whatsnew__3.15.rst:2028`) and 11–12% on AArch64 macOS versus the tail-calling interpreter (`samples/whatsnew__3.15.rst:2032`), while individual benchmarks range from roughly 15% *slowdown* to over 100% speedup (`samples/whatsnew__3.15.rst:2035`). Derived: treat the geometric mean as a planning hint and benchmark your own workload before enabling the JIT.

## Free-threaded builds have a real cost

| Build state | Verified fact | Evidence |
|---|---|---|
| 3.13 | Free-threaded mode added experimentally (PEP 703), GIL disabled | `samples/whatsnew__3.13.rst:68` |
| 3.14 | Officially supported but still optional (PEP 779) | `samples/whatsnew__3.14.rst:3221-3226` |
| 3.14 single-thread cost | Penalty "roughly 5-10%" versus the GIL build | `samples/whatsnew__3.14.rst:489-490` |
| 3.14 specialization | Adaptive interpreter now enabled in free-threaded mode | `samples/whatsnew__3.14.rst:486-488` |
| 3.15 C extensions | Stable ABI for free-threaded builds (`abi3t`, PEP 803) | `samples/whatsnew__3.15.rst:548-553` |

You can detect the active mode at runtime: `sys._is_gil_enabled()` returns a boolean (`samples/library__sys.rst:1364-1368`). Derived: pay the 5–10% single-thread tax only when thread parallelism actually pays for it; do not enable free-threading by default for sequential services.

## Memory: reference counting first, cycles second

The `gc` module supplements reference counting rather than replacing it; it can be disabled if a program creates no reference cycles (`samples/library__gc.rst:9-15`). Three generations exist, with allocation-minus-deallocation counts against `threshold0` triggering a generation-0 collection (`samples/library__gc.rst:123-136`). Instrumentation primitives are `sys.getrefcount()` — whose result is one higher than expected because of the temporary argument reference (`samples/library__sys.rst:949-953`) — and `sys.getsizeof()` (`samples/library__sys.rst:978-996`).

```python
import gc, sys

print("gil enabled:", sys._is_gil_enabled())
print("gc enabled:", gc.isenabled())
print("thresholds:", gc.get_threshold())
value = []
print("refcount:", sys.getrefcount(value))  # includes this call's temporary
gc.collect(0)  # generation 0 only; gc.collect() is a full collection
```

Derived: fix unbounded caches and forgotten registries before tuning `gc.set_threshold()`. Lowering thresholds trades CPU for earlier cycle reclamation; it does not release memory that is still strongly referenced.

## Data structures, strings and I/O (community wiki — lower authority)

The Python Wiki performance pages are community-curated and partly historical: the string-concatenation rule itself cites CPython 2.4 (`samples/performance__PythonSpeed.html:260`, **wiki, lower authority**). The specific claims below are labelled accordingly.

| Topic | Verified fact | Evidence | Status |
|---|---|---|---|
| Membership | Set/dict membership O(1) vs O(n) for sequences | `samples/performance__PythonSpeed.html:259` | wiki, lower authority |
| String building | `''.join(seq)` O(n); `+`/`+=` can be O(n²) | `samples/performance__PythonSpeed.html:260` | wiki, lower authority; text cites CPython 2.4 — historical |
| Queues | `collections.deque` O(1) vs O(n) `pop(0)`/`insert(0, v)` | `samples/performance__PythonSpeed.html:264` | wiki, lower authority |
| C building blocks | Built-in datatypes and `array`/`itertools`/`deque` coded in optimized C | `samples/performance__PythonSpeed.html:262` | wiki, lower authority |

I/O buffering changed concretely in 3.14: `Path.read_bytes` now uses unbuffered mode (`samples/whatsnew__3.14.rst:2281`). Beyond that captured change, buffering recommendations here are **derived**, not documented: batch small writes, prefer iterator forms when a full list is not needed (mirroring the wiki advice at `samples/performance__PythonSpeed.html:261`, **wiki, lower authority**), and profile before changing buffer sizes.

## Profiling tool choice and 3.15 changes

The pure-Python `profile` module adds significant overhead relative to the C implementation (`samples/library__profile.rst:20-23`, `samples/library__profile.rst:184`); the C implementation has "negligible overhead" (`samples/library__profile.rst:189-190`). `profile` is deprecated and slated for removal in 3.17 (`samples/whatsnew__3.15.rst:337`, `samples/library__profile.rst:8`). In 3.15, a new `profiling` namespace consolidates built-in tools with a sampling profiler (`samples/whatsnew__3.15.rst:329-334`), and opcode-level profiling shows specializations from the adaptive interpreter (`samples/whatsnew__3.15.rst:426-428`).

Derived checklist, in order: (1) establish acceptable speed, since optimization beyond it wastes time (`samples/performance__PythonSpeed.html:251` — **wiki, lower authority**, echoed as derived policy); (2) profile with the C-based tool; (3) fix algorithms and data structures; (4) measure warm, repeated runs so specialization is active; (5) only then consider a JIT build or free-threading; (6) re-measure after each change.

## Sources

- https://docs.python.org/3/whatsnew/3.11.html
- https://docs.python.org/3/whatsnew/3.13.html
- https://docs.python.org/3/whatsnew/3.14.html
- https://docs.python.org/3/whatsnew/3.15.html
- https://docs.python.org/3/library/sys.html
- https://docs.python.org/3/library/gc.html
- https://docs.python.org/3/library/profile.html
- https://wiki.python.org/python/performance/PythonSpeed.html (community wiki, lower authority)
