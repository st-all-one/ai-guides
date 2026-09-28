#!/usr/bin/env bash
# ai-guides installer — instala a CLI `ai-guides`.
#
# Funciona de duas formas:
#   1) dentro do repositório:  ./install.sh
#   2) estilo curl | bash:     curl --proto '=https' --tlsv1.2 -sSf \
#                                https://raw.githubusercontent.com/st-all-one/ai-guides/main/install.sh | bash
#
# A CLI em si baixa os guias direto do GitHub; este instalador só coloca o
# script `ai-guides` no PATH.
#
# Uso:
#   ./install.sh [--copy|--symlink] [--install-dir DIR] [--no-path] [--uninstall]
#
# Variáveis de ambiente:
#   AI_GUIDES_REPO         owner/repo no GitHub        (default: st-all-one/ai-guides)
#   AI_GUIDES_REF          branch/tag a instalar       (default: main)
#   AI_GUIDES_BASE_URL     base para download raw       (default: https://raw.githubusercontent.com)
#   AI_GUIDES_INSTALL_DIR  diretório de destino         (default: ~/.local/bin)
#   AI_GUIDES_NO_PATH=1    não edita os rc files (PATH)
set -euo pipefail

if [ -z "${BASH_VERSION:-}" ]; then
  printf '%s\n' "Este instalador usa recursos do bash. Rode: curl ... | bash" >&2
  exit 1
fi

REPO="${AI_GUIDES_REPO:-st-all-one/ai-guides}"
REF="${AI_GUIDES_REF:-main}"
BASE_URL="${AI_GUIDES_BASE_URL:-https://raw.githubusercontent.com}"
INSTALL_DIR="${AI_GUIDES_INSTALL_DIR:-${HOME}/.local/bin}"
MODE="copy"
DO_UNINSTALL=0
NO_PATH="${AI_GUIDES_NO_PATH:-0}"
TMP=""

# HTTPS obrigatório por padrão; um base `http://` explícito (teste local) libera.
CURL_PROTO=""
case "$BASE_URL" in
  https://*) CURL_PROTO="--proto =https --proto-redir =https --tlsv1.2" ;;
esac

info() { printf '\033[34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m  ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m  !\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[31m  ✗\033[0m %s\n' "$*" >&2; exit 1; }

require() { command -v "$1" >/dev/null 2>&1 || err "ferramenta necessária não encontrada: $1"; }
tilde()   { printf '%s' "${1/#$HOME/\~}"; }

# Guardas para remoção: nunca vazio, nunca "/". Imprime o caminho ou retorna 1.
is_safe_path() {
  local path="${1:-}"
  while [ "${path%/}" != "$path" ]; do path="${path%/}"; done
  [ -n "$path" ] || return 1
  case "$path" in
    "/"|"."|"..") return 1 ;;
  esac
  printf '%s' "$path"
}

safe_rm_f() {
  local path
  path=$(is_safe_path "${1:-}") || err "recusando remover caminho inseguro: '${1:-}'"
  rm -f -- "$path"
}

cleanup() {
  case "${TMP:-}" in
    ""|"/"|"//") return 0 ;;
  esac
  rm -rf -- "$TMP"
}
trap cleanup EXIT

usage() {
  if [ -r "${BASH_SOURCE[0]:-$0}" ]; then
    sed -n '4,20p' "${BASH_SOURCE[0]:-$0}" | sed 's/^# \{0,1\}//'
  else
    cat <<'EOF'
ai-guides installer

Uso: install.sh [--copy|--symlink] [--install-dir DIR] [--no-path] [--uninstall]

Exemplo:
  curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/st-all-one/ai-guides/main/install.sh | bash
EOF
  fi
}

# ── argumentos ───────────────────────────────────────────────────────────────
while [ "$#" -gt 0 ]; do
  case "$1" in
    --copy)          MODE="copy" ;;
    --symlink)       MODE="symlink" ;;
    --uninstall|--remove) DO_UNINSTALL=1 ;;
    --install-dir)   [ "$#" -ge 2 ] || err "--install-dir exige um valor"; INSTALL_DIR="$2"; shift ;;
    --install-dir=*) INSTALL_DIR="${1#*=}" ;;
    --prefix)        [ "$#" -ge 2 ] || err "--prefix exige um valor"; INSTALL_DIR="$2/bin"; shift ;;
    --prefix=*)      INSTALL_DIR="${1#*=}/bin" ;;
    --ref)           [ "$#" -ge 2 ] || err "--ref exige um valor"; REF="$2"; shift ;;
    --ref=*)         REF="${1#*=}" ;;
    --no-path)       NO_PATH=1 ;;
    -h|--help)       usage; exit 0 ;;
    *) err "argumento desconhecido: $1 (use --help)" ;;
  esac
  shift
done

DEST="$INSTALL_DIR/ai-guides"

# Nunca instalar/remover em raiz ou caminho vazio.
case "$INSTALL_DIR" in
  ""|"/"|"."|"..") err "INSTALL_DIR inseguro: '${INSTALL_DIR}'" ;;
esac

# ── uninstall ────────────────────────────────────────────────────────────────
if [ "$DO_UNINSTALL" -eq 1 ]; then
  if [ -e "$DEST" ] || [ -L "$DEST" ]; then
    safe_rm_f "$DEST"
    ok "removido: $(tilde "$DEST")"
  else
    warn "nada instalado em $(tilde "$DEST")"
  fi
  exit 0
fi

# ── origem: repositório local ou download ────────────────────────────────────
SRC=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  [ -f "${SCRIPT_DIR}/bin/ai-guides" ] && SRC="${SCRIPT_DIR}/bin/ai-guides"
fi

if [ -z "$SRC" ]; then
  require curl
  TMP="$(mktemp -d)"
  URL="${BASE_URL}/${REPO}/${REF}/bin/ai-guides"
  info "baixando ${URL}"
  # shellcheck disable=SC2086
  curl $CURL_PROTO --show-error --fail -fsSL "$URL" -o "${TMP}/ai-guides" \
    || err "falha ao baixar ${URL}"
  SRC="${TMP}/ai-guides"
  case "$(head -c2 "$SRC")" in
    '#!') ;;
    *) err "o arquivo baixado não parece ser um script (${URL})" ;;
  esac
fi

# ── instalação ───────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR" 2>/dev/null || err "não foi possível criar $(tilde "$INSTALL_DIR")"
[ -w "$INSTALL_DIR" ] || err "$(tilde "$INSTALL_DIR") não é gravável (use --install-dir ou sudo)"

safe_rm_f "$DEST"
if [ "$MODE" = "symlink" ]; then
  [ -n "${SCRIPT_DIR:-}" ] || err "--symlink só funciona a partir do repositório clonado"
  ln -s "$SRC" "$DEST"
  chmod +x "$SRC"
  ok "symlink: $(tilde "$DEST") → $SRC"
else
  install -m 0755 "$SRC" "$DEST"
  ok "instalado: $(tilde "$DEST")"
fi

# ── PATH ─────────────────────────────────────────────────────────────────────
add_path_line() {
  local file="$1" line marker
  line="export PATH=\"${INSTALL_DIR}:\${PATH}\""
  marker="# --- ai-guides path ---"
  grep -qxF "$line" "$file" 2>/dev/null && return 0
  grep -qxF "$marker" "$file" 2>/dev/null && return 0
  [ -s "$file" ] && [ "$(tail -c1 "$file" | wc -l)" -eq 0 ] && echo "" >> "$file"
  { echo "$marker"; echo "$line"; } >> "$file"
  ok "PATH adicionado a $(tilde "$file")"
}

if [ "$NO_PATH" != "1" ]; then
  if printf '%s' "$PATH" | tr ':' '\n' | grep -qxF "$INSTALL_DIR"; then
    ok "$(tilde "$INSTALL_DIR") já está no PATH"
  else
    touched=0
    for file in "${HOME}/.profile" "${HOME}/.bashrc" "${HOME}/.bash_profile" \
                "${HOME}/.zshrc" "${ZDOTDIR:-${HOME}}/.zshrc"; do
      [ -f "$file" ] || continue
      touched=1
      add_path_line "$file"
    done
    if [ "$touched" -eq 0 ]; then
      : > "${HOME}/.profile"
      add_path_line "${HOME}/.profile"
    fi
    warn "reinicie o shell ou rode: export PATH=\"${INSTALL_DIR}:\$PATH\""
  fi
fi

echo ""
info "Pronto! Instale skills no seu projeto com:"
echo "  cd ~/meu-projeto"
echo "  ai-guides            # mini-CLI interativo (filtrar + selecionar)"
echo "  ai-guides install dart rust"
echo ""
info "Docs: https://github.com/${REPO}"
