# 24 - Coverage, verification and limits

Read this before treating any statement in the guide as a guarantee. The guide
is a line-cited map of a static snapshot; it is not a live conformance test.

## 1. Research surface

| Surface | Value | How measured |
|---|---:|---|
| Capture date | 2026-11-18 | local crawl manifest |
| Bot API version | 10.4, dated 2026-11-09 | `bots/api.md:34` |
| Official artifacts | 247 | 24 HTML + 23 whole-page `.md` + 200 API subpages |
| Link rows | 6,817 | crawl of four roots and internal `/bots/*` links |
| Raw bytes | ~3.09 MB | manifest byte sums |
| Method pages | 191 | links parsed from `bots/api.md` |
| Type pages | 10 | 9 linked + `WebhookInfo` fetched explicitly |
| Library clones | 9 | shallow git clones at pinned commits |
| Live API calls | 0 | no token, no request to `api.telegram.org` |
| Runtime tests | 0 | nothing installed, started or deployed |

The four roots were `/bots`, `/bots/api`, `/bots/features`, `/bots/samples`.
All internal links and all advertised `.md` twins were captured before analysis.
Only the 191 method pages and 9 linked type pages under `/bots/api/*` were
fetched individually; MTProto/schema pages and `/file/*` media URLs were left
outside scope.

## 2. Coverage by topic

| Topic | Depth | Basis |
|---|---|---|
| API envelope, errors, file limits | high | `bots/api.md:29,112-113` |
| Update transport and offset semantics | high | `bots/api.md:59`, `bots/api/methods/getupdates.md:9-18` |
| Webhook TLS/ports/subnets | high | `bots/webhooks.md:24-29,43,52,56` |
| Flood control | medium-high | `bots/faq.md:124,134`; no full rate table published |
| Keyboards, Web Apps, inline, payments | high | features + widgets + per-method pages |
| Local Bot API server | medium-high | `bots/api.md:40-55`; C++ source not analysed |
| Python libraries | high | three pinned clones + verbatim samples |
| JS/TS libraries | high | three pinned clones + verbatim samples |
| Rust libraries | high | three pinned clones + verbatim sample |
| Operations/testing recipes | medium | derived from docs; not executed |
| MTProto/TDLib client API | none | explicitly out of scope |
| Other language ecosystems | none | listed on `/bots/samples`, not analysed |
| Error and retry mechanics (deep) | high | `25`: state machine, idempotency, per-library hooks |
| Logging, metrics and tracing (deep) | high | `26`: schema, redaction, SLOs, spans |
| Security hardening (deep) | high | `27`: Web App HMAC, secret rotation, abuse controls |
| Performance and capacity (deep) | high | `28`: token-bucket math, file paths, profiling |

## 3. What was deliberately not executed

- No bot token was created and no `getMe`, `setWebhook` or `sendMessage` call
  was sent. All transport advice is derived from documentation and source.
- No package was installed; Python/Node/Rust examples were not compiled or run.
- No webhook server, TLS certificate, reverse proxy or database was started.
- No browser or Telegram client was used to verify UI behaviour of Web Apps,
  widgets, invoices or keyboards.
- No load or flood test was performed; the 429 guidance is documentary.

A claim such as "webhooks require TLS 1.2+" is verified text
(`bots/webhooks.md:56`), not an observed handshake. A claim such as "dedupe on
`update_id`" is an engineering consequence of documented redelivery semantics,
not a platform guarantee that your code is correct.

## 4. Known gaps

- **Fast-moving surface.** Bot API 10.4 was only nine days old at capture
  (`bots/api.md:34`). Widgets, Stars and gifts sections may change sooner than
  transport rules.
- **Library plugins.** grammY conversations and `@grammyjs/runner` live outside
  the core clone; the JS track marks them `not verified` rather than citing
  absent source.
- **Uncloned client.** `typescript-telegram-bot-api` is cited only from the
  official samples page; no source was read for it.
- **Payment providers.** External providers (Stripe and others) are linked from
  the docs but their APIs are not part of this dossier.
- **Local server internals.** `tdlib/telegram-bot-api` is C++ and out of the
  three-language target; only its documented behaviour is used.
- **No verified percentage.** The guide does not claim 85% coverage. The deep
  pass adds four operational chapters, but live execution and deployment
  evidence are still absent. Coverage is per-topic and auditable above.

## 5. Freshness and extension

To refresh: re-run the capture of the four roots and their `.md` twins, re-enumerate
`/bots/api/methods/*.md` and `/bots/api/types/*.md`, re-clone the nine repos at
new commits, update `VERSION` and the library matrix in `00-index.md`, then run
the mechanical verifier. Never edit a line number to make a citation pass —
re-read the source and rewrite the claim.

When adding a language or framework, add exactly one chapter, one pinned
sample, one row in `00-index.md`, one row in `SKILL.md` and one Sources entry
in `23-recommended-implementation.md`. Do not widen the dossier silently.

## 6. Decision boundary

Use this guide to decide transport, security posture, library fit and failure
handling. Do **not** use it as: a substitute for the live API reference when
pinning a new method, an authority on MTProto client development, a guarantee
of upstream library stability, or a claim that any recipe was executed.

## 7. Mechanical verification performed

The checker runs before delivery. It asserts the exact 29-chapter tree,
`SKILL.md`, `VERSION` and sample manifest; checks headings, final `## Sources`,
a 6,000-7,600 byte band and Portuguese leakage. Every `bots/...md:LINE` resolves
against captured `.md`; every `prefix/path:LINE` against the pinned clone.
Missing files or out-of-range lines fail; samples are byte-compared.

The checker cannot prove semantic fidelity, future library behaviour or live
traffic. Line cites exist so those decisions can be revisited.

## 8. Deep pass delta

The first pass left four operational themes thin. Chapters `25`-`28` were added
to close that specific gap, not to inflate a percentage:

| Theme | Chapter | What was added |
|---|---|---|
| Errors | `25` | retry classification, backoff/jitter, idempotency, library error models |
| Logs | `26` | field dictionary, redaction, spans, metric catalog, SLOs, sampling |
| Security | `27` | token rotation, `initData` HMAC/Ed25519, abuse matrix, incident checklist |
| Performance | `28` | capacity formula, flood budget, file paths, DB contention, profiling |

Execution status is unchanged: zero live API calls, zero runtime tests, zero
deployments. A verified 85% claim would still require an acceptance checklist
with evidence per item, plus a smoke test against a real test bot. This guide
now documents those mechanisms in depth; it does not pretend they were run.

## Sources

- https://core.telegram.org/bots/api.md
- https://core.telegram.org/bots/api-changelog.md
- https://core.telegram.org/bots/webhooks.md
- https://core.telegram.org/bots/faq.md
- https://core.telegram.org/bots/samples.md
- https://core.telegram.org/bots/api/methods/getupdates.md
- https://core.telegram.org/bots/api/methods/setwebhook.md
- https://core.telegram.org/bots/webapps.md
- https://core.telegram.org/bots/self-signed.md
- https://core.telegram.org/bots/api/types/responseparameters.md
- https://core.telegram.org/bots/api/types/webhookinfo.md
