#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Start Tor
# =============================================================================

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[TOR]${RESET}  $*"; }
info() { echo -e "${CYAN}[TOR]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[TOR]${RESET}  $*"; }

TORRC="$HOME/.tor/torrc"
TOR_PID_FILE="$HOME/.tor/tor.pid"
TOR_LOG="$HOME/.tor/tor.log"

# Check if already running
if [ -f "$TOR_PID_FILE" ] && kill -0 "$(cat "$TOR_PID_FILE")" 2>/dev/null; then
  ok "Tor already running (PID $(cat "$TOR_PID_FILE"))"
  exit 0
fi

# Kill any stale Tor
pkill -x tor 2>/dev/null || true

# Start Tor
info "Starting Tor..."
tor -f "$TORRC" --quiet &
TOR_PID=$!
echo $TOR_PID > "$TOR_PID_FILE"

# Wait for Tor to bootstrap
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if grep -q "Bootstrapped 100" "$TOR_LOG" 2>/dev/null; then
    ok "Tor bootstrapped! PID: $TOR_PID"
    # Show Tor IP
    TOR_IP=$(torsocks curl -sf --max-time 10 https://api.ipify.org 2>/dev/null || echo "checking...")
    ok "Your anonymous IP: ${TOR_IP}"
    exit 0
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  [ $((WAITED % 10)) -eq 0 ] && info "Waiting for Tor... (${WAITED}s)"
done

warn "Tor is taking longer than usual. Check $TOR_LOG"
warn "Real IP: $(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null)"
