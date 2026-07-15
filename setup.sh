#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — One-Command Setup
# =============================================================================
set -euo pipefail

DAVE_VERSION="1.0.0"
WORKSPACE_DIR="$HOME/workspace"
LOG_FILE="$WORKSPACE_DIR/logs/setup.log"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${BLUE}━━━  $*  ━━━${RESET}\n"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
print_banner() {
  echo -e "${BOLD}${BLUE}"
  cat << 'EOF'
  ██████╗  █████╗ ██╗   ██╗███████╗
  ██╔══██╗██╔══██╗██║   ██║██╔════╝
  ██║  ██║███████║██║   ██║█████╗
  ██║  ██║██╔══██║╚██╗ ██╔╝██╔══╝
  ██████╔╝██║  ██║ ╚████╔╝ ███████╗
  ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
         DevBox  v1.0.0
EOF
  echo -e "${RESET}"
  echo -e "  ${CYAN}Self-hosted AI Development Environment${RESET}"
  echo -e "  ${CYAN}Free-tier friendly · iPhone a-Shell ready${RESET}\n"
}

# ─── OS Detection ─────────────────────────────────────────────────────────────
detect_os() {
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -f /etc/debian_version ]; then
      OS="debian"; PKG_MGR="apt-get"
    elif [ -f /etc/fedora-release ]; then
      OS="fedora"; PKG_MGR="dnf"
    elif [ -f /etc/arch-release ]; then
      OS="arch"; PKG_MGR="pacman"
    else
      OS="linux"; PKG_MGR="apt-get"
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"; PKG_MGR="brew"
  else
    error "Unsupported OS: $OSTYPE"; exit 1
  fi
  success "Detected OS: $OS (package manager: $PKG_MGR)"
}

# ─── Directory Setup ──────────────────────────────────────────────────────────
create_workspace() {
  header "Creating Workspace"
  mkdir -p \
    "$WORKSPACE_DIR/projects" \
    "$WORKSPACE_DIR/models" \
    "$WORKSPACE_DIR/logs" \
    "$WORKSPACE_DIR/config" \
    "$WORKSPACE_DIR/scripts" \
    "$WORKSPACE_DIR/templates"
  success "Workspace created at $WORKSPACE_DIR"

  # Start logging
  exec > >(tee -a "$LOG_FILE") 2>&1
}

# ─── System Packages ──────────────────────────────────────────────────────────
install_system_packages() {
  header "Installing System Packages"
  PACKAGES=(git curl wget nano vim tmux htop unzip jq build-essential ca-certificates gnupg lsb-release)

  case "$OS" in
    debian|linux)
      sudo apt-get update -qq
      sudo apt-get install -y "${PACKAGES[@]}" 2>/dev/null || \
        sudo apt-get install -y "${PACKAGES[@]}"
      ;;
    macos)
      if ! command -v brew &>/dev/null; then
        warn "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      fi
      brew install git curl wget nano vim tmux htop jq
      ;;
    fedora)
      sudo dnf install -y "${PACKAGES[@]}"
      ;;
    arch)
      sudo pacman -Sy --noconfirm "${PACKAGES[@]}"
      ;;
  esac
  success "System packages installed"
}

# ─── Python ───────────────────────────────────────────────────────────────────
install_python() {
  header "Setting Up Python"
  if ! command -v python3 &>/dev/null; then
    case "$OS" in
      debian|linux) sudo apt-get install -y python3 python3-pip python3-venv ;;
      macos)        brew install python3 ;;
      fedora)       sudo dnf install -y python3 python3-pip ;;
    esac
  fi
  python3 -m pip install --upgrade pip --quiet
  pip install virtualenv --quiet
  success "Python $(python3 --version) ready"
}

# ─── Node.js ──────────────────────────────────────────────────────────────────
install_node() {
  header "Setting Up Node.js"
  if ! command -v node &>/dev/null; then
    # Use nvm for portable Node install
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1091
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm use --lts
  fi
  # Install pnpm
  if ! command -v pnpm &>/dev/null; then
    npm install -g pnpm
  fi
  success "Node $(node --version | tr -d '\n'), npm $(npm --version | tr -d '\n'), pnpm $(pnpm --version | tr -d '\n') ready"
}

# ─── Go, Rust, Java ───────────────────────────────────────────────────────────
install_extra_languages() {
  header "Installing Additional Languages"

  # Go
  if ! command -v go &>/dev/null; then
    GO_VERSION="1.22.4"
    GO_ARCH="linux-amd64"
    [[ "$(uname -m)" == "aarch64" ]] && GO_ARCH="linux-arm64"
    [[ "$OS" == "macos" ]] && GO_ARCH="darwin-amd64"
    curl -fsSL "https://go.dev/dl/go${GO_VERSION}.${GO_ARCH}.tar.gz" | sudo tar -C /usr/local -xzf - 2>/dev/null || \
      warn "Go install skipped (non-root or unsupported)"
    echo 'export PATH=$PATH:/usr/local/go/bin' >> "$HOME/.bashrc"
    success "Go installed"
  else
    success "Go already installed: $(go version)"
  fi

  # Rust
  if ! command -v rustc &>/dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --quiet
    # shellcheck disable=SC1091
    source "$HOME/.cargo/env"
    success "Rust installed: $(rustc --version)"
  else
    success "Rust already installed: $(rustc --version)"
  fi

  # Java (OpenJDK)
  if ! command -v java &>/dev/null; then
    case "$OS" in
      debian|linux) sudo apt-get install -y default-jdk-headless ;;
      macos)        brew install openjdk ;;
      fedora)       sudo dnf install -y java-17-openjdk ;;
    esac
    success "Java installed"
  else
    success "Java already installed: $(java -version 2>&1 | head -1)"
  fi
}

# ─── Aider ────────────────────────────────────────────────────────────────────
install_aider() {
  header "Installing Aider AI Coding Assistant"
  pip install aider-chat --quiet
  success "Aider installed: $(aider --version 2>/dev/null || echo 'ready')"
}

# ─── Ollama ───────────────────────────────────────────────────────────────────
install_ollama() {
  header "Setting Up Ollama (Local AI)"
  if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
    success "Ollama installed"
  else
    success "Ollama already installed"
  fi

  # Start Ollama in background
  if ! pgrep -x ollama &>/dev/null; then
    ollama serve &>/dev/null &
    sleep 2
    success "Ollama server started"
  fi
}

# ─── Browser Automation ───────────────────────────────────────────────────────
install_browser_automation() {
  header "Installing Browser Automation"

  # Python packages
  pip install playwright selenium --quiet

  # Node packages
  if command -v npm &>/dev/null; then
    npm install -g playwright --quiet 2>/dev/null || warn "Node playwright skipped"
  fi

  # Playwright browsers (Chromium)
  python3 -m playwright install chromium --with-deps 2>/dev/null || \
    warn "Playwright chromium install may require root"

  success "Browser automation tools ready"
}

# ─── SSH ──────────────────────────────────────────────────────────────────────
setup_ssh() {
  header "Configuring SSH"
  bash "$(dirname "$0")/ssh-setup.sh" 2>/dev/null || warn "SSH setup skipped (run ssh-setup.sh manually)"
}

# ─── Dashboard ────────────────────────────────────────────────────────────────
install_dashboard() {
  header "Installing Web Dashboard"
  DASH_DIR="$(dirname "$0")/dashboard"
  if [ -d "$DASH_DIR" ]; then
    cd "$DASH_DIR"
    if [ -f package.json ]; then
      npm install --silent
    fi
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
      cd frontend && npm install --silent && npm run build --silent && cd ..
    fi
    success "Dashboard installed"
    cd - >/dev/null
  else
    warn "Dashboard directory not found, skipping"
  fi
}

# ─── Environment File ─────────────────────────────────────────────────────────
setup_env() {
  header "Configuring Environment"
  ENV_FILE="$(dirname "$0")/.env"
  EXAMPLE_FILE="$(dirname "$0")/.env.example"
  if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    success ".env created from .env.example — add your API keys there"
  elif [ -f "$ENV_FILE" ]; then
    success ".env already exists"
  fi
}

# ─── Shell Profile ────────────────────────────────────────────────────────────
configure_shell() {
  header "Configuring Shell"
  PROFILE="$HOME/.bashrc"
  [[ "$OS" == "macos" ]] && PROFILE="$HOME/.zshrc"

  BLOCK='# ── DAVE DevBox ──────────────────────────────────────────────────────────
export DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export WORKSPACE_DIR="$HOME/workspace"
export PATH="$PATH:$HOME/.local/bin:/usr/local/go/bin:$HOME/.cargo/bin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
alias dave-aider="bash $DAVE_DIR/aider-start.sh"
alias dave-ssh="bash $DAVE_DIR/ssh-setup.sh"
alias dave-dash="cd $DAVE_DIR/dashboard && node server.js"
alias dave-status="echo \"DAVE DevBox v$DAVE_VERSION\"; ollama list 2>/dev/null; echo \"Dashboard: http://localhost:3000\""
# ────────────────────────────────────────────────────────────────────────────'

  if ! grep -q "DAVE DevBox" "$PROFILE" 2>/dev/null; then
    echo -e "\n$BLOCK" >> "$PROFILE"
    success "Shell profile updated: $PROFILE"
  else
    success "Shell profile already configured"
  fi
}

# ─── Verify ───────────────────────────────────────────────────────────────────
verify_installation() {
  header "Verifying Installation"
  ERRORS=0

  check() {
    if command -v "$1" &>/dev/null || python3 -c "import $1" &>/dev/null 2>&1; then
      success "$1"
    else
      warn "$1 not found (may need shell reload)"
      ((ERRORS++)) || true
    fi
  }

  check git; check curl; check python3; check pip; check vim; check tmux
  command -v node &>/dev/null && success "node" || warn "node (reload shell)"
  command -v aider &>/dev/null && success "aider" || warn "aider (reload shell)"
  command -v ollama &>/dev/null && success "ollama" || warn "ollama"

  if [ $ERRORS -gt 0 ]; then
    warn "$ERRORS item(s) need a shell reload. Run: source ~/.bashrc"
  else
    success "All components verified"
  fi
}

# ─── Final Instructions ───────────────────────────────────────────────────────
print_ready() {
  echo ""
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${GREEN}  Your DAVE DevBox is ready.${RESET}"
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo -e "  ${CYAN}Quick Commands:${RESET}"
  echo -e "  ${BOLD}dave-aider${RESET}  — Start AI coding assistant"
  echo -e "  ${BOLD}dave-ssh${RESET}    — Show SSH connection info"
  echo -e "  ${BOLD}dave-dash${RESET}   — Start web dashboard (port 3000)"
  echo -e "  ${BOLD}dave-status${RESET} — Show system status"
  echo ""
  echo -e "  ${CYAN}Next Steps:${RESET}"
  echo -e "  1. Add API keys to ${BOLD}.env${RESET}"
  echo -e "  2. Run ${BOLD}source ~/.bashrc${RESET}"
  echo -e "  3. Run ${BOLD}dave-aider${RESET} to start coding with AI"
  echo -e "  4. Open ${BOLD}http://localhost:3000${RESET} for the dashboard"
  echo -e "  5. Run ${BOLD}./ssh-setup.sh${RESET} for iPhone a-Shell access"
  echo ""
  echo -e "  ${CYAN}Docs:${RESET}  README.md  |  INSTALL.md  |  TROUBLESHOOTING.md"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  print_banner
  detect_os
  create_workspace
  install_system_packages
  install_python
  install_node
  install_extra_languages
  install_aider
  install_ollama
  install_browser_automation
  setup_ssh
  install_dashboard
  setup_env
  configure_shell
  verify_installation
  print_ready
}

main "$@"
