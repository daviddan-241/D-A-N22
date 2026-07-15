#!/usr/bin/env bash
# DAVE DevBox — Quick Status Check
DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()  { echo -e "  ${GREEN}●${RESET} $*"; }
err() { echo -e "  ${RED}○${RESET} $*"; }

echo -e "\n${BOLD}${CYAN}DAVE DevBox v2.0.0 — Status${RESET}\n"

# Load env
[ -f "$DAVE_DIR/.env" ] && export $(grep -v '^#' "$DAVE_DIR/.env" | grep -v '^$' | xargs) 2>/dev/null

# Dashboard
DASH_PID=$(cat "$HOME/.dave-dashboard.pid" 2>/dev/null || echo "")
if [ -n "$DASH_PID" ] && kill -0 "$DASH_PID" 2>/dev/null; then
  ok "Dashboard: http://localhost:${DASHBOARD_PORT:-3000}"
else
  err "Dashboard: not running (start: node $DAVE_DIR/dashboard/server.js &)"
fi

# Tor
if pgrep -x tor &>/dev/null; then
  TOR_IP=$(torsocks curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || echo "...")
  ok "Tor: running — anonymous IP: $TOR_IP"
  REAL_IP=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || echo "...")
  echo -e "      Real IP: $REAL_IP"
else
  err "Tor: not running (start: bash $DAVE_DIR/tor-start.sh)"
fi

# Aider / Gemini
if command -v aider &>/dev/null && [ -n "${GEMINI_API_KEY:-}" ]; then
  ok "Aider: ready (Gemini API key configured)"
elif command -v aider &>/dev/null; then
  err "Aider: installed but GEMINI_API_KEY not set in .env"
else
  err "Aider: not installed"
fi

# SSH
if pgrep -x sshd &>/dev/null || ss -tlnp 2>/dev/null | grep -q ':22 '; then
  ok "SSH: listening on port 22"
else
  err "SSH: not running"
fi

# Ollama
if command -v ollama &>/dev/null; then
  if pgrep -x ollama &>/dev/null; then
    MODELS=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}' | paste -sd', ' || echo "none")
    ok "Ollama: running — models: ${MODELS:-none}"
  else
    err "Ollama: not running (start: ollama serve &)"
  fi
fi

echo ""
echo -e "  ${CYAN}Tor check:${RESET} torsocks curl https://api.ipify.org"
echo -e "  ${CYAN}AI coding:${RESET} dave-ai"
echo -e "  ${CYAN}Restart all:${RESET} bash $DAVE_DIR/start-all.sh"
echo ""
