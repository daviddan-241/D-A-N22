#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Start All Services
# Called automatically by setup.sh — one command, everything up
# =============================================================================
set -euo pipefail

DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="${HOME}/dave-workspace"
LOG_DIR="${WORKSPACE_DIR}/logs"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[START]${RESET} $*"; }
info() { echo -e "${CYAN}[START]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET}  $*"; }

mkdir -p "$LOG_DIR"

# Load .env — Codespaces secrets (already in env) take priority over blank .env values
[ -f "$DAVE_DIR/.env" ] && while IFS= read -r _l || [ -n "$_l" ]; do
  _l="${_l%%#*}"; [[ "$_l" == *=* ]] || continue
  _k="${_l%%=*}"; [ -z "${!_k:-}" ] && export "$_k"="${_l#*=}"
done < "$DAVE_DIR/.env" 2>/dev/null || true
DASH_PORT="${DASHBOARD_PORT:-3000}"

# ─── 1. Build frontend if dist is missing or empty ────────────────────────────
DIST_DIR="$DAVE_DIR/dashboard/frontend/dist"
if [ ! -f "$DIST_DIR/index.html" ]; then
  info "Building frontend (first run)..."
  cd "$DAVE_DIR/dashboard/frontend"
  # Remove old config files that might cause issues
  rm -f postcss.config.js tailwind.config.js 2>/dev/null || true
  npm install --silent 2>/dev/null || npm install 2>&1 | tail -3
  npm run build 2>&1 | tail -5
  cd "$DAVE_DIR"
  ok "Frontend built → $DIST_DIR"
else
  ok "Frontend ready (pre-built)"
fi

# ─── 2. Dashboard ─────────────────────────────────────────────────────────────
info "Starting dashboard (port ${DASH_PORT})..."
# Kill any existing dashboard
pkill -f "node.*dashboard/server.js" 2>/dev/null || true
sleep 1
node "$DAVE_DIR/dashboard/server.js" >> "$LOG_DIR/dashboard.log" 2>&1 &
DASH_PID=$!
echo $DASH_PID > "$HOME/.dave-dashboard.pid"

# Wait for it to bind
sleep 2
if kill -0 $DASH_PID 2>/dev/null; then
  ok "Dashboard running (PID $DASH_PID) → http://localhost:${DASH_PORT}"
else
  warn "Dashboard may have failed — check $LOG_DIR/dashboard.log"
fi

# ─── 3. Tor ───────────────────────────────────────────────────────────────────
info "Starting Tor..."
bash "$DAVE_DIR/tor-start.sh" >> "$LOG_DIR/tor.log" 2>&1 &

# ─── 4. SSH ───────────────────────────────────────────────────────────────────
if command -v sshd &>/dev/null; then
  sudo service ssh start 2>/dev/null || sudo /usr/sbin/sshd 2>/dev/null || true
  ok "SSH server started"
fi

# ─── 5. Ollama (if installed) ─────────────────────────────────────────────────
if command -v ollama &>/dev/null && ! pgrep -x ollama &>/dev/null; then
  info "Starting Ollama..."
  ollama serve >> "$LOG_DIR/ollama.log" 2>&1 &
  ok "Ollama started"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}  All services started.${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${CYAN}Dashboard:${RESET} ${GREEN}http://localhost:${DASH_PORT}${RESET}"
echo -e "  ${CYAN}           Codespaces will auto-forward this port${RESET}"
echo -e "  ${CYAN}           → click the port ${DASH_PORT} link in VS Code Ports tab${RESET}"
echo ""
echo -e "  ${CYAN}Login:${RESET}     admin / dave2024  (change in Settings)"
echo -e "  ${CYAN}Tor SOCKS:${RESET} 127.0.0.1:9050"
echo ""
