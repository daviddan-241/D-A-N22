#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Start All Services
# Called automatically by setup.sh
# =============================================================================
set -euo pipefail

DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[START]${RESET} $*"; }
info() { echo -e "${CYAN}[START]${RESET} $*"; }
warn() { echo -e "${YELLOW}[START]${RESET} $*"; }

# Load .env
[ -f "$DAVE_DIR/.env" ] && export $(grep -v '^#' "$DAVE_DIR/.env" | grep -v '^$' | xargs) 2>/dev/null

# ─── 1. Tor ───────────────────────────────────────────────────────────────────
info "Starting Tor..."
bash "$DAVE_DIR/tor-start.sh" &
TOR_JOB=$!

# ─── 2. Dashboard ─────────────────────────────────────────────────────────────
info "Starting dashboard (port ${DASHBOARD_PORT:-3000})..."
DASHBOARD_LOG="$HOME/dave-workspace/logs/dashboard.log"
node "$DAVE_DIR/dashboard/server.js" >> "$DASHBOARD_LOG" 2>&1 &
DASH_PID=$!
echo $DASH_PID > "$HOME/.dave-dashboard.pid"

# Give dashboard a moment to bind
sleep 2
if kill -0 $DASH_PID 2>/dev/null; then
  ok "Dashboard running (PID $DASH_PID) → http://localhost:${DASHBOARD_PORT:-3000}"
else
  warn "Dashboard may have failed — check $DASHBOARD_LOG"
fi

# ─── 3. Ollama (if installed) ─────────────────────────────────────────────────
if command -v ollama &>/dev/null; then
  if ! pgrep -x ollama &>/dev/null; then
    info "Starting Ollama..."
    ollama serve >> "$HOME/dave-workspace/logs/ollama.log" 2>&1 &
    ok "Ollama started"
  else
    ok "Ollama already running"
  fi
fi

# ─── 4. SSH ───────────────────────────────────────────────────────────────────
if command -v sshd &>/dev/null; then
  sudo service ssh start 2>/dev/null || true
  ok "SSH server started"
fi

# ─── 5. Wait for Tor ──────────────────────────────────────────────────────────
wait $TOR_JOB 2>/dev/null || true

echo ""
ok "All services started."
echo -e "  Dashboard: ${CYAN}http://localhost:${DASHBOARD_PORT:-3000}${RESET}"
echo -e "  Tor SOCKS: ${CYAN}127.0.0.1:9050${RESET}"
echo -e "  SSH:       ${CYAN}port 22 (see ASHELL.md)${RESET}"
echo ""
