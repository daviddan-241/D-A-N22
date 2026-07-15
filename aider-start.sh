#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Aider AI Coding Assistant Launcher
# =============================================================================
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'

info()  { echo -e "${CYAN}[AIDER]${RESET} $*"; }
ok()    { echo -e "${GREEN}[AIDER]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[AIDER]${RESET} $*"; }
err()   { echo -e "${RED}[AIDER]${RESET} $*" >&2; }

# ─── Load .env ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
  ok "Loaded .env"
else
  warn ".env not found — copy .env.example to .env and add your API keys"
fi

# ─── Check Aider ──────────────────────────────────────────────────────────────
if ! command -v aider &>/dev/null; then
  err "Aider not installed. Run: pip install aider-chat"
  exit 1
fi

# ─── Provider Selection ───────────────────────────────────────────────────────
select_provider() {
  # Priority: OpenAI → Gemini → OpenRouter → Ollama
  if [ -n "${OPENAI_API_KEY:-}" ]; then
    PROVIDER="openai"
    MODEL="${OPENAI_MODEL:-gpt-4o}"
    ok "Provider: OpenAI ($MODEL)"

  elif [ -n "${GEMINI_API_KEY:-}" ]; then
    PROVIDER="gemini"
    MODEL="${GEMINI_MODEL:-gemini/gemini-1.5-pro}"
    ok "Provider: Google Gemini ($MODEL)"
    export GEMINI_API_KEY

  elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
    PROVIDER="openrouter"
    MODEL="${OPENROUTER_MODEL:-openrouter/anthropic/claude-3.5-sonnet}"
    ok "Provider: OpenRouter ($MODEL)"
    export OPENAI_API_KEY="$OPENROUTER_API_KEY"
    export OPENAI_API_BASE="https://openrouter.ai/api/v1"

  elif [ -n "${OLLAMA_URL:-}" ] || command -v ollama &>/dev/null; then
    PROVIDER="ollama"
    OLLAMA_HOST="${OLLAMA_URL:-http://localhost:11434}"
    MODEL="${OLLAMA_MODEL:-ollama/llama3}"
    ok "Provider: Ollama (local) — $OLLAMA_HOST"
    export OLLAMA_API_BASE="$OLLAMA_HOST"

  else
    warn "No API provider configured."
    warn "Add at least one of these to .env:"
    warn "  OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or OLLAMA_URL"
    echo ""
    warn "Starting Aider in offline/no-model mode..."
    PROVIDER="none"
    MODEL=""
  fi
}

# ─── Project Detection ────────────────────────────────────────────────────────
detect_project() {
  if [ -f "package.json" ]; then
    PROJECT_TYPE="nodejs"
  elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
    PROJECT_TYPE="python"
  elif [ -f "go.mod" ]; then
    PROJECT_TYPE="go"
  elif [ -f "Cargo.toml" ]; then
    PROJECT_TYPE="rust"
  else
    PROJECT_TYPE="generic"
  fi
  info "Project type: $PROJECT_TYPE"
}

# ─── Build Aider command ──────────────────────────────────────────────────────
build_command() {
  CMD="aider"

  case "$PROVIDER" in
    openai)
      CMD="$CMD --model $MODEL --openai-api-key $OPENAI_API_KEY"
      ;;
    gemini)
      CMD="$CMD --model $MODEL --gemini-api-key $GEMINI_API_KEY"
      ;;
    openrouter)
      CMD="$CMD --model $MODEL --openai-api-key $OPENAI_API_KEY --openai-api-base $OPENAI_API_BASE"
      ;;
    ollama)
      CMD="$CMD --model $MODEL"
      ;;
    none)
      CMD="$CMD --no-auto-commits"
      ;;
  esac

  # Git integration
  CMD="$CMD --git"

  # Extra args passed to this script
  CMD="$CMD $*"
}

# ─── Show Header ──────────────────────────────────────────────────────────────
show_header() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━  DAVE DevBox — Aider AI  ━━━${RESET}"
  echo -e "  Provider: ${BOLD}${PROVIDER}${RESET}"
  [ -n "${MODEL:-}" ] && echo -e "  Model:    ${BOLD}${MODEL}${RESET}"
  echo -e "  Project:  ${BOLD}$(pwd)${RESET}"
  echo ""
  echo -e "  ${CYAN}Aider commands:${RESET}"
  echo -e "  /add <file>     — add file to context"
  echo -e "  /ask <question> — ask without editing"
  echo -e "  /undo           — undo last change"
  echo -e "  /git            — run git command"
  echo -e "  /exit           — quit"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────
select_provider
detect_project
build_command "$@"
show_header

eval "$CMD"
