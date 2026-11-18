# 13 - Performance Measurement

This chapter answers how to time Python code without fooling yourself, which profiler to use on 3.15, and what a defensible regression gate looks like. It depends on the runtime model in ch. 03 and the optimisation checklist in ch. 14.

## Set a target before measuring

`wiki, lower authority`: aim for an acceptable execution speed; optimisation beyond that point wastes time and money (`samples/performance__PythonSpeed.html:251`). The same page is partly historical (it cites CPython 2.4), so verify any algorithmic claim against current docs before relying on it (`samples/MANIFEST-wiki.md:37-38`).

## `timeit`: microbenchmarks

`timeit` offers a command-line and a callable interface and avoids a number of common timing traps (`samples/library__timeit.rst:16-17`). The module-level helpers are `timeit(stmt, setup, number=1000000)` and `repeat(stmt, setup, repeat=5, number=...)` (`samples/library__timeit.rst:65`,`:76`); `Timer.timeit(number)` executes setup once, then the statement `number` times (`samples/library__timeit.rst:125-129`).

| Knob | Documented behaviour | Evidence |
|---|---|---|
| `number` | loop count; the CLI auto-selects a suitable value | `samples/library__timeit.rst:49`,`:52-54` |
| `repeat` | independent runs; default changed 3 -> 5 in 3.7 | `samples/library__timeit.rst:76`,`:87` |
| `autorange` | grows 1, 2, 5, 10, 20, 50 ... until `target_time` | `samples/library__timeit.rst:146-155` |
| garbage collection | disabled during timing by default | `samples/library__timeit.rst:136-143` |

```python
import timeit
timeit.timeit(lambda: "-".join(map(str, range(100))), number=10000)  # :49,:65
times = timeit.repeat(lambda: sorted(data), repeat=5, number=1000)   # :76
best = min(times)          # min is the recommended statistic (:176-184)
```

Disabling GC makes independent timings more comparable but hides a real cost; the docs show re-enabling it with `gc.enable()` in setup when GC matters (`samples/library__timeit.rst:136-143`). For variance, the docs say mean and standard deviation are "not very useful": the lowest value is a lower bound on achievable speed, higher values reflect interference, so use `min` and then inspect the whole vector with common sense (`samples/library__timeit.rst:176-184`). The CLI reports this as "best of 5" (`samples/library__timeit.rst:302`).

`derived`: for externally timed code, warm up caches and interpreters before recording; timeit's setup-once behaviour is the closest documented analogue (`samples/library__timeit.rst:127`).

## Profiling on Python 3.15

The profiling surface changed in 3.15, so pin your version before quoting recipes.

| Module | Status on 3.15 | Evidence |
|---|---|---|
| `profile` | deprecated in 3.15, removal in 3.17 | `samples/library__profile.rst:15-17`, `samples/whatsnew__3.15.rst:337` |
| `cProfile` | backward-compatible alias to `profiling.tracing` | `samples/library__profile.rst:52-53`, `samples/whatsnew__3.15.rst:336` |
| `profiling.tracing` | deterministic call tracing, relocated from `cProfile` | `samples/whatsnew__3.15.rst:332-333` |
| `profiling.sampling` (Tachyon) | statistical sampling, up to 1,000,000 Hz | `samples/whatsnew__3.15.rst:355-362` |

The docs recommend `profiling.sampling` for production debugging with zero overhead and `profiling.tracing` for development and testing (`samples/library__profile.rst:26-29`). Sampling captures stack traces periodically instead of instrumenting every call, giving near-zero overhead and PID attachment to a running process (`samples/whatsnew__3.15.rst:359-375`). Deterministic tracing instruments each call and therefore adds overhead (`samples/whatsnew__3.15.rst:359-361`).

```python
import cProfile, pstats            # alias: library__profile.rst:52-53
prof = cProfile.Profile()
prof.enable()
do_work()
prof.disable()
pstats.Stats(prof).sort_stats("cumtime").print_stats(20)  # :112-113,:143
```

Accuracy caveat: deterministic profilers suffer clock-resolution lag and event-handling lag; the pure-Python `profile` module can calibrate by subtracting a constant, but this may produce negative times for very small call counts (`samples/library__profile.rst:236-265`). `derived`: use tracing for development and sampling for production, and never compare numbers across the two.

## Allocation tracking

`not verified`: no `tracemalloc` module reference was captured. Its only occurrence is a passing note that a 3.13 C API tracks object creation and destruction "in the same way that the tracemalloc module does" (`samples/whatsnew__3.13.rst:2221`). Do not infer `tracemalloc` APIs, flags or output formats from this. `derived`: if allocation attribution matters, choose a tool whose behaviour you verify independently before quoting numbers.

## Method and regression gates

`derived` rules, each anchored where the captures allow:

1. Change one variable per run and keep setup outside the timed statement (`samples/library__timeit.rst:125-129`).
2. Report the minimum over at least five repeats, never the mean (`samples/library__timeit.rst:176-184`,`:87`).
3. Warm up before externally timed runs (`derived`; timeit analogue at `samples/library__timeit.rst:127`).
4. Gate CI on a fixed tolerance over the observed minimum on pinned hardware (`derived`; no captured CI recipe).
5. Prefer better data structures before micro-tuning: O(1) set/dict membership versus O(n) sequence search, `''.join` over repeated `+`, and `deque` over `pop(0)` (`wiki, lower authority`: `samples/performance__PythonSpeed.html:259`,`:260`,`:264`). The wiki's string note carries a CPython 2.4 caveat, so treat it as historical guidance (`samples/performance__PythonSpeed.html:260`).

`not verified`: pyperf, structlog and pytest benchmarking plugins are absent from the captures; no claim about their APIs or output is made here.

## Sources

- https://docs.python.org/3/library/timeit.html
- https://docs.python.org/3/library/profile.html
- https://docs.python.org/3/whatsnew/3.15.html
- https://docs.python.org/3/library/gc.html
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/profile.rst
- https://wiki.python.org/python/performance/PythonSpeed.html
