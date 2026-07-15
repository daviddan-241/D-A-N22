#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — One-Command Setup
# Everything installs and starts automatically.
# Only requirement: GEMINI_API_KEY in .env (free at aistudio.google.com)
# =============================================================================
set -euo pipefail

DAVE_VERSION="2.0.0"
DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$HOME/dave-workspace"
LOG_DIR="$WORKSPACE_DIR/logs"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[DAVE]${RESET} $*"; }
ok()      { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()     { echo -e "${RED}[ERR]${RESET}  $*" >&2; }
step()    { echo -e "\n${BOLD}${BLUE}▶  $*${RESET}\n"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}${BLUE}"
cat << 'BANNER'
 ██████╗  █████╗ ██╗   ██╗███████╗
 ██╔══██╗██╔══██╗██║   ██║██╔════╝
 ██║  ██║███████║██║   ██║█████╗
 ██║  ██║██╔══██║╚██╗ ██╔╝██╔══╝
 ██████╔╝██║  ██║ ╚████╔╝ ███████╗
 ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
        DevBox  v2.0.0
BANNER
echo -e "${RESET}  ${CYAN}Tor-routed · Gemini-powered · Auto-starting${RESET}\n"

# ─── Dirs ─────────────────────────────────────────────────────────────────────
step "Creating workspace"
mkdir -p "$WORKSPACE_DIR"/{projects,models,logs,config,scripts,templates}
exec > >(tee -a "$LOG_DIR/setup.log") 2>&1
ok "Workspace: $WORKSPACE_DIR"

# ─── OS ───────────────────────────────────────────────────────────────────────
OS="linux"; PKG="apt-get"
[[ "$OSTYPE" == "darwin"* ]] && OS="macos" && PKG="brew"
[ -f /etc/fedora-release ] && PKG="dnf"
ok "OS: $OS"

# ─── System packages ──────────────────────────────────────────────────────────
step "Installing system packages"
PKGS=(git curl wget nano vim tmux htop unzip jq build-essential ca-certificates tor torsocks proxychains4)
case "$OS" in
  linux)
    sudo apt-get update -qq 2>/dev/null
    sudo apt-get install -y "${PKGS[@]}" 2>/dev/null || \
      sudo apt-get install -y "${PKGS[@]}"
    ;;
  macos)
    command -v brew &>/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew install git curl wget vim tmux htop jq tor
    ;;
esac
ok "System packages installed (including Tor)"

# ─── Python ───────────────────────────────────────────────────────────────────
step "Setting up Python"
command -v python3 &>/dev/null || sudo apt-get install -y python3 python3-pip python3-venv 2>/dev/null
python3 -m pip install --upgrade pip --quiet 2>/dev/null
pip install aider-chat google-generativeai requests python-dotenv playwright --quiet 2>/dev/null
ok "Python + Aider + google-generativeai ready"

# ─── Node.js ──────────────────────────────────────────────────────────────────
step "Setting up Node.js"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
  sudo apt-get install -y nodejs 2>/dev/null
  npm install -g pnpm 2>/dev/null
fi
ok "Node $(node --version 2>/dev/null || echo '?') ready"

# ─── Dashboard dependencies ───────────────────────────────────────────────────
step "Installing dashboard"
cd "$DAVE_DIR/dashboard"
npm install --silent 2>/dev/null || true
# Build frontend if possible
if [ -d frontend ] && command -v npm &>/dev/null; then
  cd frontend
  npm install --silent 2>/dev/null || true
  npm run build --silent 2>/dev/null || true
  cd ..
fi
cd "$DAVE_DIR"
ok "Dashboard installed"

# ─── Playwright browsers ──────────────────────────────────────────────────────
step "Installing Chromium (for browser automation)"
python3 -m playwright install chromium --with-deps 2>/dev/null || \
  warn "Playwright chromium may need: sudo python3 -m playwright install chromium --with-deps"
ok "Playwright ready"

# ─── Tor ──────────────────────────────────────────────────────────────────────
step "Configuring Tor"
bash "$DAVE_DIR/tor-setup.sh"

# ─── SSH ──────────────────────────────────────────────────────────────────────
step "Configuring SSH (for a-Shell access)"
bash "$DAVE_DIR/ssh-setup.sh" 2>/dev/null || true

# ─── Shell aliases ────────────────────────────────────────────────────────────
step "Configuring shell"
PROFILE="$HOME/.bashrc"
[[ "$OS" == "macos" ]] && PROFILE="$HOME/.zshrc"

if ! grep -q "DAVE DevBox" "$PROFILE" 2>/dev/null; then
  cat >> "$PROFILE" << SHELLRC

# ── DAVE DevBox ───────────────────────────────────────────────────────────────
export DAVE_DIR="$DAVE_DIR"
export WORKSPACE_DIR="$WORKSPACE_DIR"
export PATH="\$PATH:\$HOME/.local/bin"
# Load .env automatically
[ -f "\$DAVE_DIR/.env" ] && export \$(grep -v '^#' "\$DAVE_DIR/.env" | grep -v '^\$' | xargs) 2>/dev/null

# Commands
alias dave-ai="bash \$DAVE_DIR/aider-start.sh"
alias dave-tor="bash \$DAVE_DIR/tor-start.sh"
alias dave-tor-check="torsocks curl -s https://api.ipify.org && echo"
alias dave-dash="cd \$DAVE_DIR && node dashboard/server.js"
alias dave-status="bash \$DAVE_DIR/status.sh"
alias dave-ssh="bash \$DAVE_DIR/ssh-setup.sh"
alias anon-curl="torsocks curl"
alias anon-wget="torsocks wget"

# Tor-aware git
alias tor-git="torsocks git"
# ─────────────────────────────────────────────────────────────────────────────
SHELLRC
  ok "Shell configured: $PROFILE"
fi

# ─── Auto-start everything ────────────────────────────────────────────────────
step "Starting all services"
bash "$DAVE_DIR/start-all.sh"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  Your DAVE DevBox is ready.${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${CYAN}Dashboard:${RESET}  http://localhost:3000  (auto-started)"
echo -e "  ${CYAN}Tor status:${RESET} $(torsocks curl -s --max-time 3 https://api.ipify.org 2>/dev/null || echo 'starting...')"
echo ""
echo -e "  ${CYAN}Key commands (after: source ~/.bashrc):${RESET}"
echo -e "  ${BOLD}dave-ai${RESET}         — AI coding (Gemini, free)"
echo -e "  ${BOLD}dave-tor-check${RESET}  — Verify Tor anonymity"
echo -e "  ${BOLD}dave-status${RESET}     — Full system status"
echo -e "  ${BOLD}anon-curl URL${RESET}   — Fetch through Tor"
echo ""
echo -e "  ${CYAN}a-Shell (iPhone SSH):${RESET}"
echo -e "  See ASHELL.md for connection details"
echo ""
source "$PROFILE" 2>/dev/null || true
