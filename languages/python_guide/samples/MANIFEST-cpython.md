# CPython Documentation Snapshot — MANIFEST

## Capture contract

- **Pin:** tag `v3.15.2` of `python/cpython`.
- **Canonical source URL pattern:** `https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/<path>`
- **Flat name:** `<path>` with `/` replaced by `__` (e.g. `whatsnew/3.15.rst` → `whatsnew__3.15.rst`).
- **Fallback rule:** on HTTP 404, retry the `3.15` branch raw URL; if still missing, record as MISSING (never fabricate).
- **Byte fidelity:** every `.rst` file was fetched with `curl -fsSL` and left byte-for-byte unmodified.
- **Verification source:** `https://docs.python.org/3/` announces **Python 3.15.2** (`docs-python-index.html:6` `<title>Python 3.15.2 documentation</title>`, `:217` `<h1>Python 3.15.2 documentation</h1>`, `:219` "Welcome! This is the official documentation for Python 3.15.2."). The index also links `https://docs.python.org/3.15/` as "Python 3.15 (stable)".
- **Captured:** 2026-11-18.
- **Totals:** 56 `.rst` files present and non-zero (54 from the requested list + 2 relocated replacements), 2 HTML files, 2 requested URLs recorded MISSING.

## Files

| file | exact URL | bytes | lines | why critical |
|---|---|---:|---:|---|
| `howto__functional.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/howto/functional.rst | 49687 | 1271 | Functional programming HOWTO: iterators, generators, comprehensions |
| `library__functools.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/functools.rst | 31998 | 827 | Higher-order functions, lru_cache, reduce, decorators |
| `library__itertools.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/itertools.rst | 71262 | 2006 | Iterator building blocks + Itertools Recipes |
| `library__operator.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/operator.rst | 20298 | 592 | Functional operator functions |
| `library__collections.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/collections.rst | 55244 | 1431 | deque, Counter, namedtuple, dict helpers |
| `library__collections.abc.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/collections.abc.rst | 19634 | 467 | ABC hierarchy for containers/iterators |
| `library__typing.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/typing.rst | 147206 | 4342 | PEP 695/484 typing, Protocol, TypedDict, Any, TypeVar |
| `library__annotationlib.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/annotationlib.rst | 31818 | 720 | PEP 649/749 deferred annotation introspection (3.14) |
| `library__dataclasses.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/dataclasses.rst | 34609 | 881 | dataclass slots/frozen/hash semantics |
| `library__enum.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/enum.rst | 35450 | 1114 | Enum, StrEnum, IntEnum, Flag |
| `library__types.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/types.rst | 17341 | 552 | Dynamic type creation, SimpleNamespace, MappingProxyType |
| `library__contextlib.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/contextlib.rst | 39629 | 1093 | contextmanager, ExitStack, suppress |
| `library__pathlib.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/pathlib.rst | 69898 | 2045 | Object-oriented filesystem paths |
| `library__json.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/json.rst | 32312 | 867 | JSON serialization/parsing |
| `library__re.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/re.rst | 82378 | 2204 | Regular expressions |
| `library__decimal.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/decimal.rst | 84405 | 2360 | Arbitrary-precision decimal arithmetic (determinism) |
| `library__fractions.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/fractions.rst | 9682 | 269 | Rational numbers |
| `library__random.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/random.rst | 30804 | 880 | Pseudo-random generators, distributions (not for security) |
| `library__secrets.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/secrets.rst | 6178 | 209 | Cryptographically strong random for secrets |
| `library__hmac.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/hmac.rst | 4966 | 149 | HMAC authentication |
| `library__hashlib.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/hashlib.rst | 31649 | 855 | Secure hashes and PBKDF2/scrypt |
| `library__ssl.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/ssl.rst | 116433 | 3030 | TLS/SSL, certificates, secure defaults |
| `library__subprocess.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/subprocess.rst | 61998 | 1634 | Process control + shell-injection security notes |
| `library__logging.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/logging.rst | 74282 | 1585 | Logging levels, handlers, configuration |
| `library__warnings.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/warnings.rst | 33791 | 736 | Warning filters and categories |
| `library__traceback.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/traceback.rst | 28645 | 791 | Exception group-aware traceback handling |
| `library__unittest.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/unittest.rst | 108268 | 2671 | Unit test framework |
| `library__pdb.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/pdb.rst | 29811 | 862 | Interactive debugger |
| `library__asyncio.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/asyncio.rst | 3774 | 147 | Async I/O overview |
| `library__concurrent.futures.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/concurrent.futures.rst | 30447 | 760 | ThreadPool/ProcessPool executors |
| `library__threading.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/threading.rst | 58086 | 1594 | Threading, locks, GIL interaction |
| `library__multiprocessing.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/multiprocessing.rst | 124272 | 3300 | Process-based parallelism |
| `library__inspect.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/inspect.rst | 78264 | 1928 | Introspection incl. deferred annotations |
| `library__gc.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/gc.rst | 13280 | 374 | Garbage collector / cycles |
| `library__importlib.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/importlib.rst | 57081 | 1561 | Import machinery |
| `library____future__.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/__future__.rst | 4976 | 145 | `__future__` feature flags |
| `library__timeit.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/timeit.rst | 14229 | 394 | Benchmarking |
| `library__os.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/os.rst | 221863 | 6440 | OS interface |
| `library__sys.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/sys.rst | 92745 | 2444 | `sys._is_gil_enabled`, interpreter flags |
| `library__time.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/time.rst | 41671 | 1076 | Time functions |
| `library__datetime.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/datetime.rst | 117839 | 2940 | Date/time types and tzinfo |
| `reference__compound_stmts.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/compound_stmts.rst | 74839 | 2077 | `except*`, class/def type params, control-flow grammar |
| `reference__expressions.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/expressions.rst | 94937 | 2658 | `yield`/`yield from`, t-string immutability grammar |
| `reference__datamodel.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/datamodel.rst | 157490 | 4032 | Data model, descriptors, special methods |
| `reference__import.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/reference/import.rst | 43365 | 983 | Import system semantics |
| `whatsnew__3.10.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.10.rst | 91925 | 2364 | 3.10: `match`, union types, parenthesized contexts |
| `whatsnew__3.11.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.11.rst | 110738 | 2744 | 3.11: PEP 654 exception groups, TaskGroup, timeout, performance |
| `whatsnew__3.12.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.12.rst | 95717 | 2279 | 3.12: PEP 695 type parameter syntax, `type` statement |
| `whatsnew__3.13.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.13.rst | 110247 | 2821 | 3.13: free-threaded mode (PEP 703), experimental JIT (PEP 744) |
| `whatsnew__3.14.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.14.rst | 132754 | 3504 | 3.14: PEP 649/749 deferred annotations, PEP 750 t-strings |
| `whatsnew__3.15.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/whatsnew/3.15.rst | 113600 | 2936 | 3.15: JIT upgrades, free-threaded stable ABI (PEP 803), removals |
| `faq__index.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/faq/index.rst | 278 | 17 | FAQ index |
| `howto__pyporting.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/howto/pyporting.rst | 1291 | 35 | Porting to Python 3 guide |
| `glossary.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/glossary.rst | 82158 | 1740 | Glossary incl. t-string, free-threaded build |
| `builtins__exceptions.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/builtins/exceptions.rst | 40136 | 1108 | Relocated built-in exception reference (ExceptionGroup etc.) — replaces MISSING `library__exceptions.rst` |
| `library__profile.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/profile.rst | 14717 | 372 | Canonical `profile`/`cProfile` docs — replaces MISSING `library__cProfile.rst` |
| `library__exceptions.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/exceptions.rst | — | — | **MISSING** — HTTP 404 on tag v3.15.2 AND branch 3.15; relocated to `Doc/builtins/exceptions.rst` (captured as `builtins__exceptions.rst`) |
| `library__cProfile.rst` | https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/cProfile.rst | — | — | **MISSING** — HTTP 404 on tag v3.15.2 AND branch 3.15; cProfile documented in `Doc/library/profile.rst` (captured as `library__profile.rst`) |
| `docs-python-index.html` | https://docs.python.org/3/ | 19632 | 426 | Confirms live site announces Python 3.15.2 |
| `python-org-doc.html` | https://www.python.org/doc/ | 38546 | 863 | Official python.org documentation index |

## MISSING / relocated — exact errors

- **`library/exceptions.rst`** — `curl -fsSL` returned HTTP **404** for both
  `https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/exceptions.rst`
  and the fallback `https://raw.githubusercontent.com/python/cpython/3.15/Doc/library/exceptions.rst`.
  GitHub API tree for tag `v3.15.2` confirms the built-in exception reference now lives at
  `Doc/builtins/exceptions.rst` (fetched verbatim as `builtins__exceptions.rst`).
- **`library/cProfile.rst`** — HTTP **404** on both the tag and `3.15` branch URLs.
  The tag tree shows no `Doc/library/cProfile.rst`; `cProfile` is documented in
  `Doc/library/profile.rst` (fetched verbatim as `library__profile.rst`). `whatsnew__3.15.rst:337`
  notes `profile` is deprecated and slated for removal in Python 3.17.

No other requested URL failed. No downloaded content was edited.

## KEY_FACTS

All line numbers were verified against the downloaded files with `rg -n` / `awk`; each citation
points to a real line. Format: `<flat-name>.rst:LINE — short fact`.

- `whatsnew__3.12.rst:180` — PEP 695 "Type Parameter Syntax" is a headline 3.12 feature.
- `whatsnew__3.12.rst:184` — the old generics system "left the scope of type parameters unclear and required explicit declarations of variance".
- `reference__compound_stmts.rst:1283` — a type parameter list in `[]` between function name and `(` marks a function generic; runtime value is `__type_params__` (`:1287`).
- `reference__compound_stmts.rst:1291` — "Type parameter lists are new in Python 3.12."
- `library__typing.rst:718` — "The `Any` type" is documented as the static-typing escape hatch.
- `library__typing.rst:255` — structural subtyping is expressed by defining a `Protocol` class.
- `library__typing.rst:820` — structural subtyping is "static duck-typing".
- `whatsnew__3.14.rst:148` — PEP 649 & PEP 749: deferred evaluation of annotations lands in 3.14.
- `whatsnew__3.14.rst:162` — the new `annotationlib` module provides tools for inspecting deferred annotations.
- `library__annotationlib.rst:18` — `annotationlib` offers tools for introspecting annotations.
- `whatsnew__3.14.rst:301` — PEP 750: Template string literals (t-strings) added in 3.14.
- `whatsnew__3.14.rst:309` — a t-string uses a `t` prefix instead of `f`.
- `whatsnew__3.14.rst:355` — because interpolations are preserved at runtime, t-strings are useful for sanitising user input.
- `reference__expressions.rst:268` — template strings are immutable but may reference mutable `Interpolation` values.
- `glossary.rst:1571` — "t-strings" is short for template string literals.
- `whatsnew__3.13.rst:68` — 3.13 adds experimental free-threaded mode (PEP 703) with the GIL disabled.
- `whatsnew__3.14.rst:134` — PEP 779 makes free-threaded Python officially supported in 3.14.
- `library__sys.rst:1366` — `sys._is_gil_enabled()` returns whether the GIL is enabled.
- `whatsnew__3.15.rst:548` — PEP 803: Stable ABI for free-threaded builds (3.15).
- `whatsnew__3.13.rst:365` — 3.13 introduces an experimental just-in-time (JIT) compiler.
- `whatsnew__3.13.rst:370` — the JIT is enabled via `--enable-experimental-jit` and "may speed up some Python programs".
- `whatsnew__3.15.rst:2028` — 3.15 JIT: pyperformance reports a 7-8% geometric-mean improvement over standard CPython on x86-64 Linux (11-12% on AArch64 macOS, `:2032`).
- `whatsnew__3.15.rst:2035` — per-benchmark JIT speedups range from ~15% slowdown to over 100% speedup.
- `whatsnew__3.11.rst:182` — PEP 654: Exception Groups and `except*` added in 3.11.
- `reference__compound_stmts.rst:340` — a `try` may have `except` or `except*` clauses, but not both.
- `builtins__exceptions.rst:977` — `except Exception` catches an `ExceptionGroup` but not a `BaseExceptionGroup`.
- `library__dataclasses.rst:46` — `@dataclass` signature exposes `slots=False` and `frozen=False` flags.
- `library__dataclasses.rst:201` — with `slots=True`, `@dataclass` generates `__slots__`.
- `library__dataclasses.rst:165` — when `eq` and `frozen` are both true, `@dataclass` generates `__hash__` by default.
- `library__logging.rst:486` — logging level `DEBUG` = 10.
- `library__logging.rst:504` — logging level `CRITICAL` = 50.
- `library__secrets.rst:22` — `secrets` should be preferred over `random`'s default PRNG for passwords/tokens.
- `library__random.rst:11` — `random` implements pseudo-random generators intended for modelling/simulation, not security.
- `library__subprocess.rst:760` — `subprocess` does not implicitly invoke a shell; shell metacharacters can be passed safely.
- `library__subprocess.rst:763` — with `shell=True`, the app must quote whitespace/metacharacters to avoid shell injection.
- `whatsnew__3.11.rst:578` — `asyncio.TaskGroup` added in 3.11.
- `whatsnew__3.11.rst:585` — `asyncio.timeout` added in 3.11 and recommended over `wait_for` for new code.
- `library__itertools.rst:802` — "Itertools Recipes" section supplies an extended toolset built from core iterators.
- `library__functools.rst:149` — `lru_cache(maxsize=128, typed=False)` signature.
- `howto__functional.rst:449` — generators "can be thought of as resumable functions".
- `whatsnew__3.14.rst:211` — in 3.14 the C-API-only limitation on multiple interpreters is removed via `concurrent.interpreters` (`:212`).
- `whatsnew__3.15.rst:337` — the `profile` module is deprecated and will be removed in Python 3.17.

- **Count:** 42 verified `file:line` citations across 20 distinct files; 42 distinct real lines (≥20 required).

## Reuse in the guide

Cite either `samples/<flat-name>.rst:LINE` or
`https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/<path>:LINE`.
For the two relocated sources use their real URLs:
`.../Doc/builtins/exceptions.rst:LINE` and `.../Doc/library/profile.rst:LINE`.
Always confirm the cited line still exists in the local snapshot before publishing.
