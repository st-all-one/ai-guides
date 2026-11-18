# 15 - Testing and coverage

Deno bundles a test runner for JavaScript and TypeScript with no dependencies to
install (`docs/rt_runtime__test.md:13-22`). It accepts two first-class APIs:
`Deno.test`, which exposes per-test permissions and sanitizer toggles, and
`node:test`, whose suites also run unchanged on Node.js; both can be mixed in one
project (`docs/rt_runtime__test.md:24-50`).

## Runner and discovery

| Flag or definition | Observable behavior |
|---|---|
| `deno test` | Recursively find files matching `{*_,*.,}test.{ts,tsx,mts,js,mjs,jsx}` |
| any script under `__tests__/` | Treated as a test file regardless of name |
| `deno test --parallel` | Run test modules in parallel |
| `deno test --filter "/re/"` | Select tests by substring or regex |
| `deno test --fail-fast` | Stop after the first failure |
| `deno test --shard=1/3` | Run one of three balanced groups, 1-based |
| `deno test --shuffle` | Randomize order to expose hidden dependencies |
| `deno test --retry=2` | Re-run a failing test, pass if any attempt passes |
| `deno test --repeats=3` | Run each test three times, fail if any run fails |

Source: `docs/rt_runtime__test.md:95-125`, `:341-358`, `:469-492`,
`docs/rt_runtime__reference__cli__test.md:166-224`. A test uses an assertion
library only for expectations, not for registration
(`docs/rt_runtime__test.md:58-78`):
```ts
import { assertEquals } from "jsr:@std/assert";
import { delay } from "jsr:@std/async";

Deno.test("simple test", () => {
  const x = 1 + 2;
  assertEquals(x, 3);
});

Deno.test("async test", async () => {
  const x = 1 + 2;
  await delay(100);
  assertEquals(x, 3);
});

Deno.test({
  name: "read file test",
  fn: () => {
    const data = Deno.readTextFileSync("./somefile.txt");
    assertEquals(data, "expected content");
  },
});
```

## Structure and selection

| Facility | Semantics |
|---|---|
| test steps | `t.step()` breaks a test into setup/teardown parts |
| `timeout` | deadline catches async hangs and sync hot loops; `0` means none |
| `retry` / `repeats` | compose; each attempt re-runs hooks and leak baseline |
| `Deno.test.each` | registers one real test per table case; `%i`, `%s`, `$key` templates |
| hooks | `beforeAll`/`beforeEach` FIFO, `afterEach`/`afterAll` LIFO |
| `ignore` / `Deno.test.ignore` | skip conditionally or unconditionally |
| `only` | focus tests, but the whole run still fails |
| `--changed` / `--related` | one-shot selection by git state or dependency graph |

Source: `docs/rt_runtime__test.md:127-240`, `:242-339`, `:412-467`,
`:360-410`. `expect`-style assertions come from `jsr:@std/expect`, and
`@std/testing/bdd` supplies `describe`/`it` grouping
(`docs/rt_runtime__test.md:81-93`, `:508-537`).

## Mocking and test doubles

| Double | Behavior | Restoration |
|---|---|---|
| `spy(fn)` | records calls, real behavior runs | dispose method with `using` or call `restore()` |
| `stub(obj, "m", impl)` | replaces implementation, still records calls | same |
| `returnsNext([...])` | returns a sequence, one value per call | n/a |
| `FakeTime` | replaces `Date`, `setTimeout`, `setInterval`; `tick()` advances | `using` restores clock |
| `Deno.lint.runPlugin` | returns diagnostics for a lint plugin | n/a |

Source: `docs/rt_runtime__test__mocking.md:20-246`,
`docs/rt_runtime__reference__lint_plugins.md:277-301`. A stub at the dependency
boundary is disposable (`docs/rt_runtime__test__mocking.md:125-131`):
```ts
Deno.test("greetUser with stubbed getUserName", () => {
  // Replace the implementation with a controlled one
  using getUserNameStub = stub(deps, "getUserName", () => "Test User");

  assertEquals(greetUser(123), "Hello, Test User!");
  assertEquals(getUserNameStub.calls.length, 1);
});
```

## Snapshots

| Aspect | Behavior |
|---|---|
| `t.assertSnapshot(value)` | serialize and compare against a stored reference |
| creation/update | `deno test --update-snapshots` (or `-u`) |
| storage | `__snapshots__/<module>.snap`, no permissions needed in default location |
| key | test name plus counter, e.g. `isSnapshotMatch 1` |
| serializer | `Deno.inspect` with sorted keys; overridable via `serializer`, `name`, `dir`, `path`, `msg` |
| CI | run without the update flag so changed output fails |

Source: `docs/rt_runtime__test__snapshots.md:11-159`. The `.snap` file is plain
TypeScript (`docs/rt_runtime__test__snapshots.md:60-67`):
```ts
export const snapshot = {};

snapshot[`isSnapshotMatch 1`] = `
{
  example: 123,
  hello: "world!",
}
`;
```

Review the `git diff` of snapshots before committing: update mode records bugs
as expected output just as readily as intended changes
(`docs/rt_runtime__test__snapshots.md:81-101`). `node:test` offers
`t.assert.fileSnapshot` as a separate API
(`docs/rt_runtime__test__snapshots.md:161-178`).

## Sanitizers

| Sanitizer | Detects | Default |
|---|---|---|
| resource | unclosed `FsFile` handles, connections, fetch bodies, timers | off since 2.8 |
| async op | operations not awaited before the test ends | off since 2.8 |
| exit | calls to `Deno.exit()` that fake success | on |

Global enablement has five scopes, highest precedence first: per-test fields,
`Deno.test.sanitizer()`, `--sanitize-ops`/`--sanitize-resources`,
`DENO_TEST_SANITIZE_OPS`/`DENO_TEST_SANITIZE_RESOURCES`, then `deno.json`
(`docs/rt_runtime__test__sanitizers.md:128-133`). The lowest-precedence form:
```json
   {
     "test": {
       "sanitizeOps": true,
       "sanitizeResources": true
     }
   }
```

`--trace-leaks` traces the source of a leak
(`docs/rt_runtime__reference__cli__test.md:230-236`).

## Coverage

| Step | Command or rule |
|---|---|
| collect | `deno test --coverage` writes V8 profiles into `coverage/` |
| alternative | `deno run --coverage=cov_profile main.ts` for scripts and servers |
| subprocesses | inherit `DENO_COVERAGE_DIR` |
| stale data | `--clean` empties the directory first |
| report | `deno coverage coverage/`, `--detailed`, `--html`, `--lcov` |
| skip code | `// deno-coverage-ignore` plus `-start`/`-stop` and `-file` |

Source: `docs/rt_runtime__test__coverage.md:9-64`, `:66-182`, `:184-206`. A
report shows branch, function, and line percentages per file
(`docs/rt_runtime__test__coverage.md:78-82`):
```console
$ deno coverage coverage/
| File      | Branch % | Function % | Line % |
| --------- | -------- | ---------- | ------ |
| main.ts   |     75.0 |      100.0 |   80.0 |
| All files |     75.0 |      100.0 |   80.0 |
```

`deno coverage` has no built-in threshold flag; gate in CI by summing `LF` and
`LH` records from lcov (`docs/rt_runtime__test__coverage.md:158-161`):
```sh
deno coverage --lcov coverage/ > coverage.lcov
awk -F: '/^LF/ {lf += $2} /^LH/ {lh += $2}
  END {pct = 100 * lh / lf; printf "line coverage: %.1f%%\n", pct;
  exit (pct < 80)}' coverage.lcov
```

Doc tests close the loop: `deno test --doc` extracts fenced examples from JSDoc
and Markdown, auto-imports exported items, and applies narrowed permissions from
a leading hashbang (`docs/rt_runtime__test__doc_tests.md:11-159`,
`docs/rt_runtime__reference__cli__test.md:238-245`).

## Sources

- https://docs.deno.com/runtime/test/
- https://docs.deno.com/runtime/reference/cli/test/
- https://docs.deno.com/runtime/test/coverage/
- https://docs.deno.com/runtime/reference/cli/coverage/
- https://docs.deno.com/runtime/test/mocking/
- https://docs.deno.com/runtime/test/snapshots/
- https://docs.deno.com/runtime/test/sanitizers/
- https://docs.deno.com/runtime/test/doc_tests/
- https://jsr.io/@std/testing
- https://jsr.io/@std/assert
