# DAVE DevBox

> **Self-Hosted AI Development Environment**
> Free-tier friendly · GitHub Codespaces ready · iPhone a-Shell compatible

```
Clone → Open Codespace → ./setup.sh → Done
```

---

## What Is DAVE DevBox?

DAVE (Development AI Virtual Environment) DevBox is a portable, reproducible AI-powered development environment you can run anywhere — GitHub Codespaces, a VPS, your laptop, or inside Docker. It gives you:

| Feature | Details |
|---|---|
| 🤖 **AI Coding** | Aider + OpenAI / Gemini / OpenRouter / Ollama |
| 🖥️ **Full Dev Stack** | Python, Node.js, Go, Rust, Java |
| 🌐 **Web Dashboard** | Mobile-first React UI with terminal, AI chat, file browser |
| 🤖 **Browser Automation** | Playwright + Selenium (Chromium) |
| 📱 **iPhone Access** | SSH via a-Shell app |
| 🔒 **Secure by Default** | Key-only SSH, no hardcoded secrets |
| 🐳 **Docker Ready** | `docker compose up` and go |

---

## Quick Start

### GitHub Codespaces (recommended — free tier)

1. Fork this repository
2. Click **Code → Codespaces → Create codespace**
3. Wait for the environment to initialize
4. Run:
   ```bash
   ./setup.sh
   ```
5. Add your API keys to `.env`
6. Run `dave-aider` to start coding with AI

### Local / VPS

```bash
git clone https://github.com/YOUR_USERNAME/dave-devbox
cd dave-devbox
chmod +x setup.sh
./setup.sh
```

### Docker

```bash
cp .env.example .env
# Edit .env with your API keys
docker compose up
```

---

## Configuration

Copy `.env.example` to `.env` and fill in at least one AI provider:

```bash
cp .env.example .env
nano .env
```

```env
# At minimum, add one of:
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
OLLAMA_URL=http://localhost:11434   # local/offline
```

DAVE auto-detects which providers are available.

---

## Commands

After `source ~/.bashrc`:

| Command | Description |
|---|---|
| `dave-aider` | Start AI coding assistant |
| `dave-ssh` | Show SSH connection info |
| `dave-dash` | Start web dashboard (port 3000) |
| `dave-status` | Show system status |
| `./aider-start.sh` | Aider with auto-provider selection |
| `./ssh-setup.sh` | Configure SSH / show connect info |

---

## Web Dashboard

The dashboard runs on port **3000** and provides:

- **Terminal** — browser-based terminal (xterm.js + node-pty)
- **AI Chat** — chat with your configured AI provider
- **Project Browser** — file tree for your workspace
- **Environment** — manage .env variables
- **System Status** — CPU, memory, disk, running services

Start it:
```bash
dave-dash
# or
cd dashboard && node server.js
```

---

## AI Providers

DAVE DevBox supports multiple AI providers with automatic fallback:

### Cloud APIs

| Provider | Key Variable | Notes |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | GPT-4o default |
| Google Gemini | `GEMINI_API_KEY` | Gemini 1.5 Pro |
| OpenRouter | `OPENROUTER_API_KEY` | 100+ models |
| Custom | `OPENAI_API_BASE` | Any OpenAI-compatible API |

### Local AI (Offline)

```bash
# Start Ollama
ollama serve

# Pull a model
ollama pull llama3
ollama pull codestral
ollama pull deepseek-coder

# Then aider picks it up automatically
dave-aider
```

---

## Aider AI Coding

[Aider](https://aider.chat) is an AI pair programmer that works in your terminal:

```bash
dave-aider                    # auto-selects provider
dave-aider --model gpt-4o    # force a specific model

# Inside aider:
/add src/main.py              # add file to context
/ask How does this work?      # ask without editing
/undo                         # undo last change
/git diff                     # run git command
```

---

## Browser Automation

DAVE includes Playwright and Selenium:

```python
# examples/browser/playwright_demo.py
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    browser.close()
```

Run examples:
```bash
python3 workspace/scripts/browser_demo.py
node workspace/scripts/browser_demo.js
```

---

## iPhone Access (a-Shell)

1. Install [a-Shell](https://apps.apple.com/app/a-shell/id1473805438) from the App Store
2. Generate a key in a-Shell:
   ```
   ssh-keygen -t ed25519
   cat ~/.ssh/id_ed25519.pub
   ```
3. Add the public key to your server's `~/.ssh/authorized_keys`
4. Run `./ssh-setup.sh` to get connection details
5. Connect:
   ```
   ssh username@your-server
   ```
6. Use tmux to keep sessions alive:
   ```
   tmux new -s dave
   # Ctrl+B D to detach, tmux attach -t dave to reconnect
   ```

---

## Workspace Structure

```
workspace/
├── projects/          # Your code projects
├── models/            # Local AI model configs
├── logs/              # Setup and runtime logs
├── config/            # Shared configuration files
├── scripts/           # Reusable utility scripts
└── templates/         # Project starter templates
```

---

## Docker

```bash
# Start everything
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f devbox

# Shell into container
docker exec -it dave-devbox bash

# Pull an Ollama model
docker exec -it dave-ollama ollama pull llama3
```

---

## Security

- SSH key-only authentication (no passwords)
- No hardcoded API keys — `.env` file only
- `.env` is gitignored by default
- Dashboard supports username/password auth
- All secrets via environment variables

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed fixes.

---

## License

MIT — do whatever you want with it.
