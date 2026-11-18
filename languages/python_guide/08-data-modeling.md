# 08 - Data Modeling

This chapter answers how to choose and configure record-like types. It depends on 06 (typing core) and 05 (immutability); 09 covers failure propagation.

## The dataclass option matrix

`@dataclass` exposes `init`, `repr`, `eq`, `order=False`, `unsafe_hash=False`, `frozen=False`, `match_args=True`, `kw_only=False`, `slots=False` and `weakref_slot=False` (`samples/library__dataclasses.rst:46`). It examines annotated class variables and, with two exceptions, ignores the annotation's type (`samples/library__dataclasses.rst:51-57`). Field order in generated methods is definition order (`samples/library__dataclasses.rst:57-58`).

| Option | Default | Effect | Evidence |
|---|---|---|---|
| `frozen` | `False` | assigning to fields raises; read-only instances | `samples/library__dataclasses.rst:168-172` |
| `slots` | `False` | generates `__slots__` and returns a new class | `samples/library__dataclasses.rst:201-203` |
| `kw_only` | `False` | all fields become keyword-only | `samples/library__dataclasses.rst:189-195` |
| `order` | `False` | generates `<`, `<=`, `>`, `>=` over fields in order | `samples/library__dataclasses.rst:123-128` |
| `eq` + `frozen` | — | both true generates `__hash__`; `eq` true and `frozen` false sets `__hash__ = None` | `samples/library__dataclasses.rst:165-170` |
| `weakref_slot` | `False` | adds `__weakref__`; requires `slots=True` | `samples/library__dataclasses.rst:225-229` |

`field()` exposes `default`, `default_factory`, `init`, `repr`, `hash`, `compare`, `metadata`, `kw_only` and `doc` (`samples/library__dataclasses.rst:250`). `default_factory` must be a zero-argument callable and cannot be combined with `default` (`samples/library__dataclasses.rst:276-280`); it exists for mutable defaults such as `list` (`samples/library__dataclasses.rst:257-262`). `field(kw_only=True)` marks a single field keyword-only (`samples/library__dataclasses.rst:314-318`). `metadata` is wrapped in `MappingProxyType` and is unused by dataclasses themselves (`samples/library__dataclasses.rst:307-311`).

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True, kw_only=True)
class Point:
    x: int
    y: int
    tags: list[str] = field(default_factory=list)

@dataclass(order=True)
class Version:
    major: int
    minor: int
```
(derived composition of `samples/library__dataclasses.rst:46` and `samples/library__dataclasses.rst:257-262`)

A defined `__post_init__` is called by the generated `__init__` and can initialise fields that depend on other fields (`samples/library__dataclasses.rst:571-579`). `slots=True` with a base class that already declares a field name omits that name from generated slots; use `fields()` rather than `__slots__` to inspect a dataclass (`samples/library__dataclasses.rst:216-222`).

## `dataclass_transform`

`@dataclass_transform` marks a class, metaclass or decorator as giving a class dataclass-like behaviour to a static checker (`samples/library__typing.rst:3150-3168`). It is PEP 681 and was added in 3.11 (`samples/whatsnew__3.11.rst:388-395`). The decorator changes checker interpretation only; runtime behaviour stays in the decorated implementation (`derived` from those lines).

## Enums

`Enum` is the base class for enumerated constants (`samples/library__enum.rst:260`). `IntEnum` members are also integers, and integer operations on them lose enum status (`samples/library__enum.rst:533-548`). `StrEnum` members are also strings, string operations do not remain in the enum, and `auto()` yields the lower-cased member name (`samples/library__enum.rst:564-594`). `StrEnum` was added in 3.11 (`samples/library__enum.rst:159`).

| Choice | Runtime identity | Appropriate when |
|---|---|---|
| `Enum` | distinct member objects | closed set of symbolic values |
| `IntEnum` | `int` subclass, compares equal to ints (`samples/library__enum.rst:539-553`) | replacing legacy integer constants |
| `StrEnum` | `str` subclass, `str(member)` gives the value (`samples/library__enum.rst:571-590`) | wire and text protocols |
| `Flag` / `IntFlag` | bitwise-combinable (`samples/library__enum.rst:80-90`) | bit masks |

## NamedTuple vs TypedDict vs dataclass

| Type | Runtime object | Mutability | Checker view | Evidence |
|---|---|---|---|---|
| `typing.NamedTuple` | tuple subclass with named fields | immutable | typed tuple | `samples/library__typing.rst:2450-2457` |
| `collections.namedtuple` | tuple subclass, indexable and iterable | immutable | untyped unless annotated | `samples/library__collections.rst:864-870` |
| `TypedDict` | plain `dict` | mutable | fixed key types; `closed=True` option | `samples/library__typing.rst:2693-2701`, `samples/library__typing.rst:2797-2801` |
| `@dataclass` | ordinary class | mutable unless `frozen=True` | generated init and equality | `samples/library__dataclasses.rst:46`, `samples/library__dataclasses.rst:168-172` |

`NamedTuple` is documented as the typed version of `collections.namedtuple` (`samples/library__typing.rst:2450-2451`), while `namedtuple` instances are tuple-like objects with attribute access (`samples/library__collections.rst:866-870`). `TypedDict` key types are checked only by tools (`samples/library__typing.rst:2693-2701`). A `derived` rule: use `NamedTuple` for fixed immutable records, `TypedDict` for dictionary-shaped data from JSON, and dataclasses when behaviour or defaults are needed.

## Validation boundaries

Dataclasses do not validate that field values match their annotations (`samples/library__dataclasses.rst:51-57`), and `TypedDict` is likewise unchecked at runtime (`samples/library__typing.rst:2693-2701`). Put value validation in `__post_init__` (`samples/library__dataclasses.rst:571-579`) or at the I/O boundary (`derived`). `default_factory` prevents shared mutable defaults (`samples/library__dataclasses.rst:276-280`) but is not a validator (`derived`). Enum membership is established by construction rather than by a separate check (`samples/library__enum.rst:30-48`).

## Sources
- https://docs.python.org/3/library/dataclasses.html
- https://docs.python.org/3/library/enum.html
- https://docs.python.org/3/library/typing.html
- https://docs.python.org/3/library/collections.html
- https://docs.python.org/3/whatsnew/3.11.html
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/dataclasses.rst
