# MANIFEST — python.org/doc + Python Wiki verbatim snapshot

Captured 2026-11-18. All files are byte-identical to the HTTP response body from the URL
listed below (no rewriting, no pretty-printing, no HTML cleanup). Files live under
`/tmp/python-research/wiki/`. Path flattening: each `/` in the wiki URL path becomes `__`
(e.g. `python/language/Decorators.html` → `language__Decorators.html`).

## Provenance and authority (read before using any fact)

- The Python Wiki is **community-curated and lower-authority than `docs.python.org/3`**.
  The wiki itself flags migrated pages as legacy: `wiki-index.html:216` — "This page was
  migrated from the old MoinMoin-based wiki. Information may be outdated or no longer
  applicable. For current documentation, see python.org." The same disclaimer is present
  in 45 of the captured HTML files.
- Category indexes confirm the low authority explicitly:
  `guides__index.html:239` — practical guides are community-written, with some pages
  "historical artifacts from the MoinMoin wiki era", so dates/versions must be checked;
  `getting-started__index.html:233` — the official tutorial is "still the best single
  starting point";
  `security__index.html:221` — the security section "is thin" and the Python Security
  Response Team is a better source for current guidance;
  `documentation__index.html:228` — for actual Python docs, go to `docs.python.org`.
- **URL structure changed.** The new Sphinx/Shibuya wiki uses
  `https://wiki.python.org/python/<category>/...` (evidence: the source-file link
  `wiki-index.html:157` → `github.com/psf/wiki/blob/main/python/index.md`, and the
  relative links such as `wiki-index.html:94` → `language/index.html`). Old
  `https://wiki.python.org/moin/...` links are **still present on python.org/doc**:
  `python-org-doc-index.html:288` (Python Books), `:322` (Python Wiki root),
  `:408` (submit an event), `:472`/`:473` (periodicals/books), `:544` (Python 2 support),
  and `:665`/`:697`/`:777` (duplicated in the mobile tree). python.org/doc also already
  carries one new-style link at `:280`, `:463`, `:657`
  (`https://wiki.python.org/python/getting-started/BeginnersGuide.html`).
  Probed legacy URLs `https://wiki.python.org/moin/`, `/moin/PythonBooks`,
  `/moin/PythonEventsCalendar` all returned HTTP 200 (still live, still legacy).
- Therefore: cite this snapshot for *what the community wiki says*, never as authoritative
  language/library/security truth. Prefer `docs.python.org/3` for the guide's normative claims.
  Much of the wiki content is Python-2-era (e.g. `performance__PythonSpeed.html:260`
  mentions CPython 2.4); flag such facts as historical in the guide.

## Capture status / 404s

- 57/57 wiki fetches returned **HTTP 200**; 0 responses were 404. No captured file is a
  fabricated or synthesized page. No `*.MISSING` files were produced because no fetch failed.
- 2 root files were copied verbatim (`sha256` verified identical to the input roots).
- The pre-existing input `index.html` is retained in the directory as the source of
  `wiki-index.html`; it is not counted as a captured file below.

## Category tree discovered (all 29 top-level Python Wiki sections)

From `wiki-index.html:82-108` (global toc) and `wiki-index.html:310-360` (main toc):

```
Python Wiki
├── Archive                      archive/
├── Books & Publications         books/
├── Community & User Groups      community/
├── Conferences                  conferences/
├── Database Programming         database/      [TARGET — captured]
├── Documentation                documentation/ [TARGET — captured]
├── Editors & IDEs               editors/
├── Education                    education/
├── Getting Started              getting-started/ [TARGET — captured]
├── GUI Programming              gui/
├── Guides and How-Tos           guides/        [TARGET — captured]
├── Internationalization         i18n/
├── Python Implementations       implementations/ [TARGET — captured]
├── Infrastructure               infrastructure/
├── Language Reference           language/      [TARGET — captured]
├── Libraries & Tools            libraries/     [TARGET — captured]
├── Multimedia & Games           multimedia/
├── Networking                   networking/
├── Packaging                    packaging/     [TARGET — captured]
├── Performance                  performance/   [TARGET — captured]
├── Platform-Specific            platforms/
├── Python Software Foundation   psf/           [skipped — PSF/org, not practice]
├── Python 3 Migration           py3/           [TARGET — captured]
├── Scientific Computing         science/
├── Security                     security/      [TARGET — captured]
├── Summer of Code               soc/           [skipped — program/archive]
├── Sprints                      sprints/       [skipped — events]
├── Testing                      testing/       [TARGET — captured]
└── Web Development              web/           [TARGET — captured]
Siblings (separate wikis): PSF Wiki ../psf/index.html, Jython Wiki ../jython/index.html
```

Target scope was limited to the 13 engineering-practice categories; PSF, events, jobs and
archival sections were deliberately skipped. Enumerated internal links from
`wiki-index.html`: 120 unique `href` values, of which 29 are top-level category indexes
and the rest are leaf pages, anchors, `_static` assets or external URLs.

## Captured files — `file | exact URL | bytes | lines | why critical`

| file | exact URL | bytes | lines | why critical |
|---|---|---:|---:|---|
| python-org-doc-index.html | copied verbatim from /tmp/python-research/pydoc/doc_index.html (https://www.python.org/doc/) | 38546 | 863 | Canonical docs landing: proves coexistence of old `/moin/` links and new `/python/` link |
| wiki-index.html | copied verbatim from /tmp/python-research/wiki/index.html (https://wiki.python.org/python/index.html) | 31166 | 417 | Wiki root: full category tree, Sphinx source link, migration disclaimer |
| language__index.html | https://wiki.python.org/python/language/index.html | 28119 | 382 | Language/functional-programming hub: decorators, generators, iterator, AST, complexity |
| performance__index.html | https://wiki.python.org/python/performance/index.html | 19327 | 304 | Performance hub; explicitly separates durable tips from mid-2000s historical sprints |
| security__index.html | https://wiki.python.org/python/security/index.html | 17313 | 284 | Security hub; admits thin coverage, redirects readers to PSRT for current guidance |
| documentation__index.html | https://wiki.python.org/python/documentation/index.html | 19368 | 305 | Documentation-tooling hub (docutils, Sphinx, docs team coordination) |
| guides__index.html | https://wiki.python.org/python/guides/index.html | 23152 | 340 | How-to hub: exception handling, one-liners, editing code; flags legacy artifacts |
| py3__index.html | https://wiki.python.org/python/py3/index.html | 26133 | 360 | Python 3 migration hub; historical archive, Py2 EOL date, porting guides |
| packaging__index.html | https://wiki.python.org/python/packaging/index.html | 27059 | 360 | Packaging history arc: distutils → setuptools → distribute → pip/PyPA |
| testing__index.html | https://wiki.python.org/python/testing/index.html | 19047 | 304 | Testing hub: unittest/doctest/pytest, TDD, testing culture |
| libraries__index.html | https://wiki.python.org/python/libraries/index.html | 19845 | 310 | Libraries/tools hub: pickle serialization, scripting, hosting |
| getting-started__index.html | https://wiki.python.org/python/getting-started/index.html | 21310 | 316 | Beginner hub; states official tutorial is the best single starting point |
| implementations__index.html | https://wiki.python.org/python/implementations/index.html | 22916 | 339 | Implementations hub: CPython, PyPy, internals, embedding/extending |
| database__index.html | https://wiki.python.org/python/database/index.html | 23005 | 336 | Database hub: DB-API/PEP 249, SQLite, DbApi3, SQLAlchemy |
| web__index.html | https://wiki.python.org/python/web/index.html | 27815 | 376 | Web hub: frameworks, WSGI, Twisted; archival but broad ecosystem map |
| language__AST.html | https://wiki.python.org/python/language/AST.html | 20273 | 313 | AST knowledge for static analysis/introspection tooling |
| language__Concurrency.html | https://wiki.python.org/python/language/Concurrency.html | 33556 | 391 | Concurrency definitions, race conditions, stdlib concurrency options, async/await |
| language__Decorators.html | https://wiki.python.org/python/language/Decorators.html | 37466 | 561 | Decorator table incl. @property, functools.wraps/singledispatch/lru_cache/total_ordering |
| language__Generators.html | https://wiki.python.org/python/language/Generators.html | 52385 | 573 | Core source for functional style, lazy iteration and memory-friendly simplification |
| language__Iterator.html | https://wiki.python.org/python/language/Iterator.html | 28104 | 377 | Iterator protocol `__iter__`/`__next__`, foundation for deterministic pipelines |
| language__WithStatement.html | https://wiki.python.org/python/language/WithStatement.html | 43899 | 478 | PEP 343/context-manager design discussion; resource/cleanup correctness |
| language__TimeComplexity.html | https://wiki.python.org/python/language/TimeComplexity.html | 19791 | 307 | Complexity reference (page now redirects readers to official docs) |
| language__AbstractBaseClasses.html | https://wiki.python.org/python/language/AbstractBaseClasses.html | 38111 | 563 | ABCs / proposed Python 3K class tree: relevant to static typing |
| performance__PythonSpeed.html | https://wiki.python.org/python/performance/PythonSpeed.html | 29341 | 367 | Dense optimization checklist: sets, join, iterators, deque, comprehensions |
| performance__NeedForSpeed.html | https://wiki.python.org/python/performance/NeedForSpeed.html | 20553 | 305 | Historical speed initiative context |
| performance__SpeedUpInterpreterStartup.html | https://wiki.python.org/python/performance/SpeedUpInterpreterStartup.html | 18605 | 296 | Interpreter startup optimization project (historical) |
| security__Security.html | https://wiki.python.org/python/security/Security.html | 23258 | 360 | Sandboxing/taint/security-response notes; explicit legacy caveats |
| security__SandboxedPython.html | https://wiki.python.org/python/security/SandboxedPython.html | 30706 | 355 | Untrusted-code execution, RestrictedExecution, capability ideas |
| security__Cryptography.html | https://wiki.python.org/python/security/Cryptography.html | 19184 | 315 | Crypto library landscape overview |
| documentation__Documentation.html | https://wiki.python.org/python/documentation/Documentation.html | 26269 | 381 | Links to tutorial, language reference, stdlib reference |
| documentation__DocUtils.html | https://wiki.python.org/python/documentation/DocUtils.html | 17729 | 286 | docutils toolchain background |
| documentation__Sphinx.html | https://wiki.python.org/python/documentation/Sphinx.html | 17656 | 288 | Sphinx/reST/autodoc: the tool that builds this wiki and modern Python docs |
| guides__HandlingExceptions.html | https://wiki.python.org/python/guides/HandlingExceptions.html | 46592 | 569 | Error handling: try/except, specific vs catch-all, KeyboardInterrupt trap |
| guides__Powerful%20Python%20One-Liners.html | https://wiki.python.org/python/guides/Powerful%20Python%20One-Liners.html | 65322 | 692 | Simplification/idioms catalogue (verify modern validity before reuse) |
| guides__HowToEditPythonCode.html | https://wiki.python.org/python/guides/HowToEditPythonCode.html | 43022 | 446 | Editing/tooling workflow guidance |
| py3__Python2orPython3.html | https://wiki.python.org/python/py3/Python2orPython3.html | 20685 | 313 | Definitive "Python 3 for new development" + Py2 EOL/security statement |
| py3__Python3FAQ.html | https://wiki.python.org/python/py3/Python3FAQ.html | 30534 | 368 | Python 3 FAQ, migration-era rationale |
| py3__PortingToPy3k.html | https://wiki.python.org/python/py3/PortingToPy3k.html | 22843 | 339 | Porting guide index; legacy version-2/3 dual-support context |
| packaging__Packaging.html | https://wiki.python.org/python/packaging/Packaging.html | 21913 | 342 | The short-lived `packaging` stdlib module (distutils2 lineage) |
| packaging__PyPI.html | https://wiki.python.org/python/packaging/PyPI.html | 62931 | 592 | PyPI definition: catalogue + distribution mechanism |
| packaging__Virtualenv.html | https://wiki.python.org/python/packaging/Virtualenv.html | 20669 | 318 | Environment isolation background |
| testing__DocTest.html | https://wiki.python.org/python/testing/DocTest.html | 23251 | 402 | doctest landing page (mostly legacy disclaimer; use official docs for behavior) |
| testing__UnitTests.html | https://wiki.python.org/python/testing/UnitTests.html | 19407 | 301 | Framework survey: unittest, doctest, pytest, nose2, Hypothesis |
| testing__TestDrivenDevelopment.html | https://wiki.python.org/python/testing/TestDrivenDevelopment.html | 19064 | 307 | TDD workflow: test-first, then code |
| libraries__UsingPickle.html | https://wiki.python.org/python/libraries/UsingPickle.html | 25851 | 356 | Serialization; relevant to determinism/security caveats |
| libraries__AppsWithPythonScripting.html | https://wiki.python.org/python/libraries/AppsWithPythonScripting.html | 48892 | 659 | Embedding Python in applications |
| libraries__PythonHosting.html | https://wiki.python.org/python/libraries/PythonHosting.html | 20126 | 315 | Hosting options overview |
| getting-started__BeginnersGuide.html | https://wiki.python.org/python/getting-started/BeginnersGuide.html | 37445 | 435 | Beginner guide; explicit "install Python 3, not stale Python 2" advice |
| getting-started__LearnPython.html | https://wiki.python.org/python/getting-started/LearnPython.html | 21886 | 385 | Learning resources pointer |
| getting-started__MovingToPythonFromOtherLanguages.html | https://wiki.python.org/python/getting-started/MovingToPythonFromOtherLanguages.html | 30222 | 373 | Idioms for experienced programmers coming from other languages |
| implementations__CPython.html | https://wiki.python.org/python/implementations/CPython.html | 18709 | 295 | Reference implementation definition (what "Python" usually means) |
| implementations__PyPy.html | https://wiki.python.org/python/implementations/PyPy.html | 19038 | 305 | JIT implementation, backends, GC — performance context |
| implementations__CPythonVmInternals.html | https://wiki.python.org/python/implementations/CPythonVmInternals.html | 34235 | 510 | VM internals for deep performance/determinism reasoning |
| database__SQLite.html | https://wiki.python.org/python/database/SQLite.html | 26350 | 438 | DB-API example driver; no external DBMS needed |
| database__DbApi3.html | https://wiki.python.org/python/database/DbApi3.html | 30848 | 480 | DB-API 3.0 specification discussion |
| database__SQLAlchemy.html | https://wiki.python.org/python/database/SQLAlchemy.html | 18618 | 298 | ORM option overview |
| web__WebFrameworks.html | https://wiki.python.org/python/web/WebFrameworks.html | 74598 | 665 | Framework definition, full-stack vs component model, comparison table |
| web__WSGIImplementations.html | https://wiki.python.org/python/web/WSGIImplementations.html | 28176 | 369 | WSGI servers/middleware catalogue |
| web__Twisted.html | https://wiki.python.org/python/web/Twisted.html | 20338 | 316 | Event-driven networking framework (async heritage) |

Totals: **59 captured files** (2 verbatim root copies + 13 category indexes + 44 leaf pages),
1,692,572 bytes total; 0 failures, 0 MISSING.

## KEY_FACTS — line-cited, verified with `rg -n`

Line numbers are real line numbers in the exact files above (HTML is partly minified: cite
the line you actually read, not a conceptual paragraph).

1. `wiki-index.html:216` — Wiki pages migrated from the old MoinMoin wiki carry an explicit "information may be outdated" warning pointing to python.org.
2. `wiki-index.html:94` — The new wiki exposes `language/index.html` as a relative Sphinx link under the `python/` section root.
3. `python-org-doc-index.html:280` — python.org/doc now links to `https://wiki.python.org/python/getting-started/BeginnersGuide.html` (new URL scheme).
4. `python-org-doc-index.html:288` — python.org/doc still links to legacy `https://wiki.python.org/moin/PythonBooks` (old URL scheme).
5. `python-org-doc-index.html:322` — The "Python Wiki" nav item on python.org/doc still points to `https://wiki.python.org/moin/`.
6. `guides__index.html:239` — Guide pages are community-written; some are "historical artifacts from the MoinMoin wiki era" and must be date-checked.
7. `getting-started__index.html:233` — The wiki itself says the official Python tutorial is "still the best single starting point".
8. `security__index.html:221` — The wiki's security section is "thin"; PSRT and project docs are better sources for current guidance.
9. `py3__index.html:249` — Python 2 reached end-of-life on 2020-01-01; the migration section is a historical archive.
10. `packaging__index.html:253` — Packaging history: distutils in 1.6 → setuptools → distribute fork → distutils2 → pip/PyPA.
11. `performance__index.html:227` — Mid-2000s sprint pages are historical context, while general performance tips "hold up well".
12. `database__index.html:241` — DB-API is a standard interface defined in PEP 249; version info is dated but conceptual material holds up.
13. `implementations__index.html:241` — Python the language and Python the program are distinct; multiple independent implementations exist.
14. `web__index.html:259` — Python has been a web language since the late 1990s; much of the section is archival.
15. `testing__index.html:227` — Python has a strong testing culture; pages span unittest/doctest (stdlib) to pytest (third-party).
16. `language__index.html:256` — Language section mixes explanations, proposals and discussions; some historical, some still useful.
17. `documentation__index.html:228` — For actual Python docs, the wiki points to docs.python.org.
18. `language__Generators.html:263` — Generator functions declare a function that behaves like an iterator (usable in a `for` loop).
19. `language__Generators.html:266` — Code simplification is a stated result of generator function and generator expression support.
20. `language__Generators.html:286` — The list-building version holds every 10 MB element in memory; the generator pattern avoids that.
21. `language__Concurrency.html:267` — Concurrent programs sharing resources can produce problems such as race conditions.
22. `language__Concurrency.html:294` — async/await is described as simpler syntactic sugar for coroutines (Python 3.5+).
23. `performance__PythonSpeed.html:251` — Aim for an acceptable execution speed; optimization beyond it wastes time/money.
24. `performance__PythonSpeed.html:259` — Set/dict membership is O(1) versus O(n) for sequences; use a set/dict for `a in b`.
25. `performance__PythonSpeed.html:260` — `''.join(seq)` is O(n); repeated `+`/`+=` can be O(n²) (historical CPython 2.4 caveat in text).
26. `performance__PythonSpeed.html:264` — `collections.deque` gives O(1) queue operations versus O(n) list rebuilds for `pop(0)`/`insert(0, v)`.
27. `guides__HandlingExceptions.html:283` — Prefer specific exceptions: a catch-all can misreport a Ctrl-C `KeyboardInterrupt` as "divide by zero".
28. `testing__UnitTests.html:237` — doctest embeds tests directly in docstrings, combining examples and test cases.
29. `testing__UnitTests.html:243` — Hypothesis is listed for property-based testing.
30. `documentation__Sphinx.html:231` — Sphinx generates docs from reStructuredText, can build API pages via autodoc, and supports multiple outputs/themes.
31. `implementations__CPython.html:242` — CPython is Guido van Rossum's reference implementation, commonly just called "Python".
32. `implementations__PyPy.html:247` — PyPy is a Python implementation written in Python ("it can interpret itself").
33. `getting-started__BeginnersGuide.html:263` — Install Python 3: Mac/Linux distributions may ship an outdated Python 2.
34. `py3__Python2orPython3.html:255` — Python 3 is strongly recommended for new development; Python 2 is EOL and gets no security fixes.
35. `web__WebFrameworks.html:278` — A web framework lets developers write web apps without handling protocols, sockets or process/thread management.
36. `database__SQLite.html:286` — SQLite needs no external DBMS, making it suitable for small database applications.
37. `documentation__Documentation.html:246` — The official documentation landing page is python.org/doc.
38. `language__WithStatement.html:258` — The with-statement page documents the public discussion of PEP 343 (context managers).
39. `security__Security.html:267` — The wiki maintains a "Python Security Response Team" section (point-in-time notes, not current guidance).
40. `language__Decorators.html:270` — `@property` turns a function into a property accessor (with `@property.setter`), listed as a builtin decorator.

## 8 highest-value wiki facts (for the guide)

- `language__Generators.html:263` — generators = iterator-like functions; the basis for lazy functional pipelines.
- `language__Generators.html:266` — generator expressions are explicitly framed as a simplification tool.
- `performance__PythonSpeed.html:259` — O(1) set/dict membership vs O(n) sequence search.
- `performance__PythonSpeed.html:264` — `deque` for queues instead of `pop(0)`/`insert(0, v)`.
- `guides__HandlingExceptions.html:283` — catch specific exceptions; avoid swallowing `KeyboardInterrupt`.
- `testing__UnitTests.html:237` — doctest keeps examples and tests in docstrings (executable documentation).
- `py3__Python2orPython3.html:255` — Python 3 only for new work; Python 2 EOL and unpatched.
- `security__index.html:221` — community wiki security advice is thin: use PSRT/current docs instead.

All 40 items above were located with `rg -n -F` against the captured files on 2026-11-18;
each cited line was read directly from the file. No line was inferred from an external summary.
