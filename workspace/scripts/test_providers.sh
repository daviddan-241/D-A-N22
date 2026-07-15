#!/usr/bin/env bash
# Test all configured AI providers
# Run: bash workspace/scripts/test_providers.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"

[ -f "$ENV_FILE" ] && export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

echo "=== DAVE DevBox — Provider Test ==="
echo ""

# OpenAI
if [ -n "${OPENAI_API_KEY:-}" ]; then
  echo -n "OpenAI... "
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    "https://api.openai.com/v1/models" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && echo "✓ connected" || echo "✗ failed ($STATUS)"
else
  echo "OpenAI... skipped (no OPENAI_API_KEY)"
fi

# Gemini
if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo -n "Gemini... "
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && echo "✓ connected" || echo "✗ failed ($STATUS)"
else
  echo "Gemini... skipped (no GEMINI_API_KEY)"
fi

# OpenRouter
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  echo -n "OpenRouter... "
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    "https://openrouter.ai/api/v1/models" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && echo "✓ connected" || echo "✗ failed ($STATUS)"
else
  echo "OpenRouter... skipped (no OPENROUTER_API_KEY)"
fi

# Ollama
OLLAMA_HOST="${OLLAMA_URL:-http://localhost:11434}"
echo -n "Ollama ($OLLAMA_HOST)... "
if curl -sf "$OLLAMA_HOST/api/tags" &>/dev/null; then
  MODELS=$(curl -sf "$OLLAMA_HOST/api/tags" | python3 -c "import sys,json; d=json.load(sys.stdin); print(', '.join(m['name'] for m in d.get('models',[])) or 'no models')")
  echo "✓ running — models: $MODELS"
else
  echo "✗ not running (start with: ollama serve)"
fi

echo ""
echo "Done."
