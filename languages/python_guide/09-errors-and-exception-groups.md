# 09 - Errors and Exception Groups

This chapter answers how to classify failures, handle them precisely and render them. It depends on 02 (language core) and 10 (logging).

## Hierarchy

Every exception derives from `BaseException`; an `except` clause naming a class also handles its subclasses, but not its superclasses (`samples/builtins__exceptions.rst:9-14`). User-defined exceptions should derive from `Exception`, not `BaseException` (`samples/builtins__exceptions.rst:30-34`, `samples/builtins__exceptions.rst:163-166`). `KeyboardInterrupt` and `SystemExit` inherit directly from `BaseException` so `except Exception` does not prevent interpreter exit (`samples/builtins__exceptions.rst:292-296`, `samples/builtins__exceptions.rst:605-608`). The community wiki warns that a catch-all can misreport Ctrl-C as "divide by zero" (`samples/guides__HandlingExceptions.html:283`, wiki, lower authority).

| Layer | Examples | Catch policy |
|---|---|---|
| `BaseException` | `KeyboardInterrupt`, `SystemExit` | allow termination; catch only for cleanup |
| `Exception` | built-in non-system-exiting errors | normal application handlers |
| custom `Exception` subclasses | domain failures | catch at a boundary you own (`derived`) |

## `try` / `except` / `else` / `finally`

A `try` has three legal shapes: `except` clauses with optional `else` and `finally`, `except*` clauses with optional `else` and `finally`, or `finally` alone (`samples/reference__compound_stmts.rst:215-232`). Handlers are inspected in order and a bare `except` must be last (`samples/reference__compound_stmts.rst:243-250`). The `else` suite runs only when the `try` suite exits with no exception and no `return`, `continue` or `break`; exceptions raised in `else` are not handled by the earlier `except` clauses (`samples/reference__compound_stmts.rst:404-410`). `finally` is cleanup: a pending exception is re-raised afterwards, a new exception there takes the pending one as context, and a `return`, `break` or `continue` in `finally` discards it (`samples/reference__compound_stmts.rst:415-435`).

```python
try:
    value = parse(payload)                  # may raise
except ValueError as exc:
    raise ConfigError("bad payload") from exc   # explicit cause
else:
    store(value)                            # errors here bypass the handler
finally:
    release(resource)
```
(derived composition of `samples/reference__compound_stmts.rst:215-232` and `samples/builtins__exceptions.rst:49-70`)

## Chaining

Raising a new exception while another is being handled sets `__context__` automatically; `raise new from original` sets `__cause__` and `__suppress_context__`, and `raise new from None` hides the old exception for display (`samples/builtins__exceptions.rst:45-70`). `add_note` attaches text that is shown with the exception (`samples/builtins__exceptions.rst:147-157`).

## Exception groups and `except*`

PEP 654 added `ExceptionGroup`, `BaseExceptionGroup` and `except*` in 3.11 to raise and handle unrelated exceptions at once (`samples/whatsnew__3.11.rst:180-190`). `ExceptionGroup` wraps only `Exception` subclasses; `BaseExceptionGroup` wraps any exception, so `except Exception` catches the former but not the latter (`samples/builtins__exceptions.rst:969-983`). A `try` may use `except` or `except*`, never both, and the type after `except*` is mandatory (`samples/reference__compound_stmts.rst:340-346`). Each `except*` splits the group into matching and non-matching subgroups; leftovers merge with exceptions raised inside handlers and propagate (`samples/reference__compound_stmts.rst:348-378`). `break`, `continue` and `return` cannot appear in an `except*` clause (`samples/reference__compound_stmts.rst:399-401`).

| API | Result | Evidence |
|---|---|---|
| `subgroup(condition)` | matching group or `None` | `samples/builtins__exceptions.rst:1005-1019` |
| `split(condition)` | `(match, rest)` pair | `samples/builtins__exceptions.rst:1030-1033` |
| `derive(excs)` | new group preserving custom subclass data | `samples/builtins__exceptions.rst:1036-1052` |

## Tracebacks and warnings

`traceback.print_exception` prints stack entries plus exception type and value, with optional chaining (`samples/library__traceback.rst:74-90`). `TracebackException` captures an exception for later rendering and controls group width and depth (`samples/library__traceback.rst:280-295`); `format_exception_only` accepts `show_group` (`samples/library__traceback.rst:175`). `warnings.warn` may be ignored or promoted to an error by a filter (`samples/library__warnings.rst:428-445`). `filterwarnings` inserts at the front by default and earlier entries win (`samples/library__warnings.rst:544-552`); `catch_warnings` copies and restores filters on exit (`samples/library__warnings.rst:625-627`). `DeprecationWarning` is ignored by default outside `__main__` (`samples/library__warnings.rst:399-405`).

## Taxonomy, retries and Result

A `derived` taxonomy: one base exception per package, specific leaves per failure mode, `raise ... from` to preserve causes and `add_note` for context. A `derived` retry classifier checks exception types, or calls `split` on a group, and retries only transient categories while permanent errors propagate (`samples/builtins__exceptions.rst:1030-1033`). A `Result`-style return type is **not verified**: no captured source defines one, so choosing exceptions over returned results remains a project decision rather than a documented Python fact.

## Sources
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/builtins/exceptions.rst
- https://docs.python.org/3/reference/compound_stmts.html
- https://docs.python.org/3/library/warnings.html
- https://docs.python.org/3/library/traceback.html
- https://docs.python.org/3/whatsnew/3.11.html
- https://wiki.python.org/python/guides/HandlingExceptions.html
