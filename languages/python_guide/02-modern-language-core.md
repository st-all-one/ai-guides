# 02 - Modern Language Core (Python 3.10-3.15)

This chapter answers which syntax and grammar features are available at each Python version from 3.10 to 3.15, so an agent can choose syntax that the target interpreter actually accepts. It depends on 01 for the `v3.15.2` source pin and the citation contract; typing semantics are expanded in 06 and exception mechanics in 09.

## Version gates at a glance

| Feature | First available | Evidence | Minimum interpreter |
|---|---|---|---|
| `match` / `case` (PEP 634) | 3.10 | `samples/whatsnew__3.10.rst:411`, `samples/whatsnew__3.10.rst:414` | 3.10 |
| `X \| Y` unions (PEP 604) | 3.10 | `samples/whatsnew__3.10.rst:721`, `samples/whatsnew__3.10.rst:724` | 3.10 |
| `ExceptionGroup` / `except*` (PEP 654) | 3.11 | `samples/whatsnew__3.11.rst:182`, `samples/whatsnew__3.11.rst:187` | 3.11 |
| Type parameters (PEP 695) | 3.12 | `samples/whatsnew__3.12.rst:180`, `samples/reference__compound_stmts.rst:1291` | 3.12 |
| Free-form f-strings (PEP 701) | 3.12 | `samples/whatsnew__3.12.rst:244`, `samples/whatsnew__3.12.rst:247` | 3.12 |
| Deferred annotations (PEP 649/749) | 3.14 | `samples/whatsnew__3.14.rst:148` | 3.14 (new semantics) |
| t-strings (PEP 750) | 3.14 | `samples/whatsnew__3.14.rst:301`, `samples/whatsnew__3.14.rst:309` | 3.14 |

Built-in generics such as `list["SomeClass"]` come from PEP 585, named "Type Hinting Generics In Standard Collections" (`samples/library__types.rst:308`, `samples/library__typing.rst:3701`); they are usable across this window. The exact introduction version of PEP 585 is **not verified** from the captured snapshots — do not claim a 3.10 gate for it.

## Structural pattern matching (3.10)

PEP 634 added structural pattern matching in the form of a `match` statement (`samples/whatsnew__3.10.rst:411`, `samples/whatsnew__3.10.rst:414`). A `match` takes an expression and compares its value to successive patterns given as one or more `case` blocks (`samples/whatsnew__3.10.rst:436`). Patterns are declarative: the code states the shape of the data rather than a sequence of extraction steps (`samples/whatsnew__3.10.rst:460-461`).

```python
def handle(event: dict) -> str:
    match event:
        case {"type": "click", "x": x, "y": y}:
            return f"click {x},{y}"
        case {"type": "quit"}:
            return "bye"
        case _:
            return "unknown"
```

`derived` — use a `case _` wildcard so the statement is total; always include a fallback for external data, because an unmatched `match` silently does nothing.

## Unions and generics

PEP 604 introduced the `X | Y` union operator (`samples/whatsnew__3.10.rst:721`, `samples/whatsnew__3.10.rst:724`), and it works at runtime in `isinstance` checks (`samples/whatsnew__3.10.rst:744`). Prefer it to `typing.Union`: shorter syntax (`derived`, `samples/whatsnew__3.10.rst:724`).

| Expression | Meaning | Evidence |
|---|---|---|
| `int \| str` | union type accepting either member | `samples/whatsnew__3.10.rst:724` |
| `isinstance(1, int \| str)` | runtime check against the union | `samples/whatsnew__3.10.rst:744` |
| `list[int]` | parameterised built-in generic | `samples/library__types.rst:308` |

## Type parameters and the `type` statement (3.12)

PEP 695 is a headline 3.12 feature (`samples/whatsnew__3.12.rst:180`); it replaced older generics that "left the scope of type parameters unclear and required explicit declarations of variance" (`samples/whatsnew__3.12.rst:184`). A type parameter list in `[]` between the function name and `(` marks a function generic; at runtime the parameters are exposed as `__type_params__` (`samples/reference__compound_stmts.rst:1283`, `samples/reference__compound_stmts.rst:1287`). Type parameter lists are new in 3.12 (`samples/reference__compound_stmts.rst:1291`).

```python
def first[T](items: list[T]) -> T:
    return items[0]

type Point = tuple[float, float]          # TypeAliasType
type Pair[T] = tuple[T, T]                 # generic alias
```

The `type` statement creates a `TypeAliasType` instance and supports generic aliases (`samples/whatsnew__3.12.rst:200`, `samples/whatsnew__3.12.rst:206`). Locally observed on Python 3.15.2: `type Alias[T] = list[T]` yields a `TypeAliasType` that is **not callable** at runtime — treat such aliases as static-typing constructs only.

## f-strings (3.12) and t-strings (3.14)

PEP 701 lifted f-string restrictions: expression components can be any valid Python expression, including reusing the enclosing quote character (`samples/whatsnew__3.12.rst:247`, `samples/whatsnew__3.12.rst:248-249`), and nested f-strings can be written arbitrarily (`samples/whatsnew__3.12.rst:270-271`). PEP 750 added template string literals in 3.14 (`samples/whatsnew__3.14.rst:301`); a t-string uses a `t` prefix instead of `f` (`samples/whatsnew__3.14.rst:309`). Because interpolations are preserved at runtime, t-strings can support sanitising SQL, safe shell operations and logging (`samples/whatsnew__3.14.rst:372`; also `samples/whatsnew__3.14.rst:355`). Template strings are immutable but may reference mutable `Interpolation` values (`samples/reference__expressions.rst:268`).

```python
from string.templatelib import Template

query = t"SELECT * FROM users WHERE id = {user_id}"
assert isinstance(query, Template)
```

Locally observed on Python 3.15.2: `t"sum={1+2}"` produces a `Template` with 3 interpolations. `derived` — use t-strings (not f-strings) when a downstream layer must inspect or escape interpolated values before rendering.

## Deferred annotations (3.14)

PEP 649 and PEP 749 introduced deferred evaluation of annotations in 3.14 (`samples/whatsnew__3.14.rst:148`). The `annotationlib` module provides introspection tools (`samples/whatsnew__3.14.rst:162`, `samples/library__annotationlib.rst:18`); `Format.VALUE` evaluates, `Format.FORWARDREF` returns forward references and `Format.STRING` returns strings (`samples/whatsnew__3.14.rst:163-167`).

```python
from annotationlib import get_annotations, Format

def f(x: Undefined) -> None: ...
get_annotations(f, format=Format.VALUE)       # raises NameError
get_annotations(f, format=Format.STRING)      # {'x': 'Undefined', 'return': 'None'}
```

Locally observed on Python 3.15.2: `annotationlib.get_annotations(fn, Format.FORWARDREF)` returns strings for unresolved names. `derived` — never assume `__annotations__` holds live objects on 3.14+; ask `annotationlib` for the format you need.

## Exception groups and removals

PEP 654 added `ExceptionGroup` / `BaseExceptionGroup` and `except*` in 3.11 (`samples/whatsnew__3.11.rst:182`, `samples/whatsnew__3.11.rst:187-190`). A `try` may have `except` **or** `except*` clauses, never both (`samples/reference__compound_stmts.rst:340`), and `except Exception` catches an `ExceptionGroup` but not a `BaseExceptionGroup` (`samples/builtins__exceptions.rst:977`). Locally observed: an `ExceptionGroup` needs one `except*` clause per subtype. Python 3.15 removed several long-deprecated APIs (for example `sre_compile`, `sre_constants`, `sre_parse` at `samples/whatsnew__3.15.rst:2221`) and deprecates `profile`, slated for removal in 3.17 (`samples/whatsnew__3.15.rst:337`).

| Gate rule | Reason | Evidence |
|---|---|---|
| Pin syntax to the minimum supported version | A 3.14 t-string will not parse on 3.13 | `samples/whatsnew__3.14.rst:301` |
| Avoid `except`+`except*` in one `try` | It is a syntax error | `samples/reference__compound_stmts.rst:340` |
| Do not import removed 3.15 modules | They no longer exist | `samples/whatsnew__3.15.rst:2221` |

## Sources

- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.10.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.11.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.12.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.14.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.15.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/compound_stmts.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/expressions.rst
