---
name: sniff-usage
description: Use when working with computed-style capture, accessibility inspection, or visual regression via the sniff-computed-style toolset. Covers capture, deterministic diff, a11y checks, and MCP/CLI usage. Trigger on keywords: sniff, computed-style, cdp, css, contrast, accessibility, ax, a11y, diff, snapshot, regression, styling, layout, is_user_noticeable.
---

# sniff-computed-style — Active Usage Guide

**Role:** Capture real computed CSS + accessibility state from a live page over raw CDP (WebSocket), diff two versions deterministically, and emit offline PASS/WARN/FAIL checks. The JSONL snapshot IS the source of truth; the AI interprets only the delta.

**When to load:** Any time you need to inspect real rendered styles, audit accessibility, detect UI regressions, or answer "what actually changed?" on a live page.

---

## Core Pipeline

```
capture → diff → checks → AI interpretation (only the delta)
sniff-computed-style   sniff-diff   sniff-check / run_checks   eval-prompt
```

All steps before the AI are deterministic and cost ~0 tokens.

### Quick Reference

| Action | Command |
|--------|---------|
| Capture a node/subtree | `sniff-computed-style -u URL -s SEL --depth N` |
| LLM-ready capture | `sniff-computed-style -u URL -s SEL --depth N --compact` |
| Accessibility capture | `sniff-computed-style -u URL -s SEL --compact --contrast --ax-tree` |
| Diff two snapshots | `sniff-diff base.jsonl head.jsonl --tolerance 0.5` |
| Diff summary (CI) | `sniff-diff base.jsonl head.jsonl --stats-only` |
| Offline checks | `sniff-check --input snap.jsonl --uniform --rules` |
| MCP capture | `sniff_page` |
| MCP diff | `diff_snapshots` |
| MCP checks | `run_checks` |

---

## Capture Commands (`sniff-computed-style`)

### Core

```bash
sniff-computed-style -u http://localhost:3000 -s ".btn-primary"
sniff-computed-style -u "$URL" -s "main" --depth 5 --compact --contrast --ax-tree
sniff-computed-style -u "$URL" -s "nav" --depth 4 --compact --contrast > nav.jsonl
sniff-computed-style -u "$URL" -s "footer" --depth 6 --compact --contrast > footer.jsonl
```

**Categories:** `box-model` · `layout` · `typography` · `visual` · `transform` · `animation` · `interaction` · `accessibility` · `all`

### Flags

| Flag | Purpose |
|------|---------|
| `-u, --url` / `-s, --selector` | Page URL + CSS selector (required) |
| `--depth N` | Levels of children (0 = element only) |
| `-c, --categories` | Category subset (default `all`) |
| `--props a,b` / `--pseudo ::before` | Extra props / pseudo-elements |
| `--wait spec` | Repeatable: `delay:ms`, `network-idle:idle[:t]`, `element-ready:sel:cond[:t]`, `fonts-loaded[:t]`, `app-flag:flag[:t]`, `selector:sel[:t]` |
| `--compact` | ~55% fewer tokens (dedup + suppress defaults + scoped css_variables) |
| `--stable-key attr` | Stable selectors (`data-testid`) across deploys |
| `--stabilize` | Freeze animations/transitions for deterministic snapshots |
| `--contrast` | Measured WCAG ratio + AA/AAA per node (effective background resolved in-page) |
| `--ax` / `--ax-tree` | Browser AX node / full AX subtree (CDP) |
| `--custom-props` | All CSS variables (`--*`) |
| `--viewport WxH` | Emulated viewport (default `1366x768`) — affects media queries/%/vh |
| `--connect ws://...` | Attach to an already-running browser |
| `--output jsonl\|jsonl-flat\|json` | Output shape (default `jsonl`) |
| `--no-visible` | Include invisible elements |
| `--exclude sel`, `--min-width`, `--min-height` | Element filters |

### Output node shape (JSONL)

```json
{
  "id": 1, "parent_id": null, "tag": "DIV", "selector": "div#primary",
  "path": "body > main > div.card", "depth": 0,
  "rect": {"x": 8.0, "y": 8.0, "width": 300.0, "height": 56.0},
  "metrics": {"z_index": "auto", "stacking_context": false},
  "is_user_noticeable": {"display_visible": true, "accessibility_grade": "AAA"},
  "computed_style_hash": "afbd33ba764bb8d4",
  "aria": {"role": "button", "name": "Salvar", "focusable": true, "has_text": true},
  "contrast": {"ratio": 5.17, "foreground": "#2563eb", "background": "#ffffff", "large": false, "aa": "pass", "aaa": "fail", "unknown_reason": null},
  "ax": {"role": "button", "name": "Salvar", "focusable": true, "ignored": false},
  "styles": {"box_model": {"width": "300px"}, "typography": {"font-size": "16px"}, "visual": {"background-color": "#2563eb"}},
  "children": []
}
```

---

## Deterministic Diff (`sniff-diff`)

```bash
sniff-diff base.jsonl head.jsonl --tolerance 0.5 > delta.jsonl
sniff-diff base.jsonl head.jsonl --stats-only
# nodes: 14 -> 14 | changed: 1 | added: 0 | removed: 0
```

| Flag | Purpose |
|------|---------|
| `--tolerance N` | Absorb subpixel jitter in the same unit (default `0.5`); `16px` vs `16rem` never equal |
| `--ignore-props a,b` | Volatile props never mark a node changed |
| `--no-structural` | Suppress ADDED/REMOVED (variable-count lists) |
| `--stats-only` | Print only the summary |

**Output:** `CHANGED` (per-property `before`/`after` incl. `styles`, `pseudo`, `aria`, `contrast`, `ax`, `rect`, `metrics`, `is_user_noticeable`), `ADDED`/`REMOVED` (full snapshot), `__diff_summary`.

> ⚠️ **Determinism:** both runs must share URL, selector, viewport, wait, mode (`--compact` both sides, never mixed).

---

## Deterministic Checks (`sniff-check`)

```bash
sniff-check --input snap.jsonl --uniform --tolerance 0.5   # the "odd card"
sniff-check --input snap.jsonl --rules                     # PASS/WARN/FAIL
```

| Check | Detects |
|-------|---------|
| `--uniform` | Sibling instances deviating from the group norm (median/mode) |
| `--rules` → `contrast-aa/aaa` | Uses the measured `contrast` facet; `fail` = real, `warn` = background-image |
| `--rules` → `target-size` | Interactive element < 24×24px (WCAG 2.2) |
| `--rules` → `focus-indicator` | Focusable with suppressed outline and no box-shadow |
| `--rules` → `hidden-focusable` | Focusable with `accessibility_grade == NONE` |
| `--rules` → `empty-alt-image` | Large image with empty `alt` |

---

## MCP Tools (`sniff-mcp`, stdio)

| Tool | Inputs | Returns |
|------|--------|---------|
| `sniff_page` | url, selector, depth, categories, compact, custom_props, stable_key, pseudo, wait, viewport, format, stabilize, contrast, include_ax, ax_tree | JSONL snapshot (+ `notifications/progress` per phase) |
| `diff_snapshots` | base_jsonl, head_jsonl, tolerance, ignore_props, ignore_structural | CHANGED/ADDED/REMOVED delta + `__diff_summary` |
| `run_checks` | jsonl, uniform, rules, tolerance | PASS/WARN/FAIL lines + outliers + `__check_summary` |
| `list_categories` | — | accepted categories |

MCP call patterns:

- **Analyze a page:** `sniff_page` with `compact:true`, `contrast:true`, `ax_tree:true`; use `stable_key` when selectors must survive deploys.
- **Compare versions:** call `sniff_page` twice with identical params, then `diff_snapshots` on the two inline JSONL strings.
- **Offline audit:** `run_checks` on an inline JSONL with `uniform:true, rules:true`.
- Embedded resources: `sniff://prompts/eval`, `sniff://schemas/eval`, `sniff://guides/golden`.

---

## Output Formats

All query commands support `--output jsonl` (nested tree, one line per root), `jsonl-flat` (one node per line with `id`/`parent_id`), `json` (single array), plus `--pretty`.

---

## Reading the Facets (Interpretation)

| Facet value | Meaning / action |
|---|---|
| `contrast.aa == "fail"` | Real AA failure (1.4.3). Cite the ratio. |
| `contrast.aa == "unknown"` | Background image involved → manual review. |
| `accessibility_grade == "NONE"` | Hidden from AT (`aria-hidden`, `hidden`/`inert`, `display:none`, zero-size). |
| `accessibility_grade == "AA"` | In AX tree but off-screen / transparent / name-required role missing a name. |
| `accessibility_grade == "AAA"` | On screen, exposed, named when required. |
| `aria.name` empty on A/BUTTON/IMG | Candidate 1.1.1/2.4.4/4.1.2. **First check for a descendant `<img alt="...">`** — not yet derived by the tool. |
| No `H1` or skipped levels (H2→H4) | 1.3.1/2.4.6 structure failure. |
| Interactive `rect` < 24px | 2.5.8 target-size failure. |
| `display_visible:true` + grade `AA` | Present and accessible, below the fold — **not** a failure. |

---

## Workflows

### Accessibility audit

```bash
sniff-computed-style -u "$URL" -s "body" --depth 5 --compact --contrast --ax-tree > body.jsonl
sniff-computed-style -u "$URL" -s "nav"    --depth 4 --compact --contrast > nav.jsonl
sniff-computed-style -u "$URL" -s "main"   --depth 5 --compact --contrast > main.jsonl
sniff-computed-style -u "$URL" -s "footer" --depth 6 --compact --contrast > footer.jsonl
sniff-check --input main.jsonl --rules

# contrast failures, missing names, headings
jq -r '.. | objects | select(.contrast.aa == "fail") | [.tag,.selector,.contrast.ratio] | @tsv' main.jsonl
jq -r '.. | objects | select(.tag=="A" or .tag=="BUTTON" or .tag=="IMG")
  | select(.aria.name==null or .aria.name=="") | select(.is_user_noticeable.accessibility_grade!="NONE")
  | [.tag,.selector] | @tsv' body.jsonl
jq -r '.. | objects | select(.tag|test("^H[1-6]$")) | [.tag,(.aria.name//"-")] | @tsv' body.jsonl
```

### Regression monitoring (CI)

```bash
sniff-computed-style -u "$URL" -s "$SEL" --stable-key data-testid --compact > base.jsonl
# ... deploy ...
sniff-computed-style -u "$URL" -s "$SEL" --stable-key data-testid --compact > head.jsonl
sniff-diff base.jsonl head.jsonl --stats-only   # fail job if changed/added/removed > threshold
sniff-diff base.jsonl head.jsonl --ignore-props transform,opacity --no-structural > delta.jsonl
```

### Debug one element

```bash
sniff-computed-style -u "$URL" -s ".btn-primary" --categories visual,typography --compact \
  | jq '{color:.styles.visual.color, font:.styles.typography."font-size"}'
```

---

## Common Patterns

### Find the odd card in a grid
```bash
sniff-computed-style -u "$URL" -s ".card" --depth 1 --compact | sniff-check --input - --uniform
```

### Real AA contrast fails only
```bash
sniff-check --input main.jsonl --rules | jq -r 'select(.check=="contrast-aa" and .status=="fail") | [.tag,.selector,.evidence] | @tsv'
```

### Touch targets below 24px
```bash
jq -r '.. | objects | select(.tag=="A" or .tag=="BUTTON")
  | select(.is_user_noticeable.display_visible==true and (.rect.width<24 or .rect.height<24))
  | [.tag,.selector,(.aria.name//"-")] | @tsv' body.jsonl
```

### Stable subtree for lazy/dynamic content
```bash
sniff-computed-style -u "$URL" -s "footer" --depth 2 --compact --wait "delay:1500"
```

---

## Anti-patterns

- Diffing across different modes (`--compact` vs full) or viewports → false positives.
- Feeding full snapshots to the model — always diff/check first.
- Treating `unknown` contrast as pass/fail — it means "review manually".
- Reporting every empty `aria.name` without checking a descendant `img alt`.
- Flagging below-the-fold content as "invisible" — read `is_user_noticeable`.
- Blindly raising `--tolerance` — it swallows real small changes.
- Waiting on `element-ready` for a carousel's first hidden slide (use `delay` or the stable subtree).

---

## Known Limitations

- Link accessible name from inner `img alt` is not yet derived (verify before reporting).
- Contrast over background images is always `unknown` (cannot measure without pixels).
- Hidden panels (carousels/tabs) are still in the AX tree → grade `AA`, `display_visible:true`.

---

## Checklist

Before completing any sniff operation:

- [ ] **Same flags/viewport/mode on both diff sides?**
- [ ] **Page stable** (`--stabilize`, proper `--wait`)?
- [ ] **Stable keys** (`--stable-key data-testid`) when comparing across deploys?
- [ ] **Compact mode** for LLM consumption?
- [ ] **`--contrast` + `--ax-tree`** for accessibility facts?
- [ ] **`sniff-check` run** before the AI judges (measured evidence)?
- [ ] **Delta only** sent to the model, not full snapshots?
- [ ] **Evidence cited** in the evaluation reason (`contrast.ratio`, `aria.role`)?
