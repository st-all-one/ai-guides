# 26 - Coverage, smoke evidence and limits

Read this before treating any statement in the guide as a guarantee. The guide is
a source-backed map with line cites; the coverage numbers are a **documentation**
measurement, not evidence that a program, deployment or incident behaved a
certain way.

## 1. Verdict on the 85% target

The target is met **on the curated checklist**: six topics, 20 requirements each,
with every topic at or above 85% documented coverage (`25`). It is **not** met as
a claim about real-world usability, because no usage base, blind sufficiency
test or production telemetry was collected. Those are different claims and only
the first is measured here.

| Topic | Documented | Percent | What keeps it from 100% |
|---|---:|---:|---|
| Functional, immutability, determinism | 19/20 | 95% | Full-application rerun reproducibility |
| Static typing and data models | 19/20 | 95% | Zero errors in a real codebase |
| Errors and logs | 19/20 | 95% | Live trace replay |
| Performance | 17/20 | 85% | tracemalloc API, target hardware, SLO models |
| Security and supply chain | 18/20 | 90% | Deserialisation safety, live scan |
| Modern workflow with uv | 19/20 | 95% | Observed production deployment |

These figures are `derived` from the checklist in `25`, not telemetry and not a
probability that a task will succeed. A topic at exactly 85% has no margin: two
more unverified items would breach the target.

## 2. Measured research surface

| Surface | Value | Where recorded |
|---|---:|---|
| Python portal | 1 HTML document, `www.python.org/doc/` | `samples/python-org-doc-portal.html` |
| Python docs version | 3.15.2, rendered index + tag-pinned sources | `samples/python-org-docs-index.html:6,217,219`; `VERSION` |
| CPython sources | 56 `.rst` files at tag `v3.15.2` | `samples/MANIFEST-cpython.md` |
| uv pages | 55 `.md` pages at 0.13.9 | `samples/MANIFEST-uv.md` |
| Wiki pages | 59 captured, 18 shipped | `samples/MANIFEST-wiki.md` |
| Samples shipped | 134 files, ~5.5 MB, byte-identical | `samples/MANIFEST.md` |
| Chapters | 27 numbered files + `SKILL.md` + `VERSION` | `00` file map |
| Sample citations | 1,113 resolved and range-checked | delivery checker |
| Sources URLs | 186 across chapter `## Sources` sections | delivery checker |
| Code blocks | 52 balanced, language-tagged, <= 25 lines | delivery checker |
| Live services | 0 | no token, server or deployment used |

## 3. Runtime smoke actually executed

Local environment: Python 3.15.2 (x86_64) and uv 0.13.7 (x86_64). uv docs are
pinned at 0.13.9, so the smoke ran **two patch versions behind** the documented
tool. Results are `observed locally` and are not documentation citations.

| Check | Result | Observed detail |
|---|---|---|
| Functional / immutability | PASS | PEP 695 generic function, frozen slotted dataclass hash, mapping proxy |
| Typing | PASS | `get_type_hints` returns `items`/`return`; generic lives in `__type_params__`; `TypedDict` resolves with `get_type_hints` |
| Errors | PASS | `ExceptionGroup` split into one `V1` and one `T1` group with two `except*` clauses |
| Logging | PASS | custom formatter emitted `{"level": "INFO", "msg": "hello world"}` with lazy `%s` arguments |
| Performance | PASS | `timeit` and `tracemalloc` harness executed; numbers are machine-specific and not quoted as guidance |
| Security | PASS | `secrets.token_urlsafe`, `hashlib.pbkdf2_hmac`, `subprocess` with `shell=False`, `pathlib.is_relative_to` |
| uv script | PASS | PEP 723 `uv run --offline script.py` |
| uv project | PASS | `uv init --bare`, `uv lock --offline`, `uv run --offline python` on CPython 3.15.2 |

Three initial smoke assertions failed and were corrected by reading the cited
sources: a PEP 695 `type` alias produces a `TypeAliasType` and is not callable at
runtime; type parameters are stored on `__type_params__`, not in
`__annotations__`; and `from __future__ import annotations` leaves `TypedDict`
annotations as strings or `ForwardRef` until resolved. This is precisely why the
guide separates `observed locally` from line-cited documentation.

## 4. What was deliberately not executed

- No type checker was installed or run; all checker configuration in `07` is
  `derived` and points to each tool's own documentation.
- No pytest, Hypothesis, Ruff, pyperf, structlog or ty behaviour was executed;
  where mentioned, it is `not verified`.
- No `tracemalloc` API claim is made: no module reference was captured, only a
  passing comparison in `samples/whatsnew__3.13.rst:2221`.
- No deserialisation safety audit: the `pickle` documentation was not captured,
  so `15` marks that area `not verified` rather than guessing.
- No live index, private registry, PyPI upload, container build, CI run, TLS
  handshake or vulnerability scan.
- No benchmark on target hardware, no load test and no production deployment.
- No wiki page was treated as authoritative; migrated pages carry an explicit
  outdated warning (`samples/wiki-index.html:216`).

## 5. Known gaps

- **Third-party surface.** The three roots do not document mypy, pyright,
  basedpyright, ty, pytest, Hypothesis, Ruff or framework ecosystems.
- **Per-domain recipes.** Web frameworks, ORMs, scientific stack, GUI, C API and
  embedding are out of scope by design (`01`).
- **Version breadth.** Only 3.15.2 documentation was captured; older versions
  appear solely through `whatsnew` files, not full earlier references.
- **uv drift.** A flag added after 0.13.9 is absent; the pinned installer and
  lock-schema notes are the guard against silent drift.
- **Preview features.** `uv audit`, `uv tool audit` and on-sync malware checks
  are documented as PREVIEW (`samples/concepts__preview.md:77`); no stability or
  compliance claim rests on them.
- **Editorial caveat.** A line cite proves what a source says at the pin, not
  that a paraphrase is semantically complete or that the behaviour is unchanged
  on a newer release.

## 6. How to turn this into a real 85% guarantee

1. Define a usage base: 40-60 concrete tasks drawn from real projects, weighted
   by frequency, covering typing, FP, errors, logs, performance, security and uv.
2. Run a blind sufficiency test: answer each task using only this guide, with no
   official docs, checker output or running code. Criterion: >=85% solved
   correctly without external lookup.
3. Close the heaviest gaps first: third-party checker specifics, tracemalloc,
   deserialisation, target-hardware benchmarks and live supply-chain checks.
4. Record `task -> result -> gap -> file fixed` each round. Without that table a
   percentage is opinion again.
5. Re-run the smoke suite at the new pins and update this chapter with the exact
   runtime versions before repeating the claim.

## 7. Freshness procedure

Re-read `www.python.org/doc/` and `docs.python.org/3/`, re-fetch the same `.rst`
paths at the new tag, re-fetch uv through `llms.txt`, update `VERSION`, then run
the mechanical checker. A broken `samples/<file>:LINE` is fixed by re-reading and
rewriting the claim, never by shifting a line number to force a pass.

## Sources

- https://www.python.org/doc/
- https://docs.python.org/3/
- https://docs.python.org/3/whatsnew/3.15.html
- https://wiki.python.org/python/index.html
- https://docs.astral.sh/uv/
- https://docs.astral.sh/uv/llms.txt
- https://github.com/python/cpython/tree/v3.15.2/Doc
- https://api.github.com/repos/astral-sh/uv/releases/latest
