# 25 - Coverage evidence

This chapter makes the coverage claim measurable. Each of six topics has 20
requirements describing what effective use of the sources demands. `documented`
means the guide answers the requirement at the cited chapter line; `unverified`
means only a real codebase, service, device or incident can answer it. Coverage
is `documented / 20`; the target is **at least 85% in every topic**. The delivery
checker parses these tables, resolves every `file:LINE` token and fails any topic
below the target.

Metric scope (**derived**): this measures documentation coverage of a curated
checklist, not runtime validation or real-world frequency. Unverified items are
counted honestly rather than hidden. Local smoke results are recorded in `VERSION`
and `26`; they do not convert an unverified item into documented coverage.

## 1. Functional, immutability and determinism

Coverage: **19/20 (95%)**.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| F01 | pure function / explicit side-effect boundary | documented | `04-functional-foundations.md:5` |
| F02 | iterator instead of materialised list | documented | `04-functional-foundations.md:17` |
| F03 | resumable generator and yield from | documented | `12-iterators-generators-deep.md:18` |
| F04 | comprehension vs map/filter choice | documented | `04-functional-foundations.md:33` |
| F05 | itertools recipes as combinators | documented | `12-iterators-generators-deep.md:66` |
| F06 | functools cache only on pure functions | documented | `23-standard-library-cookbook.md:17` |
| F07 | operator/higher-order helpers | documented | `23-standard-library-cookbook.md:43` |
| F08 | lazy pipeline with deterministic cleanup | documented | `12-iterators-generators-deep.md:87` |
| F09 | frozen slots dataclass | documented | `05-immutability-and-determinism.md:5` |
| F10 | NamedTuple / MappingProxyType / frozenset | documented | `05-immutability-and-determinism.md:5` |
| F11 | Enum for closed sets | documented | `08-data-modeling.md:42` |
| F12 | hash and equality contract | documented | `05-immutability-and-determinism.md:33` |
| F13 | dict insertion-order guarantee | documented | `05-immutability-and-determinism.md:44` |
| F14 | injected clock instead of time.time | documented | `05-immutability-and-determinism.md:44` |
| F15 | seeded randomness separated from security RNG | documented | `05-immutability-and-determinism.md:44` |
| F16 | no module-level mutable state | documented | `05-immutability-and-determinism.md:5` |
| F17 | stable pathlib paths | documented | `22-simplification-patterns.md:48` |
| F18 | stable JSON serialisation | documented | `05-immutability-and-determinism.md:67` |
| F19 | version-gated syntax detection | documented | `02-modern-language-core.md:5` |
| F20 | repeated full-application run reproducibility | unverified | `01-sources-and-version-map.md:92` |

## 2. Static typing and data models

Coverage: **19/20 (95%)**.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| T01 | annotations on public API | documented | `06-static-typing-core.md:5` |
| T02 | strict checker configuration | documented | `07-static-typing-workflow.md:5` |
| T03 | PEP 695 generic syntax | documented | `06-static-typing-core.md:26` |
| T04 | TypeVar / ParamSpec / TypeVarTuple | documented | `06-static-typing-core.md:26` |
| T05 | Protocol structural subtyping | documented | `06-static-typing-core.md:45` |
| T06 | TypedDict for boundary payloads | documented | `08-data-modeling.md:53` |
| T07 | Literal / Final / Enum closed sets | documented | `08-data-modeling.md:42` |
| T08 | narrowing via isinstance and match | documented | `06-static-typing-core.md:58` |
| T09 | overload and signature precision | documented | `06-static-typing-core.md:58` |
| T10 | Any containment | documented | `06-static-typing-core.md:16` |
| T11 | cast vs assert | documented | `06-static-typing-core.md:58` |
| T12 | Self and Never | documented | `06-static-typing-core.md:45` |
| T13 | deferred annotations and annotationlib | documented | `02-modern-language-core.md:73` |
| T14 | PEP 561 py.typed and stubs | documented | `07-static-typing-workflow.md:24` |
| T15 | dataclass_transform | documented | `08-data-modeling.md:38` |
| T16 | checker gate in CI | documented | `07-static-typing-workflow.md:47` |
| T17 | runtime introspection pitfalls | documented | `07-static-typing-workflow.md:53` |
| T18 | gradual adoption path | documented | `07-static-typing-workflow.md:47` |
| T19 | pyproject checker configuration | documented | `07-static-typing-workflow.md:5` |
| T20 | zero errors across a real production codebase | unverified | `01-sources-and-version-map.md:92` |

## 3. Errors and logs

Coverage: **19/20 (95%)**.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| E01 | exception hierarchy and BaseException | documented | `09-errors-and-exception-groups.md:5` |
| E02 | specific except, never bare except | documented | `09-errors-and-exception-groups.md:15` |
| E03 | else/finally cleanup | documented | `09-errors-and-exception-groups.md:15` |
| E04 | raise from and chaining | documented | `09-errors-and-exception-groups.md:31` |
| E05 | ExceptionGroup and except* | documented | `09-errors-and-exception-groups.md:35` |
| E06 | BaseExceptionGroup caveat | documented | `09-errors-and-exception-groups.md:35` |
| E07 | custom error taxonomy | documented | `09-errors-and-exception-groups.md:49` |
| E08 | retry classification and idempotency | documented | `09-errors-and-exception-groups.md:49` |
| E09 | traceback capture | documented | `09-errors-and-exception-groups.md:45` |
| E10 | warnings vs errors | documented | `09-errors-and-exception-groups.md:45` |
| E11 | logger hierarchy and levels | documented | `10-logging-and-observability.md:16` |
| E12 | lazy % formatting | documented | `10-logging-and-observability.md:22` |
| E13 | handlers, formatters, filters | documented | `10-logging-and-observability.md:5` |
| E14 | structured JSON record | documented | `10-logging-and-observability.md:38` |
| E15 | correlation id propagation | documented | `10-logging-and-observability.md:55` |
| E16 | secret redaction | documented | `10-logging-and-observability.md:61` |
| E17 | logger.exception with stack | documented | `10-logging-and-observability.md:65` |
| E18 | audit vs application logs | documented | `10-logging-and-observability.md:65` |
| E19 | log cost and sampling | documented | `10-logging-and-observability.md:65` |
| E20 | live incident replay with real traces | unverified | `01-sources-and-version-map.md:92` |

## 4. Performance

Coverage: **17/20 (85%)**.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| P01 | measure before optimising | documented | `13-performance-measurement.md:5` |
| P02 | timeit methodology | documented | `13-performance-measurement.md:9` |
| P03 | cProfile and profile deprecation | documented | `13-performance-measurement.md:31` |
| P04 | tracemalloc allocation API | unverified | `13-performance-measurement.md:55` |
| P05 | warmup, variance, regression gate | documented | `13-performance-measurement.md:59` |
| P06 | set/dict O(1) membership | documented | `14-performance-runtime.md:48` |
| P07 | deque vs list queue | documented | `14-performance-runtime.md:48` |
| P08 | join vs repeated concatenation | documented | `14-performance-runtime.md:48` |
| P09 | adaptive specialisation | documented | `14-performance-runtime.md:5` |
| P10 | JIT status and benchmark spread | documented | `03-runtime-and-object-model.md:17` |
| P11 | free-threaded build trade-off | documented | `14-performance-runtime.md:19` |
| P12 | refcount and GC | documented | `14-performance-runtime.md:31` |
| P13 | slots and dataclass memory | documented | `03-runtime-and-object-model.md:53` |
| P14 | I/O buffering | documented | `14-performance-runtime.md:48` |
| P15 | C extension boundary | documented | `14-performance-runtime.md:61` |
| P16 | timeit setup outside timed statement | documented | `13-performance-measurement.md:59` |
| P17 | data structures before micro-tuning | documented | `13-performance-measurement.md:59` |
| P18 | report minimum over repeated runs | documented | `13-performance-measurement.md:59` |
| P19 | benchmark on target hardware | unverified | `01-sources-and-version-map.md:92` |
| P20 | capacity and SLO modelling | unverified | `01-sources-and-version-map.md:92` |

## 5. Security and supply chain

Coverage: **18/20 (90%)**.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| S01 | secrets vs random | documented | `15-security-core.md:5` |
| S02 | hashlib/hmac/pbkdf2 | documented | `15-security-core.md:19` |
| S03 | ssl/TLS defaults | documented | `15-security-core.md:42` |
| S04 | subprocess shell=False | documented | `15-security-core.md:46` |
| S05 | path traversal containment | documented | `15-security-core.md:59` |
| S06 | pickle deserialisation risk | unverified | `15-security-core.md:63` |
| S07 | input validation boundary | documented | `15-security-core.md:67` |
| S08 | environment and secret handling | documented | `15-security-core.md:67` |
| S09 | credential redaction in logs | documented | `10-logging-and-observability.md:61` |
| S10 | t-strings for safe interpolation | documented | `02-modern-language-core.md:60` |
| S11 | uv.lock reproducibility | documented | `16-security-supply-chain.md:5` |
| S12 | --locked / --frozen / --offline | documented | `18-uv-projects-and-lock.md:17` |
| S13 | --exclude-newer and cooldowns | documented | `16-security-supply-chain.md:23` |
| S14 | index and auth precedence | documented | `16-security-supply-chain.md:33` |
| S15 | uv audit preview status | documented | `16-security-supply-chain.md:43` |
| S16 | trusted publishing and attestations | documented | `16-security-supply-chain.md:58` |
| S17 | dependency update policy | documented | `16-security-supply-chain.md:62` |
| S18 | CLI > env > config precedence | documented | `20-uv-workspaces-and-integration.md:59` |
| S19 | container image pinning | documented | `20-uv-workspaces-and-integration.md:34` |
| S20 | live vulnerability scan or incident | unverified | `01-sources-and-version-map.md:92` |

## 6. Modern workflow with uv

Coverage: **19/20 (95%)**.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| U01 | pinned uv installation | documented | `17-uv-first-steps.md:5` |
| U02 | uv run automatic lock and sync | documented | `18-uv-projects-and-lock.md:17` |
| U03 | uv venv and pip compatibility boundary | documented | `17-uv-first-steps.md:51` |
| U04 | uv add/remove groups and extras | documented | `18-uv-projects-and-lock.md:51` |
| U05 | pyproject project metadata | documented | `18-uv-projects-and-lock.md:5` |
| U06 | universal uv.lock resolution | documented | `18-uv-projects-and-lock.md:37` |
| U07 | lock schema compatibility | documented | `16-security-supply-chain.md:29` |
| U08 | dependency groups | documented | `18-uv-projects-and-lock.md:51` |
| U09 | workspace source overrides | documented | `20-uv-workspaces-and-integration.md:5` |
| U10 | build backend | documented | `18-uv-projects-and-lock.md:64` |
| U11 | PEP 723 script metadata | documented | `19-uv-scripts-and-tools.md:5` |
| U12 | uv lock --script | documented | `19-uv-scripts-and-tools.md:49` |
| U13 | uvx tool isolation | documented | `19-uv-scripts-and-tools.md:63` |
| U14 | Python version download | documented | `17-uv-first-steps.md:25` |
| U15 | cache and link modes | documented | `17-uv-first-steps.md:65` |
| U16 | workspaces share one lockfile | documented | `20-uv-workspaces-and-integration.md:5` |
| U17 | Docker integration | documented | `20-uv-workspaces-and-integration.md:34` |
| U18 | GitHub Actions --locked | documented | `20-uv-workspaces-and-integration.md:53` |
| U19 | settings precedence | documented | `20-uv-workspaces-and-integration.md:59` |
| U20 | observed production deployment | unverified | `01-sources-and-version-map.md:92` |

## 7. Reading the result

The unverified rows are deliberate. A full-application rerun (F20), a clean
typecheck of a real production codebase (T20), live trace replay (E20),
tracemalloc API details (P04) and target-hardware benchmark numbers
(P19), capacity models (P20), pickle safety claims (S06), a live
vulnerability scan (S20) and an observed production deployment (U20) cannot
be settled by reading documentation. They stay `unverified` even where the
mechanism is described in detail.

Performance and security sit at the 85% floor: pyperf, target hardware, SLO
modelling and deserialisation safety are outside the three captured roots.
Do not raise a percentage by relabelling a `not verified` chapter note as
documented coverage.

## Sources

- https://www.python.org/doc/
- https://docs.python.org/3/
- https://docs.python.org/3/whatsnew/3.15.html
- https://wiki.python.org/python/index.html
- https://docs.astral.sh/uv/
- https://docs.astral.sh/uv/llms.txt
