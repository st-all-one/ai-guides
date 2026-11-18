# Samples

Each sample is a byte-identical slice of the pinned corpus. Origin paths are relative to
`/tmp/ts-research/`; `docs/` exports carry canonical URLs on their first line, `repo/` is the
TypeScript `v6.0.3` checkout at commit `050880ce59e30b356b686bd3144efe24f875ebc8`.

| Sample | Origin | Start | End | Purpose |
|---|---|---:|---:|---|
| `ts6-stable-ordering.ts` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt` | 149 | 156 | declaration order before stable ordering |
| `ts6-types-config.json` | `docs/docs__handbook__release-notes__typescript-6-0.html.txt` | 383 | 389 | explicit `types` migration |
| `handbook-discriminated-union.ts` | `docs/docs__handbook__2__narrowing.html.txt` | 429 | 433 | literal discriminants |
| `lib-esnext-collection-upsert.d.ts` | `repo/lib/lib.esnext.collection.d.ts` | 20 | 31 | Map upsert signatures |
| `lib-es2025-regexp-escape.d.ts` | `repo/lib/lib.es2025.regexp.d.ts` | 18 | 29 | safe regexp literal API |
| `diagnostic-ts5112.json` | `repo/src/compiler/diagnosticMessages.json` | 4747 | 4750 | TS5112 diagnostic |
