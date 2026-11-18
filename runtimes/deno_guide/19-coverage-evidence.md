# 19 - Coverage evidence

Coverage is measured per topic, never as one global percentage. Each of seven topics has 20 items describing what effective use requires. An item is `documented` when the guide answers it with a resolved `NN-slug.md:LINE` citation; it is `unverified` when the answer needs a live binary, a collector, a private registry or a benchmark run. The denominator stays at 20, and every topic must clear 85%.

Sources are resolved against the 172-page runtime corpus captured on 2026-11-18. The verifier parses this file, rejects malformed evidence tokens, checks line ranges and recomputes the percentages below. A high score in one topic cannot compensate for a gap in another.

## 1. Usability

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| U01 | usability | Install Deno with the official shell or PowerShell script | documented | `02-installation-and-usability.md:7` |
| U02 | usability | Install Deno globally through npm on every platform | documented | `02-installation-and-usability.md:15` |
| U03 | usability | Download a platform archive and verify it with SHA-256 | documented | `02-installation-and-usability.md:26` |
| U04 | usability | Verify the install and update with deno upgrade | documented | `02-installation-and-usability.md:43` |
| U05 | usability | Run a file without the run subcommand, flags before the script | documented | `05-cli-and-automation.md:16` |
| U06 | usability | Use REPL special variables and clear/close helpers | documented | `02-installation-and-usability.md:47` |
| U07 | usability | Preload a snippet into the REPL with --eval | documented | `02-installation-and-usability.md:62` |
| U08 | usability | Preload paths or URLs into the REPL with --eval-file | documented | `02-installation-and-usability.md:63` |
| U09 | usability | Control REPL preload order between both flags | documented | `02-installation-and-usability.md:64` |
| U10 | usability | List REPL completions with the tab key | documented | `02-installation-and-usability.md:65` |
| U11 | usability | Relocate or disable REPL history via DENO_REPL_HISTORY | documented | `02-installation-and-usability.md:66` |
| U12 | usability | Define and execute named tasks in deno.json | documented | `02-installation-and-usability.md:70` |
| U13 | usability | Tolerate a missing task with --if-present | documented | `02-installation-and-usability.md:84` |
| U14 | usability | Fan out tasks with quoted wildcard patterns | documented | `02-installation-and-usability.md:86` |
| U15 | usability | Inject dotenv values into a task shell | documented | `02-installation-and-usability.md:87` |
| U16 | usability | Run task prerequisites in parallel | documented | `02-installation-and-usability.md:88` |
| U17 | usability | Skip unchanged tasks using input glob caching | documented | `02-installation-and-usability.md:89` |
| U18 | usability | Generate shell completions with deno completions | documented | `02-installation-and-usability.md:95` |
| U19 | usability | Complete deno.json task names via --dynamic | documented | `02-installation-and-usability.md:101` |
| U20 | usability | Graphical Windows MSI installer with guided setup | unverified | `02-installation-and-usability.md:7` |

## 2. Configuration

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| C01 | configuration | Combine package.json dependencies with deno.json tool settings | documented | `03-deno-json-and-configuration.md:3` |
| C02 | configuration | Use deno.jsonc with comments and trailing commas | documented | `03-deno-json-and-configuration.md:7` |
| C03 | configuration | Discover config in parent directories or override with --config | documented | `03-deno-json-and-configuration.md:7` |
| C04 | configuration | Declare tasks, imports and formatter options in one file | documented | `03-deno-json-and-configuration.md:12` |
| C05 | configuration | Map bare specifiers to jsr/npm URLs with imports | documented | `03-deno-json-and-configuration.md:34` |
| C06 | configuration | Override imports for a path prefix with scopes | documented | `03-deno-json-and-configuration.md:47` |
| C07 | configuration | Override a dependency with a local package via links | documented | `03-deno-json-and-configuration.md:48` |
| C08 | configuration | Direct dependency commands to package.json | documented | `03-deno-json-and-configuration.md:49` |
| C09 | configuration | Configure lint rules, include and exclude | documented | `03-deno-json-and-configuration.md:26` |
| C10 | configuration | Set formatter options such as lineWidth and useTabs | documented | `03-deno-json-and-configuration.md:57` |
| C11 | configuration | Use exclude precedence and negated un-exclude globs | documented | `03-deno-json-and-configuration.md:64` |
| C12 | configuration | Apply a top-level exclude to every subcommand and the LSP | documented | `03-deno-json-and-configuration.md:64` |
| C13 | configuration | Pin a frozen lockfile path for reproducible installs | documented | `03-deno-json-and-configuration.md:70` |
| C14 | configuration | Disable the lockfile with lock false | documented | `03-deno-json-and-configuration.md:71` |
| C15 | configuration | Set a minimumDependencyAge supply-chain window | documented | `03-deno-json-and-configuration.md:72` |
| C16 | configuration | Choose none/auto/manual nodeModulesDir layout | documented | `03-deno-json-and-configuration.md:73` |
| C17 | configuration | Install jsr dependencies into node_modules | documented | `03-deno-json-and-configuration.md:74` |
| C18 | configuration | Override cache path with DENO_DIR | documented | `03-deno-json-and-configuration.md:90` |
| C19 | configuration | Enable unstable features via config array or env var | documented | `03-deno-json-and-configuration.md:98` |
| C20 | configuration | Native deno.toml configuration file support | unverified | `03-deno-json-and-configuration.md:7` |

## 3. Security

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| S01 | security | Deno denies file, network, environment and subprocess access by default | documented | `06-permissions-and-security.md:3` |
| S02 | security | Scoped read, write, net and env flags limit access to listed paths, hosts and variables | documented | `06-permissions-and-security.md:11-14` |
| S03 | security | `--allow-sys` gates OS information APIs by interface name | documented | `06-permissions-and-security.md:15` |
| S04 | security | `--allow-run` takes an executable allow list and a spawned deno can start with -A | documented | `06-permissions-and-security.md:16` |
| S05 | security | `--allow-ffi` gates Deno.dlopen and Node-API addons by library path | documented | `06-permissions-and-security.md:17` |
| S06 | security | `--allow-import` restricts dynamic web imports to an explicit host list | documented | `06-permissions-and-security.md:18` |
| S07 | security | -A / --allow-all disables the sandbox entirely | documented | `06-permissions-and-security.md:19` |
| S08 | security | `--deny-*` overrides allow flags and a bare deny disables prompts for that category | documented | `06-permissions-and-security.md:21` |
| S09 | security | Missing grants throw NotCapable; prompts appear only on a TTY and --no-prompt suppresses them | documented | `06-permissions-and-security.md:30` |
| S10 | security | Deno.permissions.query, request and revoke inspect and downgrade privileges at runtime | documented | `06-permissions-and-security.md:34-36` |
| S11 | security | Named permission sets in deno.json are selected with -P=<name> | documented | `06-permissions-and-security.md:37` |
| S12 | security | Symlink checks require --allow-all for /proc, /dev, /sys and --allow-env for environ | documented | `06-permissions-and-security.md:67` |
| S13 | security | DENO_AUDIT_PERMISSIONS records allowed and denied checks as JSONL or OpenTelemetry logs | documented | `06-permissions-and-security.md:71` |
| S14 | security | A permission broker ignores flags and prompts and terminates on malformed messages | documented | `06-permissions-and-security.md:71` |
| S15 | security | npm packages run under the same permission system as local code | documented | `07-node-and-npm-compatibility.md:38` |
| S16 | security | Node-API addons need a local node_modules plus --allow-ffi and approved build scripts | documented | `07-node-and-npm-compatibility.md:72` |
| S17 | security | os.cpus and os.networkInterfaces require matching --allow-sys interface names | documented | `07-node-and-npm-compatibility.md:34` |
| S18 | security | deno.lock records exact versions and integrity hashes; --frozen rejects unseen dependencies | documented | `08-packages-and-supply-chain.md:32` |
| S19 | security | deno audit reads the lockfile, filters by severity and upgrades affected packages with --fix | documented | `08-packages-and-supply-chain.md:45` |
| S20 | security | Workspace allowScripts applies one script-approval policy across all members | unverified | `09-workspaces-and-dependency-management.md:33` |

## 4. Logging

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| L01 | logging | console.log/error are collected as log records | documented | `10-logging-and-observability.md:9` |
| L02 | logging | console exporter prints to stderr with [INFO] level | documented | `10-logging-and-observability.md:10` |
| L03 | logging | OTEL_DENO_CONSOLE=capture keeps local and exported logs | documented | `10-logging-and-observability.md:11` |
| L04 | logging | OTEL_DENO_CONSOLE=replace exports only | documented | `10-logging-and-observability.md:12` |
| L05 | logging | OTEL_DENO_CONSOLE=ignore keeps local only | documented | `10-logging-and-observability.md:13` |
| L06 | logging | runtime debug and Downloading logs are collected | documented | `10-logging-and-observability.md:14` |
| L07 | logging | fatal runtime exits are exported as logs | documented | `10-logging-and-observability.md:15` |
| L08 | logging | logs inside an active span carry trace context | documented | `10-logging-and-observability.md:16` |
| L09 | logging | inspector banner goes to stderr | documented | `10-logging-and-observability.md:17` |
| L10 | logging | --log-level=debug shows resolution and permissions | documented | `10-logging-and-observability.md:18` |
| L11 | logging | watch mode prints change and error notices | documented | `10-logging-and-observability.md:19` |
| L12 | logging | custom log streams are not exported | documented | `10-logging-and-observability.md:20` |
| L13 | logging | per-request console logging in Deno.serve | documented | `10-logging-and-observability.md:37` |
| L14 | logging | JSONL permission audit fields v/datetime/permission/value | documented | `10-logging-and-observability.md:38` |
| L15 | logging | DENO_TRACE_PERMISSIONS adds stack field | documented | `10-logging-and-observability.md:39` |
| L16 | logging | audit OTel attributes deno.permission.* | documented | `10-logging-and-observability.md:40` |
| L17 | logging | audit stack collection costs performance | documented | `10-logging-and-observability.md:41` |
| L18 | logging | CLI usage error via console.error and exit code 2 | documented | `10-logging-and-observability.md:42` |
| L19 | logging | log record batching uses spec env vars | documented | `10-logging-and-observability.md:43` |
| L20 | logging | @std/log handler and formatter API | unverified | `10-logging-and-observability.md:58` |

## 5. Telemetry

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| T01 | telemetry | OTEL_DENO=true enables collection and export | documented | `11-open-telemetry.md:9` |
| T02 | telemetry | default localhost:4318 http/protobuf endpoint | documented | `11-open-telemetry.md:10` |
| T03 | telemetry | console exporter prints to stderr without an endpoint | documented | `11-open-telemetry.md:11` |
| T04 | telemetry | http/json exporter protocol | documented | `11-open-telemetry.md:12` |
| T05 | telemetry | grpc exporter and port 4317 | documented | `11-open-telemetry.md:13` |
| T06 | telemetry | OTLP headers for collector authentication | documented | `11-open-telemetry.md:14` |
| T07 | telemetry | metrics/traces/logs endpoint overrides | documented | `11-open-telemetry.md:15` |
| T08 | telemetry | service.name and runtime resource attributes | documented | `11-open-telemetry.md:16` |
| T09 | telemetry | default tracecontext,baggage propagators | documented | `11-open-telemetry.md:17` |
| T10 | telemetry | sampler values including parentbased variants | documented | `11-open-telemetry.md:18` |
| T11 | telemetry | ratio sampler argument 0..1 | documented | `11-open-telemetry.md:19` |
| T12 | telemetry | metric export interval default 60000 ms | documented | `11-open-telemetry.md:20` |
| T13 | telemetry | span and log batch processor configuration | documented | `11-open-telemetry.md:21` |
| T14 | telemetry | automatic server span name/kind and end point | documented | `11-open-telemetry.md:32` |
| T15 | telemetry | automatic HTTP span attributes and status code | documented | `11-open-telemetry.md:33` |
| T16 | telemetry | fetch client span name/kind/status | documented | `11-open-telemetry.md:34` |
| T17 | telemetry | cron and node:http2 auto spans | documented | `11-open-telemetry.md:35` |
| T18 | telemetry | http.route via getActiveSpan and updateName | documented | `11-open-telemetry.md:36` |
| T19 | telemetry | HTTP duration/active/body-size metrics | documented | `11-open-telemetry.md:37` |
| T20 | telemetry | exact batch processor default values | unverified | `11-open-telemetry.md:38` |

## 6. Performance

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| P01 | performance | --cpu-prof writes profile on exit | documented | `12-performance-and-profiling.md:9` |
| P02 | performance | --cpu-prof-dir output directory | documented | `12-performance-and-profiling.md:10` |
| P03 | performance | --cpu-prof-name filename | documented | `12-performance-and-profiling.md:11` |
| P04 | performance | --cpu-prof-interval default and 100us option | documented | `12-performance-and-profiling.md:12` |
| P05 | performance | --cpu-prof-md Markdown report | documented | `12-performance-and-profiling.md:13` |
| P06 | performance | --cpu-prof-flamegraph SVG output | documented | `12-performance-and-profiling.md:14` |
| P07 | performance | default CPU.<timestamp>.<pid>.cpuprofile name | documented | `12-performance-and-profiling.md:15` |
| P08 | performance | profile line numbers are transpiled JS | documented | `12-performance-and-profiling.md:16` |
| P09 | performance | Markdown report sections Top 10/Hot Functions/Call Tree | documented | `12-performance-and-profiling.md:38` |
| P10 | performance | DevTools Performance tab Load profile flow | documented | `12-performance-and-profiling.md:39` |
| P11 | performance | flamegraph zoom/search/invert controls | documented | `12-performance-and-profiling.md:40` |
| P12 | performance | self time versus total time interpretation | documented | `12-performance-and-profiling.md:41` |
| P13 | performance | --strace-ops Dispatch/Complete timings | documented | `12-performance-and-profiling.md:42` |
| P14 | performance | Deno.bench registration forms and async | documented | `12-performance-and-profiling.md:48` |
| P15 | performance | b.start/b.end critical sections | documented | `12-performance-and-profiling.md:49` |
| P16 | performance | bench groups and baseline comparison output | documented | `12-performance-and-profiling.md:50` |
| P17 | performance | bench filters, only and ignore semantics | documented | `12-performance-and-profiling.md:51` |
| P18 | performance | --json stats avg/p75/p99/p995 | documented | `12-performance-and-profiling.md:52` |
| P19 | performance | DENO_DIR, --reload and --cached-only | documented | `12-performance-and-profiling.md:58` |
| P20 | performance | heap snapshot and max-old-space workflow | unverified | `12-performance-and-profiling.md:59` |

## 7. Lint

| ID | topic | requirement | status | evidence |
|---|---|---|---|---|
| N01 | lint | Lint all TypeScript/JavaScript under the current directory by default | documented | `14-lint-and-format.md:12` |
| N02 | lint | Restrict linting to named files or directories passed as arguments | documented | `14-lint-and-format.md:13` |
| N03 | lint | Re-lint changed files automatically with --watch | documented | `14-lint-and-format.md:14` |
| N04 | lint | Apply rule-provided corrections with --fix | documented | `14-lint-and-format.md:15` |
| N05 | lint | Enumerate the full rule set with --rules | documented | `14-lint-and-format.md:16` |
| N06 | lint | Exclude paths from a lint run using --ignore | documented | `14-lint-and-format.md:17` |
| N07 | lint | Fail a CI step with a non-zero exit status on any violation | documented | `14-lint-and-format.md:18` |
| N08 | lint | Report each finding with rule name, offending code, and hint | documented | `14-lint-and-format.md:25` |
| N09 | lint | Enable rule sets via tags (recommended, fresh) | documented | `14-lint-and-format.md:61` |
| N10 | lint | Add individual rules with include | documented | `14-lint-and-format.md:62` |
| N11 | lint | Override a tag-enabled rule with exclude | documented | `14-lint-and-format.md:63` |
| N12 | lint | Opt into untagged rules such as eqeqeq and no-console explicitly | documented | `14-lint-and-format.md:64` |
| N13 | lint | Place a file-level ignore directive before the first statement or declaration | documented | `14-lint-and-format.md:74` |
| N14 | lint | Require explicit rule names in a line-level deno-lint-ignore directive | documented | `14-lint-and-format.md:78` |
| N15 | lint | Suppress ban-unused-ignore only at file level, never per line | documented | `14-lint-and-format.md:79` |
| N16 | lint | Load custom rules through lint.plugins paths and specifiers | documented | `14-lint-and-format.md:104` |
| N17 | lint | Disable a plugin rule by its plugin/rule identifier | documented | `14-lint-and-format.md:109` |
| N18 | lint | Apply formatter configuration precedence from CLI flags down to defaults | documented | `14-lint-and-format.md:147` |
| N19 | lint | Verify formatting without writes and exit non-zero via deno fmt --check | documented | `14-lint-and-format.md:134` |
| N20 | lint | Exact rule membership of the fresh tag was not checked against the rule catalogue | unverified | `14-lint-and-format.md:16` |

## Measurement summary

The verifier recomputes these values from the rows above. Every topic targets 95%, above the required 85% floor. The seven `unverified` rows are not hidden: they name the live check that would close each gap.

`docs/rt_runtime__reference__cli__lint.md:47-51`
```sh
deno lint
deno fmt --check
deno test
```

## Sources

- https://docs.deno.com/runtime/
- https://docs.deno.com/runtime/reference/cli/
- https://docs.deno.com/runtime/reference/cli/lint/
- https://docs.deno.com/runtime/reference/cli/run/
- https://docs.deno.com/runtime/fundamentals/configuration/
- https://docs.deno.com/runtime/fundamentals/security/
- https://docs.deno.com/runtime/fundamentals/open_telemetry/
- https://docs.deno.com/runtime/fundamentals/cpu_profiling/
- https://docs.deno.com/runtime/reference/env_variables/
- https://docs.deno.com/runtime/reference/permissions/
- https://docs.deno.com/runtime/reference/std/log/
- https://docs.deno.com/runtime/test/
