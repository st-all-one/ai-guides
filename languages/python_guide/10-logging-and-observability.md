# 10 - Logging and Observability

This chapter answers how to emit diagnosable, low-cost logs without leaking secrets, and how to separate operational telemetry from audit trails. It builds on the runtime model in ch. 03 and the error taxonomy in ch. 09.

## The four-part model

The standard library splits logging into four roles: **loggers** expose the call interface, **handlers** send records to destinations, **filters** decide which records pass, and **formatters** specify the final layout (`samples/library__logging.rst:85-91`). Create loggers only via `logging.getLogger(name)` — repeated calls with the same name return the same object (`samples/library__logging.rst:101-104`) — and `getLogger(__name__)` makes the logger hierarchy mirror the package hierarchy (`samples/library__logging.rst:105-112`). `basicConfig(**kwargs)` is the fast path for root configuration (`samples/library__logging.rst:1349`).

| Role | API anchor | What it controls |
|---|---|---|
| Logger | `getLogger`, `setLevel` (`samples/library__logging.rst:1163`,`:185`) | threshold, propagation, first filter pass |
| Handler | `setLevel`, `setFormatter`, `addFilter` (`samples/library__logging.rst:545`,`:560`,`:566`) | destination, per-sink threshold, rotation |
| Filter | `Filter.filter(record)` (`samples/library__logging.rst:810-844`) | allow/deny plus in-place record mutation |
| Formatter | `Formatter(fmt, style, defaults)` (`samples/library__logging.rst:658`) | output layout, `%`/`{`/`$` style (`samples/library__logging.rst:675-687`) |

## Levels and propagation

Levels are integers — `DEBUG=10`, `INFO=20`, `WARNING=30`, `ERROR=40`, `CRITICAL=50` (`samples/library__logging.rst:486`,`:490`,`:493`,`:500`,`:504`). `setLevel` sets a threshold (`samples/library__logging.rst:185`); `getEffectiveLevel` and `isEnabledFor` read or test it with integers (`samples/library__logging.rst:214-226`).

A subtlety that surprises teams: when `propagate` is true a record is passed **directly** to ancestor handlers, and neither the ancestor logger's level nor its filters are consulted (`samples/library__logging.rst:142-156`). Set `propagate = False` on a specialised logger to isolate its sink (`samples/library__logging.rst:144-156`).

## Lazy `%`-formatting

Comma-separated arguments are the lazy path: `%` formatting is performed only when the record is actually rendered, and no formatting happens at all when no arguments are supplied (`samples/library__logging.rst:265`). `LogRecord.getMessage()` performs the merge at render time (`samples/library__logging.rst:933-938`).

```python
import logging
log = logging.getLogger(__name__)

# Lazy: args merged only when the record is emitted (:265, :933)
log.debug("user %s from %s", user_id, client_ip)
# Eager: f-string built even when DEBUG is disabled - derived
log.debug(f"user {user_id} from {client_ip}")
```

`derived`: pass arguments, never pre-built f-strings, on hot paths; a disabled level then costs only an integer check (`samples/library__logging.rst:218-226`).

## Structured JSON records (`derived`)

A `Formatter` converts a `LogRecord` into output text (`samples/library__logging.rst:658-660`). Per-call `extra=` populates custom record attributes (`samples/library__logging.rst:305-314`), and `style` selects `%`, `{` or `$` merging for the format string (`samples/library__logging.rst:675-687`).

```python
import json, logging

class JsonFormatter(logging.Formatter):
    def format(self, record):  # derived from :658-660
        payload = {"level": record.levelname,
                   "msg": record.getMessage(),
                   "task": getattr(record, "taskName", None)}
        return json.dumps(payload)  # stdlib json: not verified (no line captured)
```

`not verified`: no dedicated JSON logging handler is present in the captured sources. Add fields via a `Filter`, which may replace the record entirely since 3.12 (`samples/library__logging.rst:852`).

## Correlation ids and context

`LoggerAdapter(logger, extra)` exists precisely to pass contextual information into logging calls (`samples/library__logging.rst:1079-1100`); its `process` method injects the `extra` dict into call kwargs (`samples/library__logging.rst:1097-1103`). Each `LogRecord` also exposes `taskName`, the asyncio task name, added in 3.12 (`samples/library__logging.rst:1069`,`:1076`). Async context managers execute their exit code in the same context as their iterations, so context variables behave correctly (`samples/library__contextlib.rst:220`).

`derived`: attach a request/correlation id once with a `LoggerAdapter` or a contextual `Filter` (`samples/library__logging.rst:810-865`) instead of repeating it at every call site. The `contextvars` API itself is `not verified` here (no capture).

## Redaction (`derived`)

Filters see every record a handler processes and may add, change or remove attributes (`samples/library__logging.rst:852-865`). That hook is the natural redaction point for tokens and personal data. `not verified`: no captured helper implements secret masking; implement it as a filter and test it explicitly. Keep secrets out of `extra=` payloads in the first place (`samples/library__logging.rst:305-314`).

## Exceptions, audit logs and cost

`Logger.exception` logs at `ERROR` and attaches exception info; the docs state it should only be called from an exception handler (`samples/library__logging.rst:387-390`). `exc_info` adds a traceback and `stack_info` adds a call stack (`samples/library__logging.rst:268-284`); the default `Formatter.formatException` uses `traceback.print_exception` (`samples/library__logging.rst:763-767`).

| Concern | Mechanism | Evidence / boundary |
|---|---|---|
| Unexpected failure | `logger.exception(...)` inside `except` | `samples/library__logging.rst:387-390` |
| Structured failure | `exc_info` + custom formatter | `samples/library__logging.rst:270-272`,`:658-660` |
| Audit vs app logs | separate logger, `propagate=False`, own handler | `derived` from `samples/library__logging.rst:144-156` |
| Runtime cost | integer level check + lazy args | `derived` from `samples/library__logging.rst:218-226`,`:265` |
| Measured overhead | no figure in captures | `not verified` |

## Sources

- https://docs.python.org/3/library/logging.html
- https://docs.python.org/3/library/logging.handlers.html
- https://docs.python.org/3/library/contextlib.html
- https://docs.python.org/3/howto/logging.html
- https://docs.python.org/3/whatsnew/3.12.html
- https://raw.githubusercontent.com/python/cpython/v3.15.2/Doc/library/logging.rst
