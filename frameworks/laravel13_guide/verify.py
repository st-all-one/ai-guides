#!/usr/bin/env python3
"""Verificação mecânica do dossiê Laravel 13 (skill reference-system-dossier)."""
from __future__ import annotations

import hashlib
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SAMPLES = ROOT / "samples"
FAIL: list[str] = []
WARN: list[str] = []

CHAPTERS = [
    "00-indice.md",
    "01-instalacao-e-fundamentos.md",
    "02-arquitetura-e-ciclo-de-vida.md",
    "03-configuracao-e-ambiente.md",
    "04-seguranca.md",
    "05-logs-e-erros.md",
    "06-telemetria-e-instrumentacao.md",
    "07-performance-e-estabilidade.md",
    "08-cache-e-filas.md",
    "09-banco-e-eloquent.md",
    "10-jsonapi-e-recursos.md",
    "11-busca-semantica-e-ia.md",
    "12-blade-e-frontend.md",
    "13-api-e-autenticacao.md",
    "14-testes-e-qualidade.md",
    "15-deploy-e-operacao.md",
    "16-migracao-12-para-13.md",
    "17-receitas-e-antipadroes.md",
    "SKILL.md",
    "VERSION",
]
EXPECTED = set(CHAPTERS) | {"verify.py", "samples", "example"}
ACTUAL = {p.name for p in ROOT.iterdir()}


def fail(msg: str) -> None:
    FAIL.append(msg)


def sample_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def resolve(name: str) -> Path | None:
    # name is the basename captured from a citation like samples/doc-x.md:N-M
    for candidate in (SAMPLES / name, SAMPLES / ("doc-" + name), SAMPLES / ("samples-" + name)):
        if candidate.exists():
            return candidate
    return None


# 1) Árvore exata
missing = EXPECTED - ACTUAL
extra = ACTUAL - EXPECTED
if missing:
    fail(f"árvore: faltando {sorted(missing)}")
if extra:
    fail(f"árvore: inesperado {sorted(extra)}")

# 2) Cabeçalho e seções finais
for name in CHAPTERS:
    p = ROOT / name
    if not p.exists():
        continue
    txt = p.read_text(encoding="utf-8")
    lines = [l for l in txt.splitlines() if l.strip()]
    if name not in ("SKILL.md", "VERSION"):
        if not lines or not lines[0].startswith("# "):
            fail(f"{name}: linha 1 não é cabeçalho markdown")
        if name != "00-indice.md" and "## Resumo de Pontos-Chave" not in txt:
            fail(f"{name}: falta '## Resumo de Pontos-Chave'")
        if "Laravel 13" not in txt:
            fail(f"{name}: não menciona Laravel 13")

# 3) Citações: samples/<arquivo>:N[-M]
CITE = re.compile(r"samples/([A-Za-z0-9_.-]+):(\d+)(?:-(\d+))?")
for name in CHAPTERS:
    p = ROOT / name
    if not p.exists():
        continue
    txt = p.read_text(encoding="utf-8")
    for m in CITE.finditer(txt):
        fname, start, end = m.group(1), int(m.group(2)), int(m.group(3) or m.group(2))
        if start < 1 or end < start:
            fail(f"{name}: citação invertida {m.group(0)}")
            continue
        src = resolve(fname)
        if src is None:
            fail(f"{name}: citação não resolve {m.group(0)}")
            continue
        total = len(sample_lines(src))
        if end > total:
            fail(f"{name}: citação fora do arquivo {m.group(0)} (tem {total} linhas)")

# 4) Links internos relativos
LINK = re.compile(r"\]\((?!https?://|#)([^)]+)\)")
for name in CHAPTERS:
    p = ROOT / name
    if not p.exists():
        continue
    for target in LINK.findall(p.read_text(encoding="utf-8")):
        clean = target.split("#")[0]
        if clean and not (ROOT / clean).exists():
            fail(f"{name}: link quebrado {target}")

# 5) Samples: cmp com origem + hashes
origin = {
    "samples-bootstrap-app.php": "/tmp/l13/laravel-13.x/bootstrap/app.php",
    "samples-composer.json": "/tmp/l13/laravel-13.x/composer.json",
    "samples-config-cache.php": "/tmp/l13/laravel-13.x/config/cache.php",
    "samples-config-session.php": "/tmp/l13/laravel-13.x/config/session.php",
    "samples-config-logging.php": "/tmp/l13/laravel-13.x/config/logging.php",
    "samples-config-queue.php": "/tmp/l13/laravel-13.x/config/queue.php",
    "samples-config-database.php": "/tmp/l13/laravel-13.x/config/database.php",
    "samples-config-app.php": "/tmp/l13/laravel-13.x/config/app.php",
    "samples-env.example": "/tmp/l13/laravel-13.x/.env.example",
    "samples-user-model.php": "/tmp/l13/laravel-13.x/app/Models/User.php",
    "samples-routes-console.php": "/tmp/l13/laravel-13.x/routes/console.php",
    "samples-public-index.php": "/tmp/l13/laravel-13.x/public/index.php",
    "samples-phpunit.xml": "/tmp/l13/laravel-13.x/phpunit.xml",
    "doc-upgrade-13.md": "/tmp/l13/upgrade-github.md",
    "doc-releases-13.md": "/tmp/l13/releases-github.md",
}
for name, src in origin.items():
    dst = SAMPLES / name
    if not dst.exists():
        fail(f"sample ausente: {name}")
        continue
    if not os.path.exists(src):
        WARN.append(f"origem temporária ausente (cmp ignorado): {name}")
        continue
    if dst.read_bytes() != Path(src).read_bytes():
        fail(f"sample divergente da origem: {name}")
manifest = (SAMPLES / "hashes.txt").read_text(encoding="utf-8") if (SAMPLES / "hashes.txt").exists() else ""
for line in manifest.splitlines():
    parts = line.split(None, 2)
    if len(parts) != 3:
        continue
    digest, count, name = parts
    path = SAMPLES / name
    if not path.exists():
        fail(f"manifesto: sample ausente {name}")
        continue
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != digest:
        fail(f"manifesto: hash divergente {name}")
    if len(raw.decode("utf-8", errors="replace").splitlines()) != int(count):
        fail(f"manifesto: contagem divergente {name}")

# 6) Trechos inline literais: cabeçalho de path imediatamente acima da cerca
HEAD = re.compile(r"samples/([A-Za-z0-9_.-]+):(\d+)(?:-(\d+))?\s*$")
for name in CHAPTERS:
    p = ROOT / name
    if not p.exists() or name in ("SKILL.md", "VERSION"):
        continue
    lines = p.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        if not line.startswith("```") or i == 0:
            continue
        head = HEAD.search(lines[i - 1])
        if not head:
            continue
        fname, start, end = head.group(1), int(head.group(2)), int(head.group(3) or head.group(2))
        src = resolve(fname)
        if src is None:
            continue
        expect = [x for x in sample_lines(src)[start - 1:end] if x.strip()]
        body: list[str] = []
        j = i + 1
        while j < len(lines) and not lines[j].startswith("```"):
            body.append(lines[j])
            j += 1
        body = [x for x in body if x.strip()]
        if body != expect:
            fail(f"{name}: trecho inline não literal em {lines[i-1].strip()} ({len(body)} vs {len(expect)})")

print(f"capítulos: {len([c for c in CHAPTERS if (ROOT/c).exists()])}/{len(CHAPTERS)}")
print(f"samples: {len([p for p in SAMPLES.iterdir() if p.is_file()])}")
print(f"FALHAS: {len(FAIL)}  AVISOS: {len(WARN)}")
for w in WARN:
    print("  AVISO", w)
for f in FAIL[:80]:
    print("  FALHA", f)
sys.exit(1 if FAIL else 0)
