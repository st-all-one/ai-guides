# Sample manifest

Every file in this directory is a byte-for-byte copy of a source read during the capture. The
`origin` column is relative to `/tmp/openclaw-research/`; `pages/` holds Markdown exports of
official docs pages and `repo/` holds the pinned clone at
`2f5bb506ef61ab6e327df88133bfc68d95e0c90a`. Never edit a sample: integrity is checked with `cmp`.

| sample | origin | why |
|---|---|---|
| gateway-security-trust-model.md | pages/gateway/security/trust-model.md | Canonical one-trust-boundary model, session visibility defaults and threat stance used by chapters 03, 04, 09 and 18 |
| active-memory-how-it-works.md | pages/concepts/active-memory/how-it-works.md | Bounded recall flow, targeting paths and modes that anchor chapters 06 and 08 |
| concepts-multi-agent.md | pages/concepts/multi-agent.md | Authoritative multi-agent configuration and delegation surface used by chapter 09 |
| src-agents-AGENTS.md | repo/src/agents/AGENTS.md | Runtime guardrails, stable-context rule and run-authority contract used by chapters 01, 06 and 09 |
| src-security-audit.ts | repo/src/security/audit.ts | Implementation of the security audit checks summarized in chapters 03 and 14 |
| SECURITY.md | repo/SECURITY.md | Upstream disclosure policy and trust-model statement that anchors chapter 03 and the coverage review |

## Integrity rule

The mechanical verifier parses the table above, resolves each origin, and byte-compares it with
the local sample. A mismatch is a delivery failure. If a source changes at a new commit, re-copy
the file, update `VERSION`, and re-run the verifier; do not patch a sample to match a claim.
