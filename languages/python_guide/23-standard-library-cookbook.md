# 23 - Standard Library Cookbook

This chapter answers "which standard-library name do I reach for, with what signature?" It depends on 04 (functional foundations), 08 (data modeling), and 12 (iterators and generators).

## Collections and ABCs

Collections supply `Counter`/`most_common` (`samples/library__collections.rst:240`, `samples/library__collections.rst:292`), `deque(maxlen=...)` (`samples/library__collections.rst:463`), `defaultdict(default_factory)` (`samples/library__collections.rst:730`), and `namedtuple` (`samples/library__collections.rst:864`). `collections.abc` defines `Iterable`, `Iterator`, `Sequence`, `Mapping`, `Set` (`samples/library__collections.abc.rst:219`, `samples/library__collections.abc.rst:236`, `samples/library__collections.abc.rst:261`, `samples/library__collections.abc.rst:313`, `samples/library__collections.abc.rst:308`).

| Need | Name | Evidence |
|---|---|---|
| Frequency counts | `Counter(xs).most_common(3)` | `samples/library__collections.rst:292` |
| Queue / bounded history | `deque(maxlen=N)` | `samples/library__collections.rst:463` |
| Missing-key default | `defaultdict(list)` | `samples/library__collections.rst:730` |
| Lightweight record | `namedtuple("P", ["x", "y"])` | `samples/library__collections.rst:864` |
| Fallback chain of maps | `ChainMap(*maps)` | `samples/library__collections.rst:45` |

## functools

`cache` memoizes without a bound (`samples/library__functools.rst:22`); `lru_cache(maxsize=128, typed=False)` keeps recent calls, is threadsafe, and requires hashable arguments (`samples/library__functools.rst:148-149`, `samples/library__functools.rst:151-155`, `samples/library__functools.rst:163-164`). `partial(func, /, *args, **keywords)` pre-binds arguments (`samples/library__functools.rst:342`). `singledispatch` registers per-type implementations (`samples/library__functools.rst:489`, `samples/library__functools.rst:617`); `wraps` preserves decorator metadata (`samples/library__functools.rst:765`).

| Tool | Signature / purpose | Evidence |
|---|---|---|
| `cache` | memoize without a size bound | `samples/library__functools.rst:22` |
| `lru_cache` | bounded, threadsafe memoization | `samples/library__functools.rst:149` |
| `cached_property` | computed-once attribute | `samples/library__functools.rst:60` |
| `partial` | pre-bind positional/keyword args | `samples/library__functools.rst:342` |
| `singledispatch` | dispatch on first-arg type | `samples/library__functools.rst:489` |

```python
from functools import lru_cache, partial, singledispatch

@lru_cache(maxsize=128)                     # samples/library__functools.rst:149
def parse(text: str) -> tuple: ...

@singledispatch                             # samples/library__functools.rst:489
def dump(value): raise TypeError(type(value))
@dump.register
def _(value: int): return str(value)

int10 = partial(int, base=10)               # samples/library__functools.rst:342
```

## itertools and operator

`pairwise` and `batched(iterable, n, *, strict=False)` are available (`samples/library__itertools.rst:508`, `samples/library__itertools.rst:150`); `accumulate`, `chain`, `groupby`, `islice`, `zip_longest` cover totals, flattening, grouping, slicing, padding (`samples/library__itertools.rst:85`, `samples/library__itertools.rst:188`, `samples/library__itertools.rst:403`, `samples/library__itertools.rst:464`, `samples/library__itertools.rst:761`). `itemgetter`, `attrgetter` build key functions; `methodcaller` calls methods by name (`samples/library__operator.rst:317`, `samples/library__operator.rst:282`, `samples/library__operator.rst:366`).

| Function | One-line use | Evidence |
|---|---|---|
| `pairwise` | adjacent pairs | `samples/library__itertools.rst:508` |
| `batched` | fixed-size chunks | `samples/library__itertools.rst:150` |
| `groupby` | group consecutive keys | `samples/library__itertools.rst:403` |
| `itemgetter` | `sorted(rows, key=itemgetter(1))` | `samples/library__operator.rst:317` |
| `methodcaller` | `map(methodcaller("strip"), xs)` | `samples/library__operator.rst:366` |

```python
from itertools import batched, pairwise
from operator import itemgetter

windows = list(pairwise([1, 2, 3]))         # samples/library__itertools.rst:508
chunks = list(batched(data, 64))            # samples/library__itertools.rst:150
top = sorted(rows, key=itemgetter(1))       # samples/library__operator.rst:317
```

## contextlib and pathlib

`@contextmanager` and `ExitStack` are in 22; additions: `closing`, `nullcontext`, `suppress` (`samples/library__contextlib.rst:159`, `samples/library__contextlib.rst:229`, `samples/library__contextlib.rst:279`). Paths: `/` joins segments, `glob`/`rglob` walk trees, `read_text`/`write_text` do I/O, `resolve()` normalizes (`samples/library__pathlib.rst:234`, `samples/library__pathlib.rst:1353`, `samples/library__pathlib.rst:1407`, `samples/library__pathlib.rst:1257`, `samples/library__pathlib.rst:974`).

## Numbers and time

`Decimal(value="0", context=None)` gives exact decimal arithmetic; `localcontext()` scopes precision changes (`samples/library__decimal.rst:360`, `samples/library__decimal.rst:1015`). `Fraction(1.1)` is not exactly `Fraction(11, 10)` (binary float input); `limit_denominator(max_denominator=1000000)` approximates it (`samples/library__fractions.rst:36-38`, `samples/library__fractions.rst:177`). `UTC` aliases `timezone.utc` (`samples/library__datetime.rst:144`, `samples/library__datetime.rst:95`); `datetime.fromisoformat` parses ISO-8601 including `Z` (`samples/library__datetime.rst:1109`, `samples/library__datetime.rst:1132-1133`).

| Need | Call | Evidence |
|---|---|---|
| Money-like exactness | `Decimal("0.10")`, `localcontext()` | `samples/library__decimal.rst:360`, `samples/library__decimal.rst:1015` |
| Rational reconstruction | `Fraction(x).limit_denominator(1000)` | `samples/library__fractions.rst:177` |
| UTC-aware now | `datetime.now(timezone.utc)` | `samples/library__datetime.rst:998` |
| Parse ISO string | `datetime.fromisoformat(s)` | `samples/library__datetime.rst:1109` |

## Text, data, and enums

`json.dumps`/`json.loads` serialize and parse; bad input raises `JSONDecodeError` (`samples/library__json.rst:263`, `samples/library__json.rst:371`, `samples/library__json.rst:615`). `re.fullmatch` requires a whole-string match; `re.search` scans (`samples/library__re.rst:1139`, `samples/library__re.rst:1090`); `re.compile` builds a reusable pattern (`samples/library__re.rst:1058`). `Enum`, `StrEnum`, `IntEnum` give symbolic members; `@unique` rejects duplicates (`samples/library__enum.rst:260`, `samples/library__enum.rst:564`, `samples/library__enum.rst:533`, `samples/library__enum.rst:1020`).

## typing cheatsheet

| Construct | Use | Evidence |
|---|---|---|
| `Protocol` | structural subtyping | `samples/library__typing.rst:2563`, `samples/library__typing.rst:820` |
| `TypedDict` | fixed-shape dict | `samples/library__typing.rst:2693` |
| `NamedTuple` | typed tuple | `samples/library__typing.rst:2450` |
| `Any` / `LiteralString` | escape hatch / injection-safe string | `samples/library__typing.rst:850`, `samples/library__typing.rst:907` |
| `Literal` / `Final` | finite values / constants | `samples/library__typing.rst:1223`, `samples/library__typing.rst:1311` |
| `Self` / `Never` | fluent returns / no return | `samples/library__typing.rst:987`, `samples/library__typing.rst:942` |
| `TypeAlias` / `@overload` | explicit alias / typed signatures | `samples/library__typing.rst:1044`, `samples/library__typing.rst:3292` |

## Sources

- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/collections.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/collections.abc.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/functools.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/itertools.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/operator.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/datetime.rst
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/typing.rst
