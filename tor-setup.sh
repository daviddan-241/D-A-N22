#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Tor Setup & Configuration
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[TOR]${RESET}  $*"; }
info() { echo -e "${CYAN}[TOR]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[TOR]${RESET}  $*"; }

TOR_DATA_DIR="$HOME/.tor"
TORRC="$TOR_DATA_DIR/torrc"

# ─── Create Tor data directory ────────────────────────────────────────────────
mkdir -p "$TOR_DATA_DIR"
chmod 700 "$TOR_DATA_DIR"

# ─── Write torrc ──────────────────────────────────────────────────────────────
cat > "$TORRC" << 'EOF'
# DAVE DevBox Tor Configuration
SocksPort 9050
SocksPort 9150
ControlPort 9051
DataDirectory ~/.tor/data
Log notice file ~/.tor/tor.log
ExitPolicy reject *:*

# Performance
CircuitBuildTimeout 30
LearnCircuitBuildTimeout 0
MaxCircuitDirtiness 600
NewCircuitPeriod 30

# Privacy
AvoidDiskWrites 1
SafeLogging 1
EOF

mkdir -p "$TOR_DATA_DIR/data"
ok "Tor configuration written: $TORRC"

# ─── Write proxychains config ─────────────────────────────────────────────────
PROXYCHAINS_CONF="/etc/proxychains4.conf"
if [ -f "$PROXYCHAINS_CONF" ]; then
  sudo tee "$PROXYCHAINS_CONF" > /dev/null << 'EOF'
# proxychains4 config — DAVE DevBox
strict_chain
proxy_dns
[ProxyList]
socks5 127.0.0.1 9050
EOF
  ok "proxychains4 configured"
fi

# ─── User-space proxychains config (no sudo needed) ───────────────────────────
mkdir -p "$HOME/.proxychains"
cat > "$HOME/.proxychains/proxychains.conf" << 'EOF'
strict_chain
proxy_dns
[ProxyList]
socks5 127.0.0.1 9050
EOF
ok "User proxychains config written"

# ─── torsocks config ──────────────────────────────────────────────────────────
mkdir -p "$HOME/.torsocks"
cat > "$HOME/.torsocks/torsocks.conf" << 'EOF'
TorAddress 127.0.0.1
TorPort 9050
OnionAddrRange 127.42.42.0/24
SOCKS5Username ""
SOCKS5Password ""
AllowInbound 0
AllowOutboundLocalhost 1
EOF
ok "torsocks configured"

ok "Tor setup complete. Starting Tor..."
bash "$(dirname "$0")/tor-start.sh"
