#!/bin/bash
# =============================================================================
# DAVE DevBox — Docker Entrypoint
# =============================================================================
set -e

# Setup SSH if authorized_keys exists
if [ -f /root/.ssh/authorized_keys ]; then
  service ssh start || true
fi

# Ensure workspace dirs
mkdir -p /home/dave/workspace/{projects,models,logs,config,scripts}

# Start Ollama in background if available
if command -v ollama &>/dev/null; then
  ollama serve &>/dev/null &
fi

echo "DAVE DevBox container started."
echo "Dashboard: http://localhost:3000"

exec "$@"
