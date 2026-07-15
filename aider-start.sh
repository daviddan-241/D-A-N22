#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Aider AI Coding (Gemini-first, free)
# =============================================================================
set -euo pipefail

DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[AI]${RESET}  $*"; }
info() { echo -e "${CYAN}[AI]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[AI]${RESET}  $*"; }

# ─── Load .env ────────────────────────────────────────────────────────────────
[ -f "$DAVE_DIR/.env" ] && export $(grep -v '^#' "$DAVE_DIR/.env" | grep -v '^$' | xargs) 2>/dev/null

# ─── Check Aider ──────────────────────────────────────────────────────────────
if ! command -v aider &>/dev/null; then
  warn "Aider not found. Installing..."
  pip install aider-chat google-generativeai --quiet
fi

# ─── Provider selection (Gemini first — free) ─────────────────────────────────
if [ -n "${GEMINI_API_KEY:-}" ]; then
  # Use gemini-2.0-flash — fastest free model
  MODEL="${AIDER_MODEL:-gemini/gemini-2.0-flash}"
  ok "Provider: Google Gemini (FREE)"
  ok "Model:    $MODEL"
  CMD="aider --model $MODEL"

elif [ -n "${OPENAI_API_KEY:-}" ]; then
  MODEL="${OPENAI_MODEL:-gpt-4o}"
  ok "Provider: OpenAI"
  CMD="aider --model $MODEL --openai-api-key $OPENAI_API_KEY"

elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
  MODEL="${OPENROUTER_MODEL:-openrouter/google/gemini-2.0-flash-exp:free}"
  export OPENAI_API_KEY="$OPENROUTER_API_KEY"
  export OPENAI_API_BASE="https://openrouter.ai/api/v1"
  ok "Provider: OpenRouter"
  CMD="aider --model $MODEL"

elif command -v ollama &>/dev/null && pgrep -x ollama &>/dev/null; then
  MODEL="${OLLAMA_MODEL:-ollama/llama3}"
  ok "Provider: Ollama (local)"
  CMD="aider --model $MODEL"

else
  warn "No API key found in .env!"
  warn "Get a free Gemini key: https://aistudio.google.com/apikey"
  warn "Add to .env:  GEMINI_API_KEY=your-key-here"
  exit 1
fi

# ─── Header ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}━━━  DAVE AI Coding Assistant  ━━━${RESET}"
echo -e "  Model: ${BOLD}$MODEL${RESET}"
echo -e "  Dir:   ${BOLD}$(pwd)${RESET}"
echo ""
echo -e "  ${CYAN}Quick commands inside aider:${RESET}"
echo -e "  /add <file>     — add file to chat"
echo -e "  /ask <question> — ask without editing"
echo -e "  /undo           — undo last change"
echo -e "  /exit           — quit"
echo ""

# ─── Run ──────────────────────────────────────────────────────────────────────
eval "$CMD --git $*"
