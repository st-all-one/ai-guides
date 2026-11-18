# 14 - Lint and format

Deno ships a linter and a formatter inside the `deno` binary: no packages to
install and no config file required (`docs/rt_runtime__lint_and_format.md:9-19`).
Both run locally and in CI and are configured in the same
`deno.json` (`docs/rt_runtime__reference__deno_json.md:232-237`).

## Lint command surface

| Command | Observable behavior |
|---|---|
| `deno lint` | Analyze all TS/JS in the current directory and subdirectories |
| `deno lint src/ main.ts` | Lint only named files or directories |
| `deno lint --watch` | Re-lint automatically on change |
| `deno lint --fix` | Apply fixes that rules supply |
| `deno lint --rules` | Print the full rule list; the linter has over 100 rules |
| `deno lint --ignore=dist/,build/` | Exclude paths from the command line |
| bare `deno lint` in CI | Non-zero exit status on any violation |

Sources for the table: `docs/rt_runtime__lint_and_format.md:38-65`,
`docs/rt_runtime__reference__cli__lint.md:28-61`,
`docs/rt_runtime__reference__cli__lint.md:105-109`,
`docs/rt_runtime__reference__cli__lint.md:42-51`.

A finding names the rule, the offending code, and a hint
(`docs/rt_runtime__lint_and_format.md:51-62`):
```console
$ deno lint main.ts
error[require-await]: Async function 'fetchData' has no 'await' expression
 --> /project/main.ts:1:1
  |
1 | async function fetchData() {
  | ^^^^^
  = hint: Remove 'async' keyword from the function or use 'await' expression inside.

  docs: https://docs.deno.com/lint/rules/require-await

Found 1 problem
Checked 1 file
```

## Rule groups and file selection

The `lint.rules` object has three keys: `tags` selects rule sets, `include` adds
individual rules, and `exclude` disables rules even when a tag enables them
(`docs/rt_runtime__reference__cli__lint.md:68-76`):
```json
{
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    }
  }
}
```

| Key | Effect |
|---|---|
| `tags` | Enable a rule set; available tags are `recommended` and `fresh` |
| `include` | Add an individual rule not covered by a tag |
| `exclude` | Disable a rule even if a tag includes it |
| untagged rules | `eqeqeq`, `no-console` and peers never come from `tags`; list them in `include` |

Path selection is separate from rule selection: `lint.include` and
`lint.exclude` accept directories and globs that remove whole trees from
analysis (`docs/rt_runtime__reference__cli__lint.md:92-103`).

## Ignore directives

| Form | Scope | Constraint |
|---|---|---|
| `// deno-lint-ignore-file` | whole file | must precede the first statement or declaration |
| `// deno-lint-ignore-file -- reason` | whole file | reason text recorded inline |
| `// deno-lint-ignore-file no-explicit-any no-empty` | whole file | named diagnostics only |
| repeated file directives | whole file | only the first one takes effect |
| `// deno-lint-ignore <codes...>` | preceding line | rule names are mandatory |
| `ban-unused-ignore` | whole file only | per-line suppression of this rule never works |

Line-level suppression accepts several codes and an optional reason
(`docs/rt_runtime__reference__cli__lint.md:189-197`):
```ts
// deno-lint-ignore no-explicit-any
function foo(): any {
  // ...
}

// deno-lint-ignore no-explicit-any explicit-function-return-type
function bar(a: any) {
  // ...
}
```

`ban-unused-ignore` finds directives that no longer suppress anything, which is
how a refactor surfaces stale suppressions
(`docs/rt_runtime__reference__cli__lint.md:211-239`).

## Lint plugins

| Aspect | Documented behavior |
|---|---|
| Availability | API since Deno 2.2.0, no unstable flag; still evolving |
| Loading | `lint.plugins` array of paths, `npm:`, or `jsr:` specifiers |
| Shape | default export of `Deno.lint.Plugin` with `name` and `rules` |
| Matching | AST visitor keys or selectors such as `Foo > Bar`, `:exit` |
| Fixes | optional `fix(fixer)` called by `--fix` and by the editor LSP |
| Cleanup | `destroy()` hook; never assume the instance is recreated per file |
| Excluding | `lint.rules.exclude` entry named `<plugin-name>/<rule-name>` |
| Local ignore | `// deno-lint-ignore <my-plugin>/<my-rule>` |
| Testing | `Deno.lint.runPlugin(plugin, filename, source)` returns diagnostics |

Source for the table: `docs/rt_runtime__reference__lint_plugins.md:7-12`,
`:28-39`, `:43-146`, `:157-301`. A fix is a start position, an end position, and
replacement text; the fixer offers `insertText*`, `remove*`, and `replaceText*`
helpers, and `fix()` may return an array or a generator
(`docs/rt_runtime__reference__lint_plugins.md:168-174`):
```ts
context.report({
  node,
  message: "should be _b",
  fix(fixer) {
    return fixer.replaceText(node, "_b");
  },
});
```

## Formatter surface

| Command | Observable behavior |
|---|---|
| `deno fmt` | Format all supported files in the current directory |
| `deno fmt --watch` | Re-format on change |
| `deno fmt --check` | Report unformatted files, modify nothing, exit non-zero |
| `deno fmt --check --fail-fast` | Stop at the first unformatted file |
| `cat main.ts \| deno fmt -` | Format stdin, for editor integrations |
| `deno fmt --ignore=dist/,build/` | Exclude paths from formatting |

Source: `docs/rt_runtime__reference__cli__fmt.md:19-117`. The dprint-based
formatter handles TS/JS, Markdown, JSON, JSONC, CSS, HTML, XML, SVG, YAML, SCSS,
LESS, notebooks, Nunjucks, and Vento; Astro/Svelte/Vue need
`--unstable-component` and SQL needs `--unstable-sql`
(`docs/rt_runtime__reference__cli__fmt.md:119-145`). Markup and style formatters
only adjust whitespace and pass unknown syntax through unchanged
(`docs/rt_runtime__reference__cli__fmt.md:157-162`).

Precedence is CLI flags, then the `fmt` block in `deno.json`, then
`.editorconfig`, then defaults (`docs/rt_runtime__lint_and_format.md:168-174`).
The option block is copied from (`docs/rt_runtime__reference__cli__fmt.md:69-80`)
```json
{
  "fmt": {
    "useTabs": false,
    "lineWidth": 80,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": false,
    "proseWrap": "preserve"
  }
}
```

Defaults worth pinning explicitly include `indentWidth: 2`, `lineWidth: 80`,
`proseWrap: always`, `trailingCommas: always`, and `useTabs: false`
(`docs/rt_runtime__reference__deno_json.md:303-334`). Suppression uses
`// deno-fmt-ignore` and `// deno-fmt-ignore-file` for JS/TS/JSONC,
`<!-- deno-fmt-ignore -->` and `-start`/`-end` for Markdown and HTML, and
`# deno-fmt-ignore` for YAML (`docs/rt_runtime__reference__cli__fmt.md:164-210`).

## Quality gates

Both commands exit non-zero on violations, which makes a CI step a reliable
gate (`docs/rt_runtime__reference__cli__lint.md:42-51`,
`docs/rt_runtime__reference__cli__fmt.md:41-48`). Third-party tools run through
`npm:` specifiers — `npm:eslint .`, `npm:oxlint@latest`, `npm:prettier --check .`,
and `npm:@biomejs/biome check .`
(`docs/rt_runtime__lint_and_format.md:176-265`).

The `tasks` field composes `lint`, `fmt`, and `test` commands
(`docs/rt_runtime__reference__deno_json.md:191-207`).

derived CI gate:
```json
{
  "tasks": {
    "check": "deno lint && deno fmt --check && deno test"
  }
}
```

## Sources

- https://docs.deno.com/runtime/lint_and_format/
- https://docs.deno.com/runtime/reference/cli/lint/
- https://docs.deno.com/runtime/reference/cli/fmt/
- https://docs.deno.com/runtime/reference/lint_plugins/
- https://docs.deno.com/runtime/reference/deno_json/
- https://docs.deno.com/lint/
- https://docs.deno.com/runtime/reference/cli/test/
- https://jsr.io/@std/fmt
- https://github.com/denoland/deno
