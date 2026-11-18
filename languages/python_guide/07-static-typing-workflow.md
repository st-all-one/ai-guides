# 07 - Static Typing Workflow

This chapter answers how to run checkers, ship typed libraries and gate CI. It depends on 06 (typing core) and 18 (uv projects and lock).

## Checkers and the authority boundary

A static type checker is an external tool that reads code and reports incorrect types (`samples/glossary.rst:1518-1520`); the CPython runtime never enforces hints (`samples/library__typing.rst:20-22`). The typing documentation links to mypy manuals and notes that the type system is standardised through PEPs, so the reference broadly applies to most checkers (`samples/library__typing.rst:48-54`).

| Tool | Status in captured sources | Config example |
|---|---|---|
| mypy | linked from CPython docs (`samples/library__typing.rst:48-54`) | `derived` example below |
| pyright | no captured configuration line | `derived` example below |
| basedpyright | no captured configuration line | `derived` example below |
| ty (Astral) | **not verified** — no captured line mentions it | none |

Every flag in the next table is `derived`: the CPython snapshot documents no checker flag names, so treat these as project conventions rather than documented defaults.

| Goal | mypy (`derived`) | pyright (`derived`) | basedpyright (`derived`) |
|---|---|---|---|
| strict mode | `[mypy]` / `strict = True` | `"typeCheckingMode": "strict"` | `"typeCheckingMode": "strict"` |
| reject untyped definitions | `disallow_untyped_defs = True` | strict mode covers this | strict mode covers this |
| report redundant ignores | `warn_unused_ignores = True` | `"reportUnnecessaryTypeIgnoreComment": "error"` | inherits pyright-style settings (`derived`) |

## Shipping types: `py.typed` and stubs

A `py.typed` marker indicates to consumers that types can be read from the library (`samples/concepts__projects__init.md:108`); `uv init --lib` places it beside `__init__.py` in the package directory (`samples/concepts__projects__init.md:100-118`). Stub packages use the `-stubs` suffix and contain `__init__.pyi`, which uv's build backend searches for (`samples/concepts__build-backend.md:162-173`).

```toml
# derived: checker configs are not part of the CPython documentation
[tool.mypy]
strict = true
files = ["src"]

# derived: pyright and basedpyright read pyrightconfig.json
# { "include": ["src"], "typeCheckingMode": "strict" }
```
(`samples/library__typing.rst:48-54` records only the existence of checker documentation, not these keys.)

## Stub strategy

| Situation | Preferred source of types | Anchor |
|---|---|---|
| new library you maintain | inline annotations plus `py.typed` | `samples/library__typing.rst:26`, `samples/concepts__projects__init.md:108` |
| dependency without types | separate `-stubs` distribution | `samples/concepts__build-backend.md:162-173` |
| third-party tool integration | checker config, not runtime imports | `samples/library__typing.rst:48-54` |

## Gradual adoption and the CI gate

Type hints are optional and not enforced by Python (`samples/glossary.rst:1681-1683`), and unannotated functions default to `Any` (`samples/library__typing.rst:749-750`); that is why file-by-file rollout is possible. A `derived` order: annotate public interfaces first, enable strict mode for new modules, then convert legacy modules and shrink the exempt list. A `derived` CI gate runs the same checker command with the same committed config on every pull request; the captured sources do not prescribe a command.

The boundary between checker time and runtime is the main operational hazard. `assert_type` and `reveal_type` are inert or diagnostic-only at runtime (`samples/library__typing.rst:3057-3062`, `samples/library__typing.rst:3133-3141`), so a pipeline that consumes their output must run a checker rather than the program. `cast` performs no validation (`samples/library__typing.rst:3048-3054`), which makes it unsuitable as an I/O boundary check (`derived`). A `derived` gate rule is to restrict new `cast` calls and bare `Any` annotations, and to require every suppression comment to name its reason.

## Runtime introspection pitfalls

- Annotations are deferred in 3.14+, stored in annotate functions and evaluated only when needed (`samples/whatsnew__3.14.rst:148-158`). Code reading raw `__annotations__` can observe different objects than in earlier releases (`derived` from those lines).
- `Format.VALUE` may raise for undefined names, while `FORWARDREF` and `STRING` avoid evaluation (`samples/library__annotationlib.rst:27-40`).
- `typing.get_type_hints` returns a new dict on every call and applies its own transformations (`samples/library__typing.rst:3502-3514`).
- `TYPE_CHECKING` is false at runtime, so a type-only import placed there is unavailable to reflection code (`samples/library__typing.rst:3764-3768`); runtime plugin loading uses `importlib.import_module` (`samples/library__importlib.rst:102`), which cannot see those names (`derived`).
- `importlib.resources` provides routines for non-code package resources (`samples/library__importlib.rst:35-36`). A `derived` packaging rule is to keep the `py.typed` marker inside the package so it ships with the distribution (`samples/concepts__projects__init.md:108`).

| Pitfall | Symptom | Documented anchor |
|---|---|---|
| direct `__annotations__` access | deferred objects, not values | `samples/whatsnew__3.14.rst:148-158` |
| undefined forward reference | exception under `VALUE` | `samples/library__annotationlib.rst:29-33` |
| hidden type-only import | runtime `NameError` on reflection | `samples/library__typing.rst:3764-3768` |
| missing marker | consumers treat package as untyped | `samples/concepts__projects__init.md:108` |

## Sources
- https://docs.python.org/3/library/typing.html
- https://docs.python.org/3/library/annotationlib.html
- https://docs.python.org/3/whatsnew/3.14.html
- https://docs.python.org/3/library/importlib.html
- https://docs.python.org/3/glossary.html
- https://docs.astral.sh/uv/concepts/projects/init/index.md
- https://docs.astral.sh/uv/concepts/build-backend/index.md
