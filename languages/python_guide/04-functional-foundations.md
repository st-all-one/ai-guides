# 04 - Functional Foundations

This chapter answers how to build lazy, side-effect-light pipelines in Python and when a functional construct beats an imperative one. It depends on 01 for the source pin and 02 for version gates; generators are extended in 12.

## Purity as a working rule

A functional program passes input through functions that produce output; it discourages side effects that modify internal state and are invisible in the return value (`samples/howto__functional.rst:57-61`). A purely functional function has no side effects: its output depends only on its input (`samples/howto__functional.rst:61`). Python programs in functional style still use local assignments but avoid mutating globals (`samples/howto__functional.rst:74-76`). The stated advantages are formal provability, modularity, composability, and ease of debugging and testing (`samples/howto__functional.rst:88-93`).

| Property | Functional ideal | Python reality | Evidence |
|---|---|---|---|
| State | No mutation of globals | Local mutation is fine | `samples/howto__functional.rst:74-76` |
| Output | Depends only on input | I/O calls are side effects | `samples/howto__functional.rst:64-69` |
| Testing | Pure functions are easy to test | Same benefit holds in Python | `samples/howto__functional.rst:88-93` |

`derived` — treat purity as a local boundary property: make the core transform pure, push I/O to the edges.

## Iterator and generator protocol

An iterator is a stream object returning one element at a time; a Python iterator must support `__next__()` with no arguments, raising `StopIteration` when exhausted (`samples/howto__functional.rst:182-186`). Iterators may be infinite (`samples/howto__functional.rst:187-188`). An object is *iterable* if `iter()` can obtain an iterator from it (`samples/howto__functional.rst:194`, `samples/howto__functional.rst:217-218`). The protocol is one-way: no reset, copy or previous element (`samples/howto__functional.rst:253-258`). Generators are "resumable functions" whose locals survive between yields (`samples/howto__functional.rst:440-449`).

```python
def evens(limit: int):
    for n in range(limit):
        if n % 2 == 0:
            yield n

it = evens(10)
assert next(it) == 0 and list(it) == [2, 4, 6, 8]
```

The community wiki (wiki, lower authority) describes generator functions as iterator-like functions usable in a `for` loop (`samples/language__Generators.html:263`) and frames generator expressions as simplification (`samples/language__Generators.html:266`). It notes the list version keeps every 10 MB element in memory while the generator avoids that (`samples/language__Generators.html:286`), and that laziness lowers memory use (`samples/language__Generators.html:364`). The wiki has Python-2-era examples (`xrange` at `samples/language__Generators.html:383`): use it for concepts only.

## Comprehensions: eager versus lazy

List comprehensions and generator expressions are concise notation for filtering and transforming (`samples/howto__functional.rst:338-341`). A generator expression returns an iterator computing values as needed; a list comprehension materialises all values (`samples/howto__functional.rst:356-359`). List comprehensions are therefore wrong for infinite or very large streams, where generator expressions are preferable (`samples/howto__functional.rst:359-361`).

| Form | Result | Use when | Evidence |
|---|---|---|---|
| `[f(x) for x in xs]` | List, all values in memory | Small finite data needing reuse | `samples/howto__functional.rst:356` |
| `(f(x) for x in xs)` | Iterator, computed on demand | Large or infinite streams | `samples/howto__functional.rst:357-361` |
| `map(f, xs)` | Iterator | Existing function, no expression needed | `samples/howto__functional.rst:630` |
| `filter(p, xs)` | Iterator | Existing predicate | `samples/howto__functional.rst:643` |

`derived` — default to a generator expression for pipelines and materialise with `list()` only at a boundary that genuinely needs random access.

## Closures, lambda and def

A closure variable is a free variable referenced from a nested scope but defined in an outer scope; `nonlocal` allows write access (`samples/glossary.rst:270-273`). `lambda` creates an anonymous function that returns the value of a single expression (`samples/howto__functional.rst:1117-1121`). The functional HOWTO explicitly prefers a named `def` over a complicated `lambda` (`samples/howto__functional.rst:1135`, `samples/howto__functional.rst:1141`), and offers a four-step escape hatch: name the lambda, comment it, write tests, then convert it to `def` (`samples/howto__functional.rst:1170-1176`).

```python
from functools import partial

def adder(n: int, x: int) -> int:
    return n + x

add3 = partial(adder, 3)          # named, introspectable closure alternative
assert add3(4) == 7
```

`derived` — use `lambda` only for one-line predicates passed straight into `map`/`filter`/`key=`; anything with a story gets a name.

## map, filter, reduce trade-offs

`map(f, iterA, ...)` returns an iterator applying `f` element-wise (`samples/howto__functional.rst:630`), and `filter(predicate, iter)` returns an iterator over elements satisfying the predicate (`samples/howto__functional.rst:643`); both are duplicated by comprehensions (`samples/howto__functional.rst:639`, `samples/howto__functional.rst:645`). `functools.reduce` cumulatively applies a two-argument function left to right (`samples/library__functools.rst:458-462`) but cannot handle infinite iterables and raises `TypeError` on an empty iterable without an initial value (`samples/howto__functional.rst:1025`, `samples/howto__functional.rst:1040-1043`). The docs state an obvious `for` loop is often clearer than `reduce` (`samples/howto__functional.rst:1061-1066`); `itertools.accumulate` yields each partial result instead of only the final one (`samples/howto__functional.rst:1073-1075`).

| Tool | Lazy? | Prefer when | Evidence |
|---|---|---|---|
| `map` / `filter` | Yes | A named function already exists | `samples/howto__functional.rst:630`, `samples/howto__functional.rst:643` |
| Comprehension | No (list) / yes (genexp) | Expression inline, readability | `samples/howto__functional.rst:356-361` |
| `reduce` | Consumes all | Associative fold; `sum`/`min` do not fit | `samples/library__functools.rst:458-462` |
| `itertools.accumulate` | Yes | Partial results (running totals) | `samples/howto__functional.rst:1073-1075` |

## Standard tools for lazy pipelines

`itertools` provides composable building blocks; its "Itertools Recipes" builds an extended toolset (`samples/library__itertools.rst:802-804`). `islice` slices an iterator (`samples/library__itertools.rst:464-465`), `chain` concatenates (`samples/library__itertools.rst:188`), `tee` splits one into several (`samples/library__itertools.rst:50`), `batched` groups elements (`samples/library__itertools.rst:150`). Locally observed on Python 3.15.2: `itertools.pairwise`/`batched` work. `functools.cache` is an unbounded thread-safe `lru_cache(maxsize=None)` (`samples/library__functools.rst:22-30`); `lru_cache` defaults to `maxsize=128, typed=False` (`samples/library__functools.rst:149`). `itemgetter`/`attrgetter` make field access callable (`samples/library__operator.rst:317-326`, `samples/library__operator.rst:282-294`).

```python
from itertools import chain, islice
from operator import itemgetter

rows = [{"id": 3}, {"id": 1}, {"id": 2}]
top = sorted(rows, key=itemgetter("id"))
first_two = islice((r["id"] for r in chain(top, [])), 2)
print(list(first_two))  # [1, 2]
```

`derived` — stay lazy until a boundary forces materialisation; caching and `tee` retain data, so bound them.

## Sources

- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/howto/functional.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/itertools.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/functools.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/operator.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/glossary.rst
- https://wiki.python.org/python/language/Generators.html
