#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox v3.0.0 — One-Command Setup
# Runs automatically when Codespace opens (postCreateCommand).
# Everything starts itself. Nothing for you to type.
# =============================================================================
set -euo pipefail

DAVE_VERSION="3.0.0"
DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$HOME/dave-workspace"
LOG_DIR="$WORKSPACE_DIR/logs"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()  { echo -e "${CYAN}[DAVE]${RESET} $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()   { echo -e "${RED}[ERR]${RESET}  $*" >&2; }
step()  { echo -e "\n${BOLD}${BLUE}▶  $*${RESET}\n"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}${BLUE}"
cat << 'BANNER'
 ██████╗  █████╗ ██╗   ██╗███████╗
 ██╔══██╗██╔══██╗██║   ██║██╔════╝
 ██║  ██║███████║██║   ██║█████╗
 ██║  ██║██╔══██║╚██╗ ██╔╝██╔══╝
 ██████╔╝██║  ██║ ╚████╔╝ ███████╗
 ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
        DevBox  v3.0.0
BANNER
echo -e "${RESET}  ${CYAN}Tor · Gemini-free · All-in-web-app · a-Shell ready${RESET}\n"

# ─── Load .env early ──────────────────────────────────────────────────────────
# Load .env — only set vars not already in environment (Codespaces secrets take priority)
[ -f "$DAVE_DIR/.env" ] && while IFS= read -r _line || [ -n "$_line" ]; do
  _line="${_line%%#*}"; _line="${_line#"${_line%%[![:space:]]*}"}"
  [[ "$_line" == *=* ]] || continue
  _k="${_line%%=*}"; _v="${_line#*=}"
  [ -z "${!_k:-}" ] && export "$_k"="$_v"
done < "$DAVE_DIR/.env" 2>/dev/null || true

# ─── Dirs ─────────────────────────────────────────────────────────────────────
step "Creating workspace"
mkdir -p "$WORKSPACE_DIR"/{projects,models,logs,config,scripts,templates}
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/setup.log") 2>&1
ok "Workspace: $WORKSPACE_DIR"

# ─── OS detection ─────────────────────────────────────────────────────────────
OS="linux"; PKG="apt-get"
[[ "${OSTYPE:-}" == "darwin"* ]] && OS="macos" && PKG="brew"
[ -f /etc/fedora-release ] && PKG="dnf"
ok "OS: $OS ($PKG)"

# ─── System packages ──────────────────────────────────────────────────────────
step "Installing system packages"
case "$OS" in
  linux)
    sudo apt-get update -qq 2>/dev/null || true
    sudo apt-get install -y \
      git curl wget nano vim tmux htop unzip jq \
      build-essential ca-certificates \
      tor torsocks proxychains4 \
      openssh-server \
      python3 python3-pip python3-venv \
      2>/dev/null || warn "Some packages may have failed — continuing"
    ;;
  macos)
    command -v brew &>/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew install git curl wget vim tmux htop jq tor torsocks 2>/dev/null || true
    ;;
esac
ok "System packages installed"

# ─── Python + AI deps ─────────────────────────────────────────────────────────
step "Installing Python AI stack"
python3 -m pip install --upgrade pip --quiet 2>/dev/null || true
pip install \
  aider-chat \
  google-generativeai \
  requests \
  python-dotenv \
  playwright \
  --quiet 2>/dev/null || warn "Some Python packages failed — aider will still work"
ok "Python AI stack ready"

# ─── Node.js ──────────────────────────────────────────────────────────────────
step "Setting up Node.js"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
  sudo apt-get install -y nodejs 2>/dev/null
fi
ok "Node $(node --version 2>/dev/null || echo '?')"

# ─── Dashboard ────────────────────────────────────────────────────────────────
step "Installing dashboard"
cd "$DAVE_DIR/dashboard"
npm install --silent 2>/dev/null || npm install 2>/dev/null || warn "Dashboard npm install failed"
# Install node-pty for real terminal
npm install node-pty --silent 2>/dev/null || warn "node-pty optional — terminal still works"
# Build frontend
if [ -d frontend ]; then
  cd frontend
  npm install --silent 2>/dev/null || npm install 2>/dev/null || true
  npm run build --silent 2>/dev/null || warn "Frontend build failed — server still serves fallback"
  cd ..
fi
cd "$DAVE_DIR"
ok "Dashboard installed"

# ─── Tor ──────────────────────────────────────────────────────────────────────
step "Configuring Tor"
bash "$DAVE_DIR/tor-setup.sh" 2>/dev/null || warn "Tor setup had warnings"

# ─── SSH ──────────────────────────────────────────────────────────────────────
step "Configuring SSH"
bash "$DAVE_DIR/ssh-setup.sh" 2>/dev/null || warn "SSH setup had warnings"

# ─── Apply SSH key from .env (a-Shell key added via web UI or .env) ────────────
step "Applying SSH public key from .env"
if [ -n "${ASHELL_SSH_PUBKEY:-}" ]; then
  SSH_DIR="$HOME/.ssh"
  mkdir -p "$SSH_DIR"
  chmod 700 "$SSH_DIR"
  AUTH_KEYS="$SSH_DIR/authorized_keys"
  touch "$AUTH_KEYS"
  chmod 600 "$AUTH_KEYS"
  if ! grep -qF "$ASHELL_SSH_PUBKEY" "$AUTH_KEYS" 2>/dev/null; then
    echo "$ASHELL_SSH_PUBKEY" >> "$AUTH_KEYS"
    ok "a-Shell SSH key added to authorized_keys"
  else
    ok "a-Shell SSH key already present"
  fi
else
  warn "No ASHELL_SSH_PUBKEY in .env — add your a-Shell public key via the web app Setup page after startup"
fi

# ─── Shell aliases ────────────────────────────────────────────────────────────
step "Configuring shell"
PROFILE="$HOME/.bashrc"
[[ "$OS" == "macos" ]] && PROFILE="$HOME/.zshrc"

if ! grep -q "DAVE DevBox" "$PROFILE" 2>/dev/null; then
  cat >> "$PROFILE" << SHELLRC

# ── DAVE DevBox v3.0 ──────────────────────────────────────────────────────────
export DAVE_DIR="$DAVE_DIR"
export WORKSPACE_DIR="$WORKSPACE_DIR"
export PATH="\$PATH:\$HOME/.local/bin"

# Load .env on every shell
# Load .env — only set vars not already in environment
while IFS= read -r _l || [ -n "$_l" ]; do _l="${_l%%#*}"; [[ "$_l" == *=* ]] || continue; _k="${_l%%=*}"; [ -z "${!_k:-}" ] && export "$_k"="${_l#*=}"; done < "$DAVE_DIR/.env" 2>/dev/null || true

# AI agents (choose mode: coder researcher planner reviewer hacker)
alias dave-ai="bash \$DAVE_DIR/aider-start.sh coder"
alias dave-coder="bash \$DAVE_DIR/aider-start.sh coder"
alias dave-researcher="bash \$DAVE_DIR/aider-start.sh researcher"
alias dave-planner="bash \$DAVE_DIR/aider-start.sh planner"
alias dave-reviewer="bash \$DAVE_DIR/aider-start.sh reviewer"
alias dave-hacker="bash \$DAVE_DIR/aider-start.sh hacker"

# Tor
alias dave-tor="bash \$DAVE_DIR/tor-start.sh"
alias dave-tor-check="torsocks curl -s https://api.ipify.org && echo ' (Tor exit)'"
alias anon-curl="torsocks curl"
alias anon-wget="torsocks wget"
alias anon-git="torsocks git"

# System
alias dave-status="bash \$DAVE_DIR/status.sh"
alias dave-dash="cd \$DAVE_DIR && node dashboard/server.js"
alias dave-restart="bash \$DAVE_DIR/start-all.sh"

# Memory — add a note that persists into every AI session
dave-remember() { echo -e "\n## \$(date -Iseconds)\n\$*" >> "\$WORKSPACE_DIR/.aider.memory.md" && echo "Remembered."; }
# ─────────────────────────────────────────────────────────────────────────────
SHELLRC
  ok "Shell configured: $PROFILE"
fi

# ─── Playwright (optional) ────────────────────────────────────────────────────
step "Installing Chromium for browser automation"
python3 -m playwright install chromium --with-deps 2>/dev/null || \
  warn "Playwright: run 'sudo python3 -m playwright install chromium --with-deps' if needed"

# ─── Start everything ─────────────────────────────────────────────────────────
step "Starting all services"
bash "$DAVE_DIR/start-all.sh"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  DAVE DevBox v${DAVE_VERSION} is ready.${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${CYAN}Dashboard:${RESET}  ${BOLD}http://localhost:3000${RESET}  (auto-forwarded by Codespaces)"
echo ""
echo -e "  ${CYAN}First time?${RESET} Open the dashboard → ${BOLD}Setup${RESET} page to:"
echo -e "    1. Add your free Gemini key (aistudio.google.com/apikey)"
echo -e "    2. Paste your a-Shell SSH public key — done, no terminal needed"
echo ""
echo -e "  ${CYAN}AI agents:${RESET}"
echo -e "    ${BOLD}dave-ai${RESET}          Coder agent (default)"
echo -e "    ${BOLD}dave-researcher${RESET}  Research & analysis"
echo -e "    ${BOLD}dave-hacker${RESET}      Security assessment"
echo ""
echo -e "  ${CYAN}Tor:${RESET}"
REAL_IP=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || echo "?")
TOR_IP=$(torsocks curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "starting...")
echo -e "    Real IP: ${RED}$REAL_IP${RESET}"
echo -e "    Tor IP:  ${GREEN}$TOR_IP${RESET}"
echo ""

source "$PROFILE" 2>/dev/null || true
