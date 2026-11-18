# 22 - Simplification Patterns

This chapter answers which idiomatic rewrites shrink Python code without changing its behavior, and where each rewrite stops being appropriate. It depends on 04 (functional foundations), 05 (immutability and determinism), 08 (data modeling), and 09 (errors).

## Comprehensions versus loops

A list comprehension returns a Python list; a generator expression returns an iterator that computes values as necessary instead of materializing them all at once (`samples/howto__functional.rst:348-359`). Because a list comprehension holds every value, it is not useful for infinite or very large streams, where a generator expression is preferred (`samples/howto__functional.rst:359`). Genexps use parentheses and listcomps use square brackets (`samples/howto__functional.rst:364`). An `if` clause filters: the expression is emitted only when the condition is true (`samples/howto__functional.rst:382`).

| Situation | Idiomatic form | Evidence | Consequence |
|---|---|---|---|
| Need a concrete collection now | `[f(x) for x in xs]` | `samples/howto__functional.rst:348` | Allocates the full list |
| Large or infinite stream | `(f(x) for x in xs)` | `samples/howto__functional.rst:359` | Lazy, bounded memory |
| Predicate or transform already exists as a function | `filter(p, xs)` / `map(f, xs)` | `samples/howto__functional.rst:630-643` | Avoids defining a new function |
| Accumulate to one number | `sum(...)` over a genexp | `samples/howto__functional.rst:1163` | Replaces many `reduce` uses |

The functional HOWTO states that "many uses of `functools.reduce` are clearer when written as `for` loops" (`samples/howto__functional.rst:1167`) and recommends avoiding `lambda` when a `def`, loop, or builtin communicates intent better (`samples/howto__functional.rst:1135`). **Derived:** prefer a loop or builtin; use `reduce`/`lambda` only when clearest.

```python
# List materializes; generator stays lazy (samples/howto__functional.rst:348-359)
names = [line.strip() for line in lines if line.strip()]
total = sum(int(x) for x in tokens)          # samples/howto__functional.rst:1163
```

## Generators for memory-bounded pipelines

Generator functions let you declare a function that behaves like an iterator usable in a `for` loop (`samples/language__Generators.html:263` — wiki, lower authority). The same wiki states that code simplification is a stated result of generator function and generator expression support (`samples/language__Generators.html:266` — wiki, lower authority), and contrasts a list version that holds every 10 MB element in memory against the generator pattern (`samples/language__Generators.html:286` — wiki, lower authority). The CPython HOWTO independently describes generators as "resumable functions" (`samples/howto__functional.rst:449`). **Derived:** prefer a generator when a pipeline is single-pass and the input size is unbounded; this is a memory property, not a speed guarantee.

## contextlib: no bespoke context-manager classes

`@contextmanager` builds a `with`-statement context manager from a factory function without writing a class or `__enter__`/`__exit__` methods (`samples/library__contextlib.rst:44`). `closing(thing)` closes a resource on block completion (`samples/library__contextlib.rst:159`); `nullcontext` is a stand-in for an optional context manager (`samples/library__contextlib.rst:229`); `suppress(*exceptions)` skips named exceptions but should be used only for very specific errors where continuing is known to be correct (`samples/library__contextlib.rst:279`). `ExitStack` aggregates several context managers with `enter_context` (`samples/library__contextlib.rst:549`, `samples/library__contextlib.rst:590`).

| Need | Tool | Evidence |
|---|---|---|
| Ad-hoc setup/teardown | `@contextmanager` | `samples/library__contextlib.rst:44` |
| Conditional context | `nullcontext` | `samples/library__contextlib.rst:229` |
| Ignores narrowed error | `suppress` | `samples/library__contextlib.rst:279` |
| Dynamic number of resources | `ExitStack` | `samples/library__contextlib.rst:549` |

```python
from contextlib import ExitStack, suppress

with ExitStack() as stack:                  # samples/library__contextlib.rst:549
    handles = [stack.enter_context(open(p)) for p in paths]
with suppress(FileNotFoundError):           # samples/library__contextlib.rst:279
    os.remove("scratch.tmp")
```

## pathlib over string concatenation

The slash operator creates child paths like `os.path.join` (`samples/library__pathlib.rst:234`). `Path.glob('**/*.py')` walks a tree (`samples/library__pathlib.rst:68`), and `read_text`/`write_text` handle file I/O with an explicit encoding parameter (`samples/library__pathlib.rst:1257`, `samples/library__pathlib.rst:1289`). **Derived:** pass `encoding=` explicitly so behavior does not depend on the machine locale — a determinism-by-construction habit.

```python
from pathlib import Path

root = Path("src")
for path in root.glob("**/*.py"):            # samples/library__pathlib.rst:68
    text = path.read_text(encoding="utf-8") # samples/library__pathlib.rst:1257
    (root / "mirror" / path.name).write_text(text, encoding="utf-8")
```

## Dataclasses for value carriers

`@dataclass` generates special methods for a class and exposes `init`, `eq`, `order`, `frozen`, `kw_only`, and `slots` flags (`samples/library__dataclasses.rst:46`). When `eq` and `frozen` are both true, a `__hash__` is generated by default (`samples/library__dataclasses.rst:165`). `kw_only=True` makes generated `__init__` parameters keyword-only (`samples/library__dataclasses.rst:189`). `field(default_factory=list)` supplies a fresh mutable default per instance (`samples/library__dataclasses.rst:250`); `replace(obj, **changes)` returns a copy built through `__init__` and `__post_init__` (`samples/library__dataclasses.rst:481`).

**Derived:** frozen + slots dataclasses are the low-ceremony default for immutable records; use `field(default_factory=...)` for every mutable default to avoid shared state.

```python
from dataclasses import dataclass, field, replace

@dataclass(frozen=True, slots=True)         # samples/library__dataclasses.rst:46
class Config:
    tags: tuple[str, ...] = ()
    limits: dict[str, int] = field(default_factory=dict)  # :250

cfg2 = replace(cfg, tags=("prod",))         # samples/library__dataclasses.rst:481
```

For errors, prefer a narrow exception taxonomy over a generic `Result` wrapper: `except Exception` already catches an `ExceptionGroup` (`samples/builtins__exceptions.rst:977`), so specific types plus one boundary catch give clearer control flow than threading success/failure objects through every layer (derived). **Derived API-shape rules:** make invalid states unrepresentable in the signature, use keyword-only options, keep one obvious entry point, and avoid abstractions that only rename a call. Determinism-by-construction means encoding units, timeouts, and ordering in types and defaults rather than relying on callers (derived; not a documented CPython claim).

A `match` statement takes a subject expression and one or more `case` blocks (`samples/reference__compound_stmts.rst:617`). A guard is an `if <expression>` attached to a case and must succeed for that block to run (`samples/reference__compound_stmts.rst:714`). An irrefutable (match-all) case may appear at most once and must be last (`samples/reference__compound_stmts.rst:751`). **Derived:** use guards to express preconditions on a matched shape instead of nesting an `if` inside every case.


## Sources

- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/howto/functional.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/contextlib.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/pathlib.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/dataclasses.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/compound_stmts.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/builtins/exceptions.rst
- https://wiki.python.org/python/language/Generators.html
