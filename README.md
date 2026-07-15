# DAVE DevBox

> **Self-Hosted AI Dev Environment — Tor-routed, Anonymous, Free**
> One command. Everything auto-starts. iPhone-ready.

```
Open Codespace → setup.sh runs automatically → Everything is live
```

**Only thing you need:** A free Google Gemini API key.
Get one in 60 seconds: https://aistudio.google.com/apikey

---

## What You Get (All Free, All Auto-Starting)

| Feature | Details |
|---|---|
| 🤖 **AI Coding** | Aider + Gemini (free tier — unlimited flash model) |
| 🧅 **Tor Routing** | All traffic anonymized via Tor by default |
| 🌐 **Web Dashboard** | Mobile-first UI — terminal, AI chat, file browser, status |
| 📱 **iPhone SSH** | Connect via a-Shell → see ASHELL.md |
| 🔒 **Anonymous** | `anon-curl`, `torsocks`, proxychains pre-configured |
| 🖥️ **Full Dev Stack** | Python, Node.js, Go, Rust |

---

## Setup (3 steps total)

### Step 1: Get Free Gemini API Key

Go to https://aistudio.google.com/apikey → Create API Key → Copy it

### Step 2: Add Key to .env in This Repo

Edit `.env` in this repo (already committed — just fill in your key):

```
GEMINI_API_KEY=YOUR_KEY_HERE
```

Commit and push that one change.

### Step 3: Open Codespace

1. Click **Code → Codespaces → Create codespace**
2. Wait ~5 minutes
3. `setup.sh` runs automatically
4. Everything starts: Dashboard · Tor · SSH · Aider

**That's it.**

---

## Commands (auto-available after setup)

```bash
dave-ai            # Start AI coding with Gemini (free)
dave-status        # Check all services
dave-tor-check     # Verify your anonymous Tor IP
dave-dash          # Start dashboard if it stopped
anon-curl URL      # Fetch any URL through Tor
anon-wget URL      # Download through Tor
```

---

## Tor & Anonymous Web Access

All `torsocks` and `proxychains` routes go through Tor automatically.

```bash
# Verify you're anonymous
dave-tor-check
# → Shows Tor exit node IP (not your real IP)

# Any command through Tor
torsocks curl https://example.com
torsocks wget https://example.com/file.zip

# Anonymous curl alias
anon-curl https://api.something.com

# Check Tor vs real IP
curl https://api.ipify.org          # your real IP
torsocks curl https://api.ipify.org # Tor exit IP (different)

# New Tor circuit (new anonymous IP)
pkill -HUP tor
```

---

## AI Coding with Aider + Gemini (Free)

```bash
cd my-project
dave-ai

# Inside aider:
/add src/main.py        # add file to context
/ask how does X work?  # ask without editing
/undo                   # undo last change
/exit                   # quit
```

Free Gemini model: `gemini-2.0-flash` — fast, generous limits, no credit card.

---

## iPhone Access

See **[ASHELL.md](ASHELL.md)** for full step-by-step a-Shell SSH setup.

Quick version:
```bash
# In Codespace terminal:
echo $CODESPACE_NAME   # get your name

# On iPhone a-Shell:
ssh -p 443 YOUR_GITHUB_USERNAME@YOUR_CODESPACE_NAME.ssh.github.com
```

---

## Dashboard

Auto-starts at http://localhost:3000 (forwarded by Codespaces to a public URL).

Login: `admin` / `dave2024` (change in `.env`)

Features:
- **System** — CPU, memory, AI provider status
- **Terminal** — browser terminal (works from iPhone browser too!)
- **AI Chat** — chat with Gemini from any device
- **Files** — browse and edit workspace files

---

## Docker (alternative to Codespaces)

```bash
cp .env.example .env
# Add your GEMINI_API_KEY
docker compose up -d
```

---

## FAQ

**Is Gemini actually free?**
Yes. The Flash model has a generous free tier (15 RPM, 1M tokens/day). No credit card needed.

**Does everything work without any other keys?**
Yes. Gemini key → Aider works. Dashboard works. Tor works. All free.

**Can I add other AI providers later?**
Yes — add `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or run `ollama serve` for local AI.

**Is Tor actually anonymous?**
Tor hides your IP from websites you visit. It does not make you fully anonymous if you log in to accounts or share identifying info.
