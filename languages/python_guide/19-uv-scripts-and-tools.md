# 19 - uv scripts and tools: PEP 723 metadata, `uv run`, and `uvx`

This chapter answers how to make a single `.py` file self-describing with PEP 723 metadata, execute it reproducibly, and run or install command-line tools in isolated environments. It assumes chapter 17's `uv run` basics and complements chapter 18's project-level lockfile.

## Self-contained scripts with PEP 723 metadata

Python's standard inline script metadata format lets a script declare its Python version and dependencies inside comment headers (`samples/guides__scripts.md:125`, `samples/guides__scripts.md:133`). uv writes and reads that block: `uv init --script` creates it, `uv add --script` updates the dependency list, and `uv run <script>` builds an environment on demand (`samples/guides__scripts.md:128`, `samples/guides__scripts.md:135`, `samples/guides__scripts.md:164`).

| Concern | Mechanism | Evidence |
|---|---|---|
| Metadata block | `# /// script` TOML comment header | `samples/guides__scripts.md:146` |
| Create script | `uv init --script example.py --python 3.12` | `samples/reference__cli.md:1605` |
| Add dependency | `uv add --script example.py 'requests<3' 'rich'` | `samples/reference__cli.md:2186` |
| Run | `uv run example.py` | `samples/reference__cli.md:1314` |
| Python floor | `requires-python = ">=3.12"` | `samples/guides__scripts.md:189` |
| Empty deps | `dependencies = []` must still be present | `samples/guides__scripts.md:200` |
| Missing interpreter | Downloaded automatically by `uv run` | `samples/guides__scripts.md:202` |
| Project isolation | Project dependencies ignored even inside a project | `samples/guides__scripts.md:181` |

When a script carries inline metadata, the enclosing project's dependencies are ignored and `--no-project` is unnecessary (`samples/guides__scripts.md:181`); without metadata, `uv run --no-project` skips installing the project (`samples/guides__scripts.md:75`). Ad-hoc dependencies can still be added per invocation with repeatable `--with` (`samples/guides__scripts.md:109`, `samples/guides__scripts.md:119`).

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx"]
# ///
import httpx

print(httpx.get("https://example.com"))
```

## Executable scripts via shebang

A `#!/usr/bin/env -S uv run --script` shebang makes the file directly executable, so it can live on `PATH` and be invoked without typing `uv run` (`samples/guides__scripts.md:206`, `samples/guides__scripts.md:213`). Mark it executable with `chmod +x` (`samples/guides__scripts.md:218`). Inline dependency declarations work in this mode too (`samples/guides__scripts.md:225`).

```bash
cat > greet <<'EOF'
#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["httpx"]
# ///
import httpx
print(httpx.get("https://example.com"))
EOF
chmod +x greet
./greet
```

## Locking scripts and deterministic reruns

Unlike projects, scripts are not locked automatically: `uv lock --script example.py` creates a sibling `example.py.lock` (`samples/guides__scripts.md:261`, `samples/guides__scripts.md:267`). Later `uv run --script`, `uv add --script`, `uv export --script`, and `uv tree --script` reuse it and update only when needed (`samples/guides__scripts.md:269`); the `uv export --script` and `uv tree --script` flags are documented in the CLI reference (`samples/reference__cli.md:4853`, `samples/reference__cli.md:5418`).

| Determinism lever | Effect | Evidence |
|---|---|---|
| `uv lock --script` | Pin script dependencies into `<script>.lock` | `samples/reference__cli.md:4270` |
| `[tool.uv] exclude-newer` inline | Limit candidates to artifacts uploaded before a date | `samples/guides__scripts.md:275`, `samples/guides__scripts.md:287` |
| `--index` on `uv add --script` | Embed an alternative index in the metadata | `samples/guides__scripts.md:244`, `samples/guides__scripts.md:247` |
| `--refresh` | Revalidate cached data | `samples/concepts__cache.md:18` |
| `--reinstall` | Ignore installed versions and reinstall | `samples/concepts__cache.md:20` |

`exclude-newer` takes an RFC 3339 timestamp in the inline `[tool.uv]` table, which keeps a script reproducible when rerun months later (`samples/guides__scripts.md:275`, `samples/guides__scripts.md:277`).

## Tools: `uvx` vs `uv tool install`

A tool is a Python package that provides a CLI. `uvx` is an alias for `uv tool run` and invokes a tool without installing it, in a temporary isolated environment (`samples/guides__tools.md:7`, `samples/guides__tools.md:20`, `samples/guides__tools.md:40`). `uv tool install` creates a persistent environment with executables on `PATH`, but does not expose the package's modules to the current interpreter (`samples/concepts__tools.md:25`, `samples/guides__tools.md:164`).

| Property | `uvx` / `uv tool run` | `uv tool install` | Evidence |
|---|---|---|---|
| Environment | Cached in uv cache; disposable via `uv cache clean` | Tools directory; removed only on uninstall | `samples/concepts__tools.md:23`, `samples/concepts__tools.md:25` |
| Executables | Temporary | Symlinked (Unix) / copied (Windows) into executable dir | `samples/concepts__tools.md:209`, `samples/concepts__tools.md:215` |
| Default version | Latest on first call, then cached | Latest unless constrained | `samples/concepts__tools.md:33` |
| Idempotent upgrade | `uvx ruff@latest` refreshes | `uv tool upgrade` respects install constraints | `samples/concepts__tools.md:51`, `samples/guides__tools.md:218` |

Never mutate a tool environment with `pip` (`samples/concepts__tools.md:29`). Tool environments ignore `.python-version` and a project's `requires-python`, so pin with `--python` when needed (`samples/concepts__tools.md:201`, `samples/guides__tools.md:234`). If an already-installed tool exists, `uvx` uses it unless `@latest` or `--isolated` is passed (`samples/concepts__tools.md:58`, `samples/concepts__tools.md:82`).

Versioned dependency selection is explicit: `uvx ruff@0.3.0` accepts only exact versions with `@` (`samples/guides__tools.md:63`, `samples/guides__tools.md:84`); `--from httpie http` decouples package and command names (`samples/guides__tools.md:55`); `--from 'mypy[faster-cache,reports]==1.13.0'` combines extras and a version (`samples/guides__tools.md:97`); `--with mkdocs-material mkdocs` adds a plugin dependency (`samples/guides__tools.md:139`). `uv tool install --with-executables-from` adds both packages and their executables, unlike `--with` (`samples/concepts__tools.md:174`, `samples/concepts__tools.md:196`).

`uv tool run <name>` is nearly `uv run --no-project --with <name> -- <name>`, but infers the package from the command, uses a dedicated cache, never sees the project, and prefers an installed tool (`samples/concepts__tools.md:223`, `samples/concepts__tools.md:231`). Use `uv run` instead when the tool needs the project installed, e.g. `pytest` or `mypy` (`samples/guides__tools.md:44`, `samples/concepts__tools.md:236`).

## Sources

- https://docs.astral.sh/uv/guides/scripts/index.md
- https://docs.astral.sh/uv/guides/tools/index.md
- https://docs.astral.sh/uv/concepts/tools/index.md
- https://docs.astral.sh/uv/reference/cli/index.md
- https://docs.astral.sh/uv/concepts/cache/index.md
- https://docs.astral.sh/uv/concepts/python-versions/index.md
