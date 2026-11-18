# 23 - Coverage evidence

This chapter makes the coverage claim measurable. Each topic has 20 items describing what effective use requires. An item is `documented` when the guide answers it with a resolved `path:line` citation; it is `unverified` when only a live Gateway can answer. Coverage is `documented / 20`, with a target of at least 85% in every topic. The verifier parses the tables, resolves every evidence line, and fails any topic below the target.

Metric scope (**derived**): this measures documentation coverage of a curated checklist, not runtime validation. Unverified items are counted honestly instead of being hidden.

## 1. Errors

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| E01 | errors | transient vs permanent errors | documented | `19-errors-and-retries-deep.md:11` |
| E02 | errors | attempts, jitter, backoff, caps | documented | `19-errors-and-retries-deep.md:22` |
| E03 | errors | retry budgets and success reset | documented | `19-errors-and-retries-deep.md:22` |
| E04 | errors | cooldown and escalation | documented | `19-errors-and-retries-deep.md:30` |
| E05 | errors | idempotency and effect count | documented | `19-errors-and-retries-deep.md:26` |
| E06 | errors | delivery leases and duplicates | documented | `19-errors-and-retries-deep.md:26` |
| E07 | errors | failover on exhaustion | documented | `19-errors-and-retries-deep.md:30` |
| E08 | errors | errors that block fallback | documented | `19-errors-and-retries-deep.md:30` |
| E09 | errors | restart and resume in-flight work | documented | `19-errors-and-retries-deep.md:49` |
| E10 | errors | unexpected exits and wedged loop | documented | `19-errors-and-retries-deep.md:49` |
| E11 | errors | cancel, abort, lifecycle close | documented | `19-errors-and-retries-deep.md:49` |
| E12 | errors | failed update and rollback | documented | `19-errors-and-retries-deep.md:53` |
| E13 | errors | SQLite integrity failure | documented | `19-errors-and-retries-deep.md:57` |
| E14 | errors | migration and newer schema | documented | `19-errors-and-retries-deep.md:57` |
| E15 | errors | compaction safeguards | documented | `19-errors-and-retries-deep.md:57` |
| E16 | errors | terminal reply and partial delivery | documented | `19-errors-and-retries-deep.md:61` |
| E17 | errors | NO_REPLY and silent outcomes | documented | `19-errors-and-retries-deep.md:61` |
| E18 | errors | automation alerts and run history | documented | `19-errors-and-retries-deep.md:61` |
| E19 | errors | error logging and egress redaction | documented | `19-errors-and-retries-deep.md:73` |
| E20 | errors | live exhaustion + crash resend | unverified | `17-coverage-and-limits.md:90` |

## 2. Logs

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| L01 | logs | log surfaces and file destination | documented | `20-logs-and-observability-deep.md:7` |
| L02 | logs | level, rotation, 24h prune | documented | `20-logs-and-observability-deep.md:7` |
| L03 | logs | verbose is console-only | documented | `20-logs-and-observability-deep.md:8` |
| L04 | logs | raw disk vs redacted egress | documented | `20-logs-and-observability-deep.md:13` |
| L05 | logs | redactPatterns and masking | documented | `20-logs-and-observability-deep.md:14` |
| L06 | logs | never log tool payloads | documented | `20-logs-and-observability-deep.md:15` |
| L07 | logs | config/audit/CLI masking | documented | `20-logs-and-observability-deep.md:15` |
| L08 | logs | bounded logs with IDs only | documented | `20-logs-and-observability-deep.md:16` |
| L09 | logs | tail with caps and reconnect | documented | `20-logs-and-observability-deep.md:20` |
| L10 | logs | sanitized support bundle | documented | `20-logs-and-observability-deep.md:21` |
| L11 | logs | OTLP vs stdout JSONL | documented | `20-logs-and-observability-deep.md:22` |
| L12 | logs | model.usage event fields | documented | `20-logs-and-observability-deep.md:23` |
| L13 | logs | inbound to delivery correlation | documented | `20-logs-and-observability-deep.md:23` |
| L14 | logs | traceId/spanId join | documented | `20-logs-and-observability-deep.md:23` |
| L15 | logs | diagnostics-otel plugin | documented | `20-logs-and-observability-deep.md:27` |
| L16 | logs | exported spans and safe attrs | documented | `20-logs-and-observability-deep.md:28` |
| L17 | logs | model and token metrics | documented | `20-logs-and-observability-deep.md:29` |
| L18 | logs | captureContent and traceparent | documented | `20-logs-and-observability-deep.md:30` |
| L19 | logs | sampling, flush, filtering | documented | `20-logs-and-observability-deep.md:43` |
| L20 | logs | live collector delivery | unverified | `17-coverage-and-limits.md:90` |

## 3. Performance

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| P01 | performance | prefix stability and cache lineage | documented | `21-performance-deep.md:6` |
| P02 | performance | retention TTLs and multipliers | documented | `21-performance-deep.md:6` |
| P03 | performance | tool-definition cost | documented | `21-performance-deep.md:6` |
| P04 | performance | queue steering and backpressure | documented | `21-performance-deep.md:9` |
| P05 | performance | rate limits and bursts | documented | `21-performance-deep.md:12` |
| P06 | performance | worker admission limits | documented | `21-performance-deep.md:15` |
| P07 | performance | compute/reader/writer pools | documented | `21-performance-deep.md:19-20` |
| P08 | performance | file-tool planning workers | documented | `21-performance-deep.md:21` |
| P09 | performance | cloud-worker placement | documented | `21-performance-deep.md:24` |
| P10 | performance | warm images and reserves | documented | `21-performance-deep.md:24` |
| P11 | performance | native inference placement | documented | `21-performance-deep.md:34` |
| P12 | performance | job budgets | documented | `21-performance-deep.md:37` |
| P13 | performance | failover and cooldown ladder | documented | `21-performance-deep.md:40` |
| P14 | performance | timeouts and stickiness | documented | `21-performance-deep.md:40` |
| P15 | performance | SQLite contention | documented | `21-performance-deep.md:43` |
| P16 | performance | profiling method | documented | `21-performance-deep.md:46` |
| P17 | performance | bottleneck taxonomy | documented | `21-performance-deep.md:48-53` |
| P18 | performance | sizing worksheet | documented | `21-performance-deep.md:58-64` |
| P19 | performance | cost and usage controls | documented | `21-performance-deep.md:67` |
| P20 | performance | measured throughput/latency | unverified | `21-performance-deep.md:70-71` |

## 4. Security

| ID | Topic | Requirement | Status | Evidence |
|---|---|---|---|---|
| S01 | security | single-operator trust boundary | documented | `22-security-hardening-deep.md:3` |
| S02 | security | narrowest exposure, fail closed | documented | `22-security-hardening-deep.md:11` |
| S03 | security | auth modes and token length | documented | `22-security-hardening-deep.md:12` |
| S04 | security | pre-flight and break-glass | documented | `22-security-hardening-deep.md:16` |
| S05 | security | hardened baseline config | documented | `22-security-hardening-deep.md:20` |
| S06 | security | trusted proxy and headers | documented | `22-security-hardening-deep.md:24` |
| S07 | security | Cloudflare Tunnel/Access | documented | `22-security-hardening-deep.md:24` |
| S08 | security | DM policy and allowlists | documented | `22-security-hardening-deep.md:28` |
| S09 | security | prompt-injection boundary | documented | `22-security-hardening-deep.md:32` |
| S10 | security | external content and DLP | documented | `22-security-hardening-deep.md:32` |
| S11 | security | fs-safe and symlinks | documented | `22-security-hardening-deep.md:36` |
| S12 | security | browser isolation and SSRF | documented | `22-security-hardening-deep.md:40` |
| S13 | security | dependency and plugin trust | documented | `22-security-hardening-deep.md:44` |
| S14 | security | SecretRefs and log redaction | documented | `22-security-hardening-deep.md:48` |
| S15 | security | audit and finding priority | documented | `22-security-hardening-deep.md:67` |
| S16 | security | finding triage and owner | documented | `22-security-hardening-deep.md:71` |
| S17 | security | false-positive model | documented | `22-security-hardening-deep.md:75` |
| S18 | security | containment and disclosure | documented | `22-security-hardening-deep.md:79` |
| S19 | security | ATLAS and formal limits | documented | `22-security-hardening-deep.md:83` |
| S20 | security | live denial after exposure change | unverified | `17-coverage-and-limits.md:90` |

## Sources

- https://docs.openclaw.ai/concepts/retry
- https://docs.openclaw.ai/concepts/model-failover
- https://docs.openclaw.ai/gateway/logging
- https://docs.openclaw.ai/gateway/opentelemetry
- https://docs.openclaw.ai/gateway/prometheus
- https://docs.openclaw.ai/reference/prompt-caching
- https://docs.openclaw.ai/gateway/cloud-workers
- https://docs.openclaw.ai/gateway/security/exposure-runbook
- https://docs.openclaw.ai/gateway/security/hardened-baseline
- https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS
- https://github.com/openclaw/openclaw
