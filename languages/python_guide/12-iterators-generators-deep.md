# 12 - Iterators and Generators, Deep Dive

This chapter answers how the iterator protocol and generator machinery actually behave, and how to build lazy pipelines with safe cleanup. It extends ch. 04 and relies on the resource-lifetime model in ch. 03.

## The iterator protocol

An iterator is a stream object that returns data one element at a time; it must implement `__next__`, which returns the next item or raises `StopIteration` (`samples/howto__functional.rst:182-186`). Any object from which `iter()` can obtain such an iterator is an iterable (`samples/howto__functional.rst:194`), and `for X in Y` accepts an iterator or an iterable (`samples/howto__functional.rst:217-218`). The protocol specifies only `__next__` — no reset, copy, or backward step (`samples/howto__functional.rst:253-258`).

| Concept | Contract | Evidence |
|---|---|---|
| iterator | `__next__` returns an item or raises `StopIteration` | `samples/howto__functional.rst:182-186` |
| iterable | `iter(obj)` yields an iterator | `samples/howto__functional.rst:194`,`:217-218` |
| generator | function body containing `yield` | `samples/howto__functional.rst:457` |
| async generator | `yield` inside `async def` | `samples/reference__expressions.rst:1086-1091` |

`derived`: code consumers against `iter`/`next`, not against concrete container types.

## Generators are resumable functions

Generators preserve local variables across calls — they "can be thought of as resumable functions" (`samples/howto__functional.rst:449`). Calling a generator function returns a generator object supporting the iterator protocol (`samples/howto__functional.rst:457-462`). Execution starts on the first method call and suspends at the first `yield`, retaining local bindings, instruction pointer, evaluation stack and exception-handling state (`samples/reference__expressions.rst:1109-1118`). Resuming with `__next__` makes the `yield` expression evaluate to `None`; resuming with `send(v)` makes it evaluate to `v` (`samples/reference__expressions.rst:1118-1122`).

```python
def integers(n):
    for i in range(n):
        yield i            # state preserved across yields (:466)

g = integers(3)
next(g)                    # 0
```

## `yield from` delegates control

The expression after `yield from` must be iterable; its values pass directly to the caller of the current generator's methods, and `send`/`throw` are forwarded to the underlying iterator when it supports them (`samples/reference__expressions.rst:1144-1152`). When the subiterator completes, its `StopIteration.value` becomes the value of the `yield from` expression — set explicitly or from a `return` in the subgenerator (`samples/reference__expressions.rst:1153-1157`). This delegation was added in 3.3 (`samples/reference__expressions.rst:1160`).

```python
def prefixed(iterable, first):
    yield first
    total = yield from iterable   # StopIteration.value -> total (:1153-1157)
    return total
```

## `send`, `throw`, `close`

| Method | Effect | Evidence |
|---|---|---|
| `next()` / `__next__` | resume; yield evaluates to `None` | `samples/reference__expressions.rst:1118-1122` |
| `send(v)` | resume; yield evaluates to `v` | `samples/reference__expressions.rst:1120-1122`,`:1207` |
| `throw(exc)` | raise the exception at the suspension point | `samples/reference__expressions.rst:1209` |
| `close()` | finalise the generator; cleanup runs | `samples/reference__expressions.rst:1211-1212` |

The reference example sends `2` into a paused generator, throws `TypeError`, then calls `close()` and prints a cleanup message (`samples/reference__expressions.rst:1207-1212`).

## Async generators

A `yield` inside `async def` defines an asynchronous generator function returning an asynchronous iterator, normally consumed with `async for` (`samples/reference__expressions.rst:1094`,`:1226-1227`). Its methods return awaitables; `__anext__` makes the yield evaluate to `None`, while `asend(v)` passes `v` in (`samples/reference__expressions.rst:1233`,`:1244-1245`). If a caller breaks early, cancels, or raises, cleanup can run in an unexpected context, so the caller must call `aclose()` to finalise and detach the generator from the event loop (`samples/reference__expressions.rst:1248-1255`). `aclosing()` provides deterministic cleanup on early `break` (`samples/library__contextlib.rst:209-223`), and asyncio distributes work through queues (`samples/library__asyncio.rst:44`).

```python
from contextlib import aclosing

async with aclosing(source()) as values:   # :209-223
    async for value in values:
        if value == 42:
            break
```

## `itertools` and lazy pipelines

`itertools` standardises fast, memory-efficient iterator building blocks that form an "iterator algebra" (`samples/library__itertools.rst:17-22`). Its Recipes section supplies an extended toolset built from core iterators (`samples/library__itertools.rst:802-810`).

| Tool | Role | Evidence |
|---|---|---|
| `count(start, step)` | infinite numeric stream | `samples/library__itertools.rst:318-330` |
| `islice(it, stop)` | bound an infinite stream | `samples/library__itertools.rst:464-475` |
| `chain(*its)` | concatenate lazily | `samples/library__itertools.rst:188` |
| `batched(it, n)` | chunking; input consumed lazily | `samples/library__itertools.rst:150-160` |
| `pairwise(it)` | overlapping pairs | `samples/library__itertools.rst:508` |

```python
from itertools import count, islice, batched

first_ten = islice(count(10, 2), 10)   # infinite source, bounded (:318,:464)
chunks = batched(first_ten, 3)         # lazy chunking (:150-160)
```

**Lazy-evaluation traps.** List comprehensions materialise results; generator expressions compute values as needed and are preferable for infinite or very large streams (`samples/howto__functional.rst:357-360`). `max`, `min` and containment tests on infinite iterators are problematic (`samples/howto__functional.rst:249`), and iterators are single-pass (`samples/howto__functional.rst:253-258`).

## Resource cleanup

`@contextmanager` turns a generator into a `with`-statement manager; the decorated function must yield exactly once, and `try/finally` is the documented cleanup shape (`samples/library__contextlib.rst:44-90`,`:76`). An exception caught only to log it must be re-raised or the `with` statement treats it as handled (`samples/library__contextlib.rst:83-87`). `closing(thing)` closes an object when the block completes (`samples/library__contextlib.rst:159-161`). `derived`: pair any generator that owns a resource with `@contextmanager`, `aclosing()`, or an explicit `close()`.

## Sources

- https://docs.python.org/3/howto/functional.html
- https://docs.python.org/3/library/itertools.html
- https://docs.python.org/3/library/contextlib.html
- https://docs.python.org/3/reference/expressions.html
- https://docs.python.org/3/library/asyncio.html
- https://docs.python.org/3/reference/compound_stmts.html
