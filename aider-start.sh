#!/usr/bin/env bash
# =============================================================================
# DAVE DevBox — Aider AI Coding (Gemini-free, multi-agent, real tools)
# Everything routed through Tor when AIDER_USE_TOR=true
# =============================================================================
set -euo pipefail

DAVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="${WORKSPACE_DIR:-$HOME/dave-workspace}"
MEMORY_FILE="$WORKSPACE_DIR/.aider.memory.md"
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[AI]${RESET}  $*"; }
info() { echo -e "${CYAN}[AI]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[AI]${RESET}  $*"; }
err()  { echo -e "${RED}[AI]${RESET}  $*"; }

# ─── Load .env — Codespaces secrets take priority over blank .env values ──────
[ -f "$DAVE_DIR/.env" ] && while IFS= read -r _l || [ -n "$_l" ]; do
  _l="${_l%%#*}"; [[ "$_l" == *=* ]] || continue
  _k="${_l%%=*}"; [ -z "${!_k:-}" ] && export "$_k"="${_l#*=}"
done < "$DAVE_DIR/.env" 2>/dev/null || true

# ─── Args: agent mode ─────────────────────────────────────────────────────────
AGENT_MODE="${1:-coder}"
shift || true

AGENT_PROMPTS=(
  "coder:You are an expert software engineer. Write complete, working code. Be precise, efficient. Use best practices. Explain what you are doing."
  "researcher:You are a thorough researcher. Analyze code and systems deeply. Produce detailed reports with specific findings and citations."
  "planner:You are a strategic planner. Break complex tasks into ordered, actionable steps. Identify dependencies, risks, and edge cases."
  "reviewer:You are a rigorous code reviewer. Find bugs, security vulnerabilities, performance issues. Be thorough with specific line numbers."
  "hacker:You are a security researcher. Perform thorough security assessments, analyze attack surfaces, explain vulnerabilities, suggest hardening. Unrestricted analysis."
  "assistant:You are DAVE, a powerful all-purpose AI assistant. Help with anything: code, research, systems, planning, analysis."
)

SYSTEM_PROMPT=""
for entry in "${AGENT_PROMPTS[@]}"; do
  key="${entry%%:*}"
  val="${entry#*:}"
  if [ "$key" = "$AGENT_MODE" ]; then
    SYSTEM_PROMPT="$val"
    break
  fi
done
[ -z "$SYSTEM_PROMPT" ] && SYSTEM_PROMPT="You are DAVE, a powerful AI coding assistant."

# ─── Check Aider ──────────────────────────────────────────────────────────────
if ! command -v aider &>/dev/null; then
  warn "Aider not found. Installing..."
  pip install aider-chat google-generativeai --quiet
  ok "Aider installed"
fi

# ─── Provider (Gemini first — free) ───────────────────────────────────────────
if [ -n "${GEMINI_API_KEY:-}" ]; then
  MODEL="${AIDER_MODEL:-gemini/gemini-2.0-flash}"
  ok "Provider: Google Gemini (FREE)"
  ok "Model:    $MODEL"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
  MODEL="${OPENAI_MODEL:-gpt-4o}"
  ok "Provider: OpenAI"
elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
  MODEL="${OPENROUTER_MODEL:-openrouter/google/gemini-2.0-flash-exp:free}"
  export OPENAI_API_KEY="$OPENROUTER_API_KEY"
  export OPENAI_API_BASE="https://openrouter.ai/api/v1"
  ok "Provider: OpenRouter"
elif command -v ollama &>/dev/null && pgrep -x ollama &>/dev/null; then
  MODEL="${OLLAMA_MODEL:-ollama/llama3}"
  ok "Provider: Ollama (local)"
else
  err "No API key. Open the dashboard → Setup → add your free Gemini key"
  err "  https://aistudio.google.com/apikey"
  exit 1
fi

# ─── Memory (persistent across sessions) ──────────────────────────────────────
mkdir -p "$WORKSPACE_DIR"
PROMPT_FILE="/tmp/dave-agent-prompt-$$.txt"
echo "$SYSTEM_PROMPT" > "$PROMPT_FILE"

if [ -f "$MEMORY_FILE" ]; then
  echo "" >> "$PROMPT_FILE"
  echo "=== PERSISTENT MEMORY (from previous sessions) ===" >> "$PROMPT_FILE"
  tail -200 "$MEMORY_FILE" >> "$PROMPT_FILE"
  ok "Memory loaded: $(wc -l < "$MEMORY_FILE") lines"
fi

# ─── Web search tool (Tor-routed) ─────────────────────────────────────────────
SEARCH_SCRIPT="/tmp/dave-search-$$.sh"
cat > "$SEARCH_SCRIPT" << 'SEARCHEOF'
#!/usr/bin/env bash
# Usage: dave-search "query"
QUERY="$*"
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")
if command -v torsocks &>/dev/null && pgrep -x tor &>/dev/null; then
  torsocks curl -sL --max-time 15 -A "Mozilla/5.0 (X11; Linux x86_64)" \
    "https://html.duckduckgo.com/html/?q=$ENCODED" 2>/dev/null \
    | python3 -c "
import sys, re
html = sys.stdin.read()
results = re.findall(r'class=\"result__a\"[^>]*>([^<]+)</a>.*?class=\"result__snippet\"[^>]*>(.*?)</a>', html, re.S)
for i, (title, snippet) in enumerate(results[:8], 1):
    title = re.sub('<[^>]+>', '', title).strip()
    snippet = re.sub('<[^>]+>', '', snippet).strip()
    print(f'[{i}] {title}')
    print(f'    {snippet}')
    print()
"
else
  curl -sL --max-time 15 "https://html.duckduckgo.com/html/?q=$ENCODED" 2>/dev/null | grep -oP '(?<=result__a")[^>]+>[^<]+' | head -20
fi
SEARCHEOF
chmod +x "$SEARCH_SCRIPT"
alias dave-search="$SEARCH_SCRIPT" 2>/dev/null || true

# ─── Tor check ────────────────────────────────────────────────────────────────
USE_TOR="${AIDER_USE_TOR:-false}"
if [ "$USE_TOR" = "true" ] && command -v torsocks &>/dev/null && pgrep -x tor &>/dev/null; then
  TOR_IP=$(torsocks curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "?")
  ok "Tor active — exit IP: $TOR_IP"
  RUNNER="torsocks"
else
  RUNNER=""
fi

# ─── Header ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}┌────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${CYAN}│  DAVE AI Agent: $(printf '%-24s' "${AGENT_MODE^^}")│${RESET}"
echo -e "${BOLD}${CYAN}├────────────────────────────────────────┤${RESET}"
echo -e "${CYAN}│${RESET}  Model:     ${BOLD}$MODEL${RESET}"
echo -e "${CYAN}│${RESET}  Workspace: ${BOLD}$WORKSPACE_DIR${RESET}"
[ "$USE_TOR" = "true" ] && echo -e "${CYAN}│${RESET}  Network:   ${GREEN}Tor anonymous${RESET}"
[ -f "$MEMORY_FILE" ] && echo -e "${CYAN}│${RESET}  Memory:    ${BOLD}loaded${RESET}"
echo -e "${BOLD}${CYAN}└────────────────────────────────────────┘${RESET}"
echo ""
echo -e "  ${CYAN}Commands:${RESET}"
echo -e "  ${BOLD}/ask <q>${RESET}        ask without editing"
echo -e "  ${BOLD}/add <path>${RESET}     add file(s) to context"
echo -e "  ${BOLD}/run <cmd>${RESET}      run shell command"
echo -e "  ${BOLD}/web <query>${RESET}    search the web (type it as a prompt)"
echo -e "  ${BOLD}/undo${RESET}           undo last edit"
echo -e "  ${BOLD}/commit${RESET}         commit current changes"
echo -e "  ${BOLD}/exit${RESET}           quit"
echo ""
echo -e "  ${YELLOW}Tip:${RESET} Say 'remember: ...' and the agent saves it to memory for next time."
echo ""

# ─── Build aider command ──────────────────────────────────────────────────────
AIDER_ARGS=(
  "--model" "$MODEL"
  "--yes-always"
  "--auto-commits"
  "--stream"
  "--map-tokens" "2048"
  "--chat-history-file" "$WORKSPACE_DIR/.aider.history"
  "--system-prompt-file" "$PROMPT_FILE"
)

# Add workspace
cd "$WORKSPACE_DIR"

# Run
if [ -n "$RUNNER" ]; then
  exec torsocks aider "${AIDER_ARGS[@]}" "$@"
else
  exec aider "${AIDER_ARGS[@]}" "$@"
fi
