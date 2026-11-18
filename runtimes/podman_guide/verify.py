#!/usr/bin/env python3
"""Mechanical verifier for the Podman dossier. Run: python3 verify.py"""
from pathlib import Path
import hashlib, re, sys

ROOT = Path(__file__).resolve().parent
CHAPTERS = [
    "00-index.md",
    "01-product-and-architecture.md",
    "02-installation-and-platforms.md",
    "03-rootless-and-userns.md",
    "04-security-model.md",
    "05-configuration-model.md",
    "06-containers-conf-reference.md",
    "07-container-lifecycle.md",
    "08-modern-run-flags.md",
    "09-images-registries-and-pull.md",
    "10-reproducible-builds.md",
    "11-image-validation-and-signing.md",
    "12-manifests-and-artifacts.md",
    "13-volumes-mounts-and-secrets.md",
    "14-networking.md",
    "15-pods-and-namespaces.md",
    "16-compose.md",
    "17-kubernetes-and-kube-play.md",
    "18-systemd-quadlet-and-auto-update.md",
    "19-remote-api-and-service.md",
    "20-machine-macos-windows.md",
    "21-logging-and-events.md",
    "22-healthchecks-and-telemetry.md",
    "23-troubleshooting-and-maintenance.md",
    "24-determinism-playbook.md",
    "25-decisions-and-pitfalls.md",
    "26-quick-reference.md",
    "27-coverage-and-limits.md",
    "28-minimal-verified-cut.md",
]
TOKEN = re.compile(r"`((?:pages|samples)/[^`\s:]+):(\d+)(?:-(\d+))?`")
URL = re.compile(r"https?://[^\s)`]+")
LINK = re.compile(r"\]\(\./?([^)#]+\.md)")
errors, warnings = [], []


def err(msg):
    errors.append(msg)


def load(rel):
    p = ROOT / rel
    if not p.is_file():
        err(f"missing file: {rel}")
        return None
    return p.read_text(encoding="utf-8")


def check_tree():
    for name in ["SKILL.md", "VERSION", "samples/MANIFEST.md", *CHAPTERS]:
        if not (ROOT / name).is_file():
            err(f"missing expected file: {name}")
    for p in ROOT.glob("*.md"):
        if p.name not in ["SKILL.md", *CHAPTERS]:
            warnings.append(f"unexpected root markdown: {p.name}")
    for p in (ROOT / "pages").glob("**/*.md"):
        if not any(TOKEN.findall(ch) and any(t[0] == str(p.relative_to(ROOT)) for t in TOKEN.findall(ch))
                   for ch in map(lambda n: load(n) or "", CHAPTERS)):
            warnings.append(f"uncited page: {p.relative_to(ROOT)}")


def check_citations(text, where):
    for path, a, b in TOKEN.findall(text):
        p = ROOT / path
        if not p.is_file():
            err(f"{where}: citation target missing: {path}")
            continue
        n = len(p.read_text(encoding="utf-8").splitlines())
        lo, hi = int(a), int(b or a)
        if lo < 1 or hi < lo or hi > n:
            err(f"{where}: out-of-range citation {path}:{a}-{b} (file has {n} lines)")
    for bad in ("TBD", "TODO", "PLACEHOLDER", "unverified claim"):
        if bad in text:
            err(f"{where}: placeholder text {bad}")


def check_fences(text, where):
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if not lines[i].startswith("```"):
            i += 1
            continue
        lang = lines[i][3:].strip()
        head = lines[i - 1] if i else ""
        j = i + 1
        body = []
        while j < len(lines) and not lines[j].startswith("```"):
            body.append(lines[j])
            j += 1
        if j >= len(lines):
            err(f"{where}: unclosed fence at line {i+1}")
            break
        if not lang:
            err(f"{where}: fence at line {i+1} has no language")
        toks = TOKEN.findall(head)
        if len(toks) > 1:
            err(f"{where}: fence at line {i+1} has multiple source tokens")
        if len(body) > 25:
            err(f"{where}: fence at line {i+1} has {len(body)} lines (>25)")
        if toks:
            path, a, b = toks[0]
            p = ROOT / path
            if p.is_file():
                src = p.read_text(encoding="utf-8").splitlines()
                lo, hi = int(a), int(b or a)
                want = [l.rstrip() for l in src[lo - 1:hi] if l.strip() != "…"]
                got = [l.rstrip() for l in body if l.strip() != "…"]
                if want != got:
                    err(f"{where}: fence at line {i+1} is not verbatim from {path}:{a}-{b}")
        elif not URL.search(head) and not re.search(r"\bderived\b|\bcomputado\b|\bsaída\b|\bcálculo\b", head, re.I):
            err(f"{where}: fence at line {i+1} has no source token/`derived` above it")
        i = j + 1


def check_chapter(name):
    text = load(name)
    if text is None:
        return
    lines = text.splitlines()
    if not re.match(r"^# \d\d — \S", lines[0] if lines else ""):
        err(f"{name}: first line must be '# NN — Title'")
    heads = [l for l in lines if l.startswith("## ")]
    if len(heads) < 3:
        err(f"{name}: fewer than three '##' sections ({len(heads)})")
    if len(heads) >= 2 and (heads[-2] != "## Pitfalls" or heads[-1] != "## Sources"):
        err(f"{name}: last two sections must be '## Pitfalls' and '## Sources', got {heads[-2:]}")
    tail = text[text.find("## Sources"):]
    if not URL.search(tail) and "pages/" not in tail and "samples/" not in tail and "`" not in tail:
        err(f"{name}: Sources section has no URL or captured page")
    check_citations(text, name)
    check_fences(text, name)
    for target in LINK.findall(text):
        if not (ROOT / target).is_file():
            err(f"{name}: broken chapter link {target}")


def check_samples():
    manifest = load("samples/MANIFEST.md") or ""
    rows = re.findall(r"\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|", manifest)
    if len(rows) < 10:
        err(f"samples/MANIFEST.md: expected >=10 sample rows, found {len(rows)}")
    for sample, origin, expected in rows:
        p = ROOT / "samples" / sample
        if not p.is_file():
            err(f"sample missing: {sample}")
            continue
        got = hashlib.sha256(p.read_bytes()).hexdigest()
        if got != expected:
            err(f"sample hash mismatch: {sample} ({got} != {expected})")
    ver = load("VERSION") or ""
    if "055de046937d29450f310fce0fe3071485d8bed9" not in ver:
        err("VERSION: pinned commit missing")


def check_coverage():
    text = load("27-coverage-and-limits.md") or ""
    rows = [l for l in text.splitlines() if re.match(r"^\|\s*\d+\s*\|", l)]
    ok = sum(1 for l in rows if "✅" in l)
    partial = sum(1 for l in rows if "◐" in l)
    total = len(rows)
    if total < 40:
        err(f"coverage table has {total} topics (<40)")
    elif (ok + partial) / total < 0.85:
        err(f"coverage addressed {(ok+partial)/total:.1%} < 85% ({ok} done, {partial} partial)")
    print(f"coverage: {total} topics, {ok} covered, {partial} partial, {((ok+partial)/total if total else 0):.1%} addressed")


def main():
    check_tree()
    for name in CHAPTERS:
        check_chapter(name)
    check_samples()
    check_coverage()
    for w in warnings:
        print("WARN", w)
    for e in errors:
        print("FAIL", e)
    print(f"RESULT: {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
