# 21 - Testing for Determinism

This chapter answers how to make tests repeatable with the standard library plus uv-driven CI, and which popular tools are only listed rather than verified in the captures. It depends on chapter 05 (immutability and determinism) for seeded-randomness strategy and chapter 19 (scripts and tools) for `uv run` basics.

## Framework map: stdlib first

| Framework | Status in captures | Evidence |
|---|---|---|
| `unittest` | Standard library, full-featured | `samples/library__unittest.rst:44-47` describes sibling `doctest`; `samples/testing__UnitTests.html:236` — **wiki, lower authority** |
| `doctest` | Standard library; embeds tests in docstrings | `samples/library__unittest.rst:46-47`, `samples/testing__UnitTests.html:237` — **wiki, lower authority** |
| `pytest` | Third-party; lighter syntax (listed, not verified) | `samples/library__unittest.rst:53-55`, `samples/testing__UnitTests.html:238` — **wiki, lower authority** |
| Hypothesis | Third-party property-based testing (listed, not verified) | `samples/testing__UnitTests.html:243` — **wiki, lower authority** |

The wiki page carries an explicit legacy warning that information may be outdated (`samples/testing__UnitTests.html:229-231` — **wiki, lower authority**). Specific pytest fixtures, plugins and Hypothesis strategies are **not verified**: no official pytest or Hypothesis page was captured, so this chapter describes no such API. Derived: use `unittest` when the dependency surface must be zero, and treat third-party runners as an opt-in layer whose behaviour you verify separately.

## Anatomy of a deterministic test

A test method is any method whose name starts with `test` (`samples/library__unittest.rst:108-110`). The core assertions are `assertEqual`, `assertTrue`/`assertFalse` and `assertRaises`, used instead of the `assert` statement so the runner can accumulate all results (`samples/library__unittest.rst:112-117`). `subTest` parameterizes cases inside one method (`samples/library__unittest.rst:643`, `samples/library__unittest.rst:815`).

```python
import random, unittest

class NormTests(unittest.TestCase):
    def setUp(self):
        self.rng = random.Random(8675309)  # local, seeded generator

    def test_normalise(self):
        for raw, expected in [(" A ", "a"), ("", "")]:
            with self.subTest(raw=raw):
                self.assertEqual(raw.strip().lower(), expected)

    def test_rejects_none(self):
        with self.assertRaises(TypeError):
            self.rng.choice(None)
```

Derived: inject a seeded `random.Random` instance rather than reseeding module-level state; this avoids cross-test order dependence and keeps the failure reproducible from the seed value alone.

## Isolation and ordering

`setUp` runs before each test method and `tearDown` after it; if `setUp` succeeded, `tearDown` runs whether the test passed or not (`samples/library__unittest.rst:397-398`, `samples/library__unittest.rst:427-431`). Test execution order is determined by sorting method names with the built-in string ordering (`samples/library__unittest.rst:409-412`). Skips are expressed with `skip`, `skipIf` and `skipUnless` decorators (`samples/library__unittest.rst:541`, `samples/library__unittest.rst:545`, `samples/library__unittest.rst:551`).

| Concern | Mechanism | Evidence |
|---|---|---|
| Per-test fixture | `setUp` / `tearDown` | `samples/library__unittest.rst:397-431` |
| Predictable order | Method-name sort (do not rely on definition order) | `samples/library__unittest.rst:409-412` |
| Multiple inputs | `subTest` | `samples/library__unittest.rst:643-654` |
| Platform/version gate | `skipIf` / `skipUnless` | `samples/library__unittest.rst:545-554` |
| Failure diagnosis | `pdb.set_trace()` or built-in `breakpoint()`, then `continue` | `samples/library__pdb.rst:39-49` |
| doctest reuse | `doctest.DocTestSuite` adapts doctests into a unittest suite | `samples/library__unittest.rst:515-518` |
| Discovery | `python -m unittest discover`; files must be importable modules | `samples/library__unittest.rst:270-280` |

Derived: if a test only passes when run after another test, it is not isolated — move shared state into `setUp` and clean up in `tearDown` rather than adding order-dependent sleeps or global resets.

## Time and randomness

`random.seed(a=None, version=2)` initializes the generator; when `a` is omitted or `None`, the current system time is used, with OS randomness sources used instead where available (`samples/library__random.rst:72-79`). `getstate()` captures internal state and `setstate()` restores it (`samples/library__random.rst:98-108`). The generator is deterministic and therefore unsuitable for cryptographic use (`samples/library__random.rst:25-30`), which is a security boundary, not a testing problem.

| Source of nondeterminism | Deterministic control | Evidence |
|---|---|---|
| PRNG sequence | Seed an instance with a fixed int; or save/restore `getstate()` | `samples/library__random.rst:72-84`, `samples/library__random.rst:98-108` |
| Wall clock | None captured as a stdlib test utility | not verified |
| Timezone / locale | None captured | not verified |

Derived: pass a clock callable into the code under test and substitute a fixed value in tests; the standard library's time-injection patterns are outside these captures, so treat this as engineering advice rather than a documented API.

## Areas explicitly not verified

`library__tempfile.rst`, `library__unittest.mock.rst`, `library__doctest.rst` and any coverage-tool documentation were **not captured**. Therefore: temporary-directory helpers, `unittest.mock` patching APIs, doctest directive semantics and coverage measurement tools are marked **not verified** here. Derived: prefer per-test temporary directories supplied through `setUp`/`tearDown` and explicit function parameters over global monkey-patching, but confirm the exact stdlib API against current documentation before coding.

## CI with uv

`uv run` locks and syncs the project before invoking a command (`samples/concepts__projects__sync.md:7`), so a test invocation is reproducible when the lockfile is committed. The captured GitHub Actions example pins `setup-uv`, installs with `uv sync --locked --all-extras --dev` and runs tests with `uv run pytest tests` (`samples/guides__integration__github.md:190-197`).

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
- name: Install uv
  uses: astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9 # v9.0.0
- name: Install the project
  run: uv sync --locked --all-extras --dev
- name: Run tests
  run: uv run pytest tests
```

Derived: `--locked` is the determinism gate — it fails CI if `pyproject.toml` and `uv.lock` disagree instead of quietly resolving new versions (`samples/concepts__projects__sync.md:15`). The `pytest` command is reproduced from the captured example; pytest itself remains third-party and not verified.

## Sources

- https://docs.python.org/3/library/unittest.html
- https://docs.python.org/3/library/pdb.html
- https://docs.python.org/3/library/random.html
- https://docs.python.org/3/library/doctest.html
- https://wiki.python.org/python/testing/UnitTests.html (community wiki, lower authority; legacy)
- https://docs.astral.sh/uv/concepts/projects/sync/
- https://docs.astral.sh/uv/guides/integration/github/
