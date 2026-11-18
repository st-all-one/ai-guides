# 06 - Static Typing Core

This chapter answers what annotations mean to a static checker and what survives at runtime. It builds on 02 (modern language core) and 05 (immutability); 07 covers checker configuration.

## Runtime contract

Python does not enforce function or variable annotations; they exist for third-party tools such as type checkers, IDEs and linters (`samples/library__typing.rst:20-22`). A type hint is an annotation that specifies an expected type (`samples/glossary.rst:1678-1683`), and a static type checker is an external tool that reads code to find incorrect types (`samples/glossary.rst:1518-1520`). A clean check is therefore a property of a tool, not a guarantee from CPython (derived from those lines).

| Construct | Runtime behaviour | Static meaning |
|---|---|---|
| `def f(x: int) -> str: ...` | signature not enforced | parameters and return checked |
| `typing.cast(t, v)` | returns `v` unchanged, no check (`samples/library__typing.rst:3048-3054`) | checker treats result as `t` |
| `typing.assert_type(v, t)` | no-op, returns first argument (`samples/library__typing.rst:3057-3062`) | error if inferred type differs |
| `typing.reveal_type(v)` | prints runtime type to `sys.stderr`, returns argument (`samples/library__typing.rst:3133-3138`) | diagnostic with inferred type |

## `Any`, `object`, and `Unknown`

Unannotated functions implicitly default to `Any` (`samples/library__typing.rst:749-750`), the documented escape hatch for mixing dynamic and static code (`samples/library__typing.rst:762`). Every type is a subtype of `object`, but `object` is not a subtype of every other type, so a checker rejects almost all operations on an `object` value (`samples/library__typing.rst:765-773`).

| Type | Documented role | Checker consequence |
|---|---|---|
| `Any` | escape hatch (`samples/library__typing.rst:762`) | operations permitted, errors suppressed |
| `object` | top of the hierarchy (`samples/library__typing.rst:765-767`) | operations must be justified by narrowing |
| `Unknown` | no captured line defines it | **not verified** — do not assert semantics from this snapshot |

## Generics: PEP 695 and the three parameter kinds

PEP 695 replaced the older verbose generic syntax, which left type-parameter scope unclear and required explicit variance declarations (`samples/whatsnew__3.12.rst:180-184`). A type-parameter list in `[]` between the function name and `(` marks the function generic; at runtime the parameters appear in `__type_params__` (`samples/reference__compound_stmts.rst:1283-1287`). The list is new in 3.12 (`samples/reference__compound_stmts.rst:1291`).

```python
# Syntax introduced by PEP 695 (samples/whatsnew__3.12.rst:185-197)
def max[T](args: Iterable[T]) -> T: ...
class list[T]:
    def append(self, element: T) -> None: ...

# Legacy constructors remain available
T = TypeVar("T")          # samples/library__typing.rst:1788
Ts = TypeVarTuple("Ts")   # samples/library__typing.rst:1984
P = ParamSpec("P")        # samples/library__typing.rst:2159
type Vector[T] = list[T]  # samples/library__typing.rst:74-78
```

`TypeVar` is the ordinary type variable; its preferred construction is the dedicated syntax rather than an explicit constructor call (`samples/library__typing.rst:1788-1796`). `TypeVarTuple` enables variadic generics and is declared with a single `*` (`samples/library__typing.rst:1984-1989`). `ParamSpec` captures whole callable parameter lists and is declared with `**` (`samples/library__typing.rst:2159-2165`).

## Structural and special forms

| Form | Role | Evidence |
|---|---|---|
| `Protocol` | base for protocol classes; static duck typing | `samples/library__typing.rst:2563-2573` |
| `TypedDict` | dict with fixed keys; not checked at runtime | `samples/library__typing.rst:2693-2701` |
| `Literal` | value equivalent to one of the supplied literals | `samples/library__typing.rst:1223-1227` |
| `Final` | name cannot be reassigned or overridden | `samples/library__typing.rst:1311-1315` |
| `Self` | current enclosed class | `samples/library__typing.rst:987-989` |
| `Never` / `NoReturn` | bottom type; function never returns | `samples/library__typing.rst:942-946` |

Structural subtyping needs no explicit base class: a class with matching methods is accepted as a subtype (`samples/library__typing.rst:815-820`). `TypedDict` is a `dict` at runtime; its key and value contract is enforced only by checkers (`samples/library__typing.rst:2693-2701`).

## Narrowing and overloads

`TypeIs` annotates a user-defined predicate and exists specifically for type narrowing driven by code flow (`samples/library__typing.rst:1557-1578`). `TypeGuard` is similar but does not require the narrowed type to be a subtype of the input, and on `False` it narrows nothing, whereas `TypeIs` excludes the narrowed type (`samples/library__typing.rst:1673-1685`). `assert_never` lets a checker prove a branch is unreachable (`samples/library__typing.rst:3083-3096`). `@overload` describes multiple signatures; overload bodies must be followed by exactly one implementation, and calling an overload definition directly is an error (`samples/library__typing.rst:3292-3306`).

## Aliases and annotation introspection

The `type` statement creates a `TypeAliasType` and makes two types equivalent to checkers (`samples/library__typing.rst:74-78`, `samples/library__typing.rst:2318-2330`); assignment and explicit `TypeAlias` remain supported (`samples/library__typing.rst:107-111`, `samples/library__typing.rst:1044-1047`).

Since 3.14 annotations are deferred: stored in annotate functions and evaluated only when needed, so forward references no longer need string quoting (`samples/whatsnew__3.14.rst:148-158`). `annotationlib` is the inspection toolkit with `VALUE`, `FORWARDREF` and `STRING` formats (`samples/whatsnew__3.14.rst:162-169`, `samples/library__annotationlib.rst:18-40`).

```python
from annotationlib import Format, get_annotations
values = get_annotations(fn, format=Format.VALUE)      # may raise on undefined names
refs   = get_annotations(fn, format=Format.FORWARDREF)  # ForwardRef proxies
text   = get_annotations(fn, format=Format.STRING)      # source-like strings
```
(`samples/library__annotationlib.rst:27-40`, `samples/library__annotationlib.rst:329-338`)

`typing.get_type_hints` returns a fresh dictionary and is close to `annotationlib.get_annotations` but applies its own transformations (`samples/library__typing.rst:3502-3514`). `TYPE_CHECKING` is `True` for checkers and `False` at runtime, so type-only imports can be hidden from execution (`samples/library__typing.rst:3764-3768`).

## Sources
- https://docs.python.org/3/library/typing.html
- https://docs.python.org/3/library/annotationlib.html
- https://docs.python.org/3/whatsnew/3.12.html
- https://docs.python.org/3/whatsnew/3.14.html
- https://docs.python.org/3/reference/compound_stmts.html
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/typing.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/annotationlib.rst
