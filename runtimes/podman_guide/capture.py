#!/usr/bin/env python3
"""Capture curated docs.podman.io pages as line-addressable plain text."""
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import re, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) ai-guides-dossier/1.0"}
BASE = "https://docs.podman.io/en/latest/"
OUT = Path("/home/one/projects/one/ai-guides/runtimes/podman_guide/pages")

PAGES = """
index Introduction Commands Tutorials Reference
markdown/podman.1 markdown/podman-remote.1 markdown/podmansh.1
markdown/podman-create.1 markdown/podman-run.1 markdown/podman-start.1
markdown/podman-stop.1 markdown/podman-restart.1 markdown/podman-kill.1
markdown/podman-rm.1 markdown/podman-ps.1 markdown/podman-exec.1
markdown/podman-attach.1 markdown/podman-logs.1 markdown/podman-inspect.1
markdown/podman-container-inspect.1 markdown/podman-wait.1 markdown/podman-stats.1
markdown/podman-top.1 markdown/podman-update.1 markdown/podman-pause.1
markdown/podman-unpause.1 markdown/podman-init.1 markdown/podman-rename.1
markdown/podman-diff.1 markdown/podman-port.1 markdown/podman-cp.1
markdown/podman-mount.1 markdown/podman-unmount.1 markdown/podman-export.1
markdown/podman-import.1 markdown/podman-container-checkpoint.1
markdown/podman-container-restore.1 markdown/podman-container-clone.1
markdown/podman-container-prune.1 markdown/podman-healthcheck.1
markdown/podman-healthcheck-run.1 markdown/podman-auto-update.1
markdown/podman-events.1 markdown/podman-generate-systemd.1
markdown/podman-generate-spec.1 markdown/podman-info.1 markdown/podman-version.1
markdown/podman-system-df.1 markdown/podman-system-check.1
markdown/podman-system-prune.1 markdown/podman-system-reset.1
markdown/podman-system-renumber.1 markdown/podman-system-migrate.1
markdown/podman-system-service.1 markdown/podman-system-connection.1
markdown/podman-completion.1 markdown/podman-unshare.1 markdown/podman-farm.1
markdown/podman-image.1 markdown/podman-images.1 markdown/podman-build.1
markdown/podman-pull.1 markdown/podman-push.1 markdown/podman-search.1
markdown/podman-login.1 markdown/podman-logout.1 markdown/podman-tag.1
markdown/podman-untag.1 markdown/podman-rmi.1 markdown/podman-commit.1
markdown/podman-save.1 markdown/podman-load.1 markdown/podman-history.1
markdown/podman-image-inspect.1 markdown/podman-image-diff.1
markdown/podman-image-tree.1 markdown/podman-image-prune.1
markdown/podman-image-sign.1 markdown/podman-image-trust.1
markdown/podman-image-scp.1 markdown/podman-manifest.1
markdown/podman-artifact.1 markdown/podman-artifact-add.1
markdown/podman-artifact-pull.1 markdown/podman-artifact-extract.1
markdown/podman-artifact-inspect.1
markdown/podman-pod.1 markdown/podman-pod-create.1 markdown/podman-pod-ps.1
markdown/podman-pod-logs.1 markdown/podman-pod-inspect.1
markdown/podman-pod-stats.1 markdown/podman-pod-prune.1
markdown/podman-network.1 markdown/podman-network-create.1
markdown/podman-network-connect.1 markdown/podman-network-disconnect.1
markdown/podman-network-ls.1 markdown/podman-network-inspect.1
markdown/podman-network-reload.1 markdown/podman-network-update.1
markdown/podman-network-prune.1
markdown/podman-volume.1 markdown/podman-volume-create.1
markdown/podman-volume-mount.1 markdown/podman-volume-export.1
markdown/podman-volume-import.1 markdown/podman-volume-prune.1
markdown/podman-secret.1
markdown/podman-compose.1 markdown/podman-kube.1 markdown/podman-kube-play.1
markdown/podman-kube-generate.1 markdown/podman-kube-apply.1
markdown/podman-kube-down.1 markdown/podman-quadlet.1
markdown/podman-quadlet-basic-usage.7 markdown/podman-quadlet-print.1
markdown/podman-systemd.unit.5 markdown/podman-container.unit.5
markdown/podman-kube.unit.5 markdown/podman-volume.unit.5
markdown/podman-network.unit.5 markdown/podman-build.unit.5
markdown/podman-machine.1 markdown/podman-machine-init.1
markdown/podman-machine-set.1 markdown/podman-machine-start.1
markdown/podman-machine-ssh.1 markdown/podman-machine-os.1
markdown/podman-machine-info.1 markdown/podman-machine-inspect.1
markdown/podman-machine-list.1 markdown/podman-machine-reset.1
""".split()

BLOCK = {"h1","h2","h3","h4","h5","h6","p","li","dt","dd","pre","tr",
         "section","div","ul","ol","table","dl","blockquote","article","br"}
SKIP = {"script","style","svg","noscript"}


class MainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0            # div nesting while inside body
        self.active = False
        self.skip = 0
        self.pre = False
        self.buf = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "div" and not self.active and d.get("role") == "main":
            self.active = True
            self.depth = 1
            return
        if not self.active:
            return
        if tag in SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        if tag == "div":
            self.depth += 1
        if tag == "pre":
            self.pre = True
        if not self.pre and tag in BLOCK:
            self.buf.append("\n")

    def handle_endtag(self, tag):
        if not self.active:
            return
        if tag in SKIP and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        if tag == "pre":
            self.pre = False
            self.buf.append("\n")
        if tag == "div":
            self.depth -= 1
            if self.depth == 0:
                self.active = False
        if not self.pre and tag in BLOCK:
            self.buf.append("\n")

    def handle_data(self, data):
        if not self.active or self.skip:
            return
        if data.strip() == "¶":
            return
        self.buf.append(data if self.pre else re.sub(r"[ \t]+", " ", data))


def fetch(slug):
    url = BASE + slug + ".html"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8", "replace")
    p = MainText()
    p.feed(raw)
    txt = "".join(p.buf)
    lines = []
    for line in txt.splitlines():
        line = line.strip() if not line.startswith((" ", "\t")) else line.rstrip()
        if line:
            lines.append(line)
    return slug, "\n".join(lines) + "\n", url


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ok, fail = 0, []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch, s): s for s in PAGES}
        for f in as_completed(futs):
            slug = futs[f]
            try:
                slug, txt, url = f.result()
                path = OUT / (slug + ".md")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(txt, encoding="utf-8")
                ok += 1
            except Exception as e:
                fail.append((slug, str(e)))
    print("captured", ok, "failed", len(fail))
    for s, e in fail:
        print("FAIL", s, e)


if __name__ == "__main__":
    main()
