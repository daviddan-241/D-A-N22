#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — SSH Setup
# =============================================================================
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}[SSH]${RESET}  $*"; }
info() { echo -e "${CYAN}[SSH]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[SSH]${RESET}  $*"; }

SSH_DIR="$HOME/.ssh"
KEY_FILE="$SSH_DIR/dave_devbox_ed25519"
SSHD_CONFIG="/etc/ssh/sshd_config"

header() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━  DAVE DevBox — SSH Setup  ━━━${RESET}"
  echo ""
}

# ─── Generate SSH Key Pair ────────────────────────────────────────────────────
generate_keys() {
  mkdir -p "$SSH_DIR"
  chmod 700 "$SSH_DIR"

  if [ ! -f "$KEY_FILE" ]; then
    ssh-keygen -t ed25519 -f "$KEY_FILE" -C "dave-devbox-$(hostname)" -N ""
    ok "Generated ed25519 key pair: $KEY_FILE"
  else
    ok "Key already exists: $KEY_FILE"
  fi

  # Add to authorized_keys
  if [ -f "${KEY_FILE}.pub" ]; then
    touch "$SSH_DIR/authorized_keys"
    chmod 600 "$SSH_DIR/authorized_keys"
    if ! grep -qF "$(cat "${KEY_FILE}.pub")" "$SSH_DIR/authorized_keys" 2>/dev/null; then
      cat "${KEY_FILE}.pub" >> "$SSH_DIR/authorized_keys"
      ok "Public key added to authorized_keys"
    fi
  fi
}

# ─── Install & Configure SSH Server ──────────────────────────────────────────
install_sshd() {
  if command -v sshd &>/dev/null; then
    ok "OpenSSH server already installed"
    return
  fi

  if [ -f /etc/debian_version ]; then
    sudo apt-get install -y openssh-server 2>/dev/null && ok "OpenSSH server installed"
  elif [ -f /etc/fedora-release ]; then
    sudo dnf install -y openssh-server 2>/dev/null && ok "OpenSSH server installed"
  else
    warn "Cannot auto-install sshd. Install openssh-server manually."
    return
  fi

  # Basic hardening
  if [ -f "$SSHD_CONFIG" ]; then
    sudo tee -a "$SSHD_CONFIG" > /dev/null << 'EOF'

# DAVE DevBox SSH hardening
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
AllowTcpForwarding yes
EOF
    ok "sshd hardened (key-only auth)"
  fi

  sudo systemctl enable ssh 2>/dev/null || true
  sudo systemctl start ssh 2>/dev/null || sudo service ssh start 2>/dev/null || \
    warn "Could not start sshd — start it manually: sudo service ssh start"
}

# ─── Detect Connection Details ────────────────────────────────────────────────
show_connection_info() {
  USERNAME="$(whoami)"
  SSH_PORT=22

  # Try Codespaces hostname
  if [ -n "${CODESPACE_NAME:-}" ]; then
    HOST="${CODESPACE_NAME}-${SSH_PORT}.preview.app.github.dev"
    CONNECTION_TYPE="GitHub Codespaces"
  else
    # Get public IP
    PUBLIC_IP=$(curl -sf https://api.ipify.org 2>/dev/null || \
                curl -sf https://ifconfig.me 2>/dev/null || \
                echo "YOUR_SERVER_IP")
    HOST="$PUBLIC_IP"
    CONNECTION_TYPE="Direct"
  fi

  echo ""
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${GREEN}  SSH Connection Details${RESET}"
  echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo -e "  Connection type: ${BOLD}${CONNECTION_TYPE}${RESET}"
  echo -e "  Username:        ${BOLD}${USERNAME}${RESET}"
  echo -e "  Host:            ${BOLD}${HOST}${RESET}"
  echo -e "  Port:            ${BOLD}${SSH_PORT}${RESET}"
  echo ""
  echo -e "  ${CYAN}Connect with:${RESET}"
  echo -e "  ${BOLD}ssh ${USERNAME}@${HOST}${RESET}"
  echo ""
  echo -e "  ${CYAN}iPhone a-Shell Setup:${RESET}"
  echo -e "  1. Install a-Shell from the App Store"
  echo -e "  2. In a-Shell, run:"
  echo -e "     ${BOLD}ssh-keygen -t ed25519${RESET}"
  echo -e "     ${BOLD}cat ~/.ssh/id_ed25519.pub${RESET}"
  echo -e "  3. Add the output to:"
  echo -e "     ${BOLD}$SSH_DIR/authorized_keys${RESET}"
  echo -e "  4. Connect:"
  echo -e "     ${BOLD}ssh ${USERNAME}@${HOST}${RESET}"
  echo ""
  echo -e "  ${CYAN}Private key path (for manual import):${RESET}"
  echo -e "  ${BOLD}${KEY_FILE}${RESET}"
  echo ""
  echo -e "  ${CYAN}tmux quick reference:${RESET}"
  echo -e "  ${BOLD}tmux new -s dave${RESET}    — new session"
  echo -e "  ${BOLD}tmux attach -t dave${RESET} — reconnect"
  echo -e "  ${BOLD}Ctrl+B D${RESET}            — detach"
  echo ""
}

header
generate_keys
install_sshd
show_connection_info
