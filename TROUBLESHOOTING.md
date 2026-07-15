# DAVE DevBox — Troubleshooting Guide

## Common Issues

---

### `dave-aider: command not found`

**Cause:** Shell not reloaded after setup.

**Fix:**
```bash
source ~/.bashrc
# or open a new terminal
```

---

### Aider fails with "No API key found"

**Cause:** `.env` not configured or not loaded.

**Fix:**
```bash
# 1. Check .env exists
ls -la .env

# 2. If not, create it
cp .env.example .env
nano .env

# 3. Add at least one key:
#    OPENAI_API_KEY=sk-...
#    GEMINI_API_KEY=...
#    OPENROUTER_API_KEY=...

# 4. Re-run aider
./aider-start.sh
```

---

### Ollama not connecting

**Cause:** Ollama service not running.

**Fix:**
```bash
# Start Ollama
ollama serve &

# Check it's running
curl http://localhost:11434

# Pull a model if you haven't
ollama pull llama3
```

---

### Dashboard won't start — port 3000 in use

**Fix:**
```bash
# Find what's using port 3000
lsof -i :3000
# or
ss -tlnp | grep 3000

# Kill the process
kill $(lsof -t -i:3000)

# Or change port in .env
echo "DASHBOARD_PORT=3001" >> .env
```

---

### Playwright browser install fails

**Cause:** Missing system dependencies or non-root user.

**Fix:**
```bash
# Install with system dependencies (may need sudo)
sudo python3 -m playwright install chromium --with-deps

# If that fails, install deps manually (Debian/Ubuntu)
sudo apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

python3 -m playwright install chromium
```

---

### SSH connection refused

**Cause:** sshd not running or firewall blocking port 22.

**Fix:**
```bash
# Check sshd status
sudo systemctl status ssh
sudo service ssh status

# Start sshd
sudo systemctl start ssh
# or
sudo service ssh start

# Check firewall (Ubuntu)
sudo ufw status
sudo ufw allow 22/tcp

# Verify port is listening
ss -tlnp | grep :22
```

---

### `setup.sh` fails partway through

**Cause:** Network issue, permission error, or missing dependency.

**Fix:**
```bash
# Check the log
cat ~/workspace/logs/setup.log | tail -50

# Re-run (safe — skips already-installed components)
./setup.sh

# Or run just the failing section:
# For Python: python3 -m pip install aider-chat
# For Node:   curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# For Ollama: curl -fsSL https://ollama.com/install.sh | sh
```

---

### Node.js not found after setup

**Cause:** nvm installed but not loaded in current shell.

**Fix:**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node --version

# Make permanent
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc
```

---

### Docker compose up fails

**Cause:** Docker not installed, or old version.

**Fix:**
```bash
# Check Docker version (need 24+)
docker --version
docker compose version

# Install/update Docker
curl -fsSL https://get.docker.com | bash

# Add user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Try again
docker compose up -d
```

---

### iPhone a-Shell can't connect

**Causes and fixes:**

1. **Wrong IP** — Run `./ssh-setup.sh` to get the current IP
2. **Port blocked** — Check firewall: `sudo ufw allow 22`
3. **Key not added** — Paste your a-Shell public key into `~/.ssh/authorized_keys`
4. **Codespaces** — You need to use Codespaces port forwarding, not a direct IP

**For Codespaces specifically:**
```bash
# In Codespaces, SSH works via the GitHub CLI:
gh cs ssh -c YOUR_CODESPACE_NAME
```

---

### Aider changes something wrong / breaks code

```bash
# Inside aider
/undo         # undo last change

# From terminal
git log --oneline -5   # see recent commits
git revert HEAD        # revert last commit
```

---

### Out of memory / slow performance

**Fix:**
```bash
# Check memory usage
free -h
htop

# Use a smaller Ollama model
ollama pull phi3:mini      # 2 GB (fast)
ollama pull llama3:8b      # 5 GB (balanced)
# vs
ollama pull llama3:70b     # 40 GB (needs big machine)

# Set in .env
echo "OLLAMA_MODEL=ollama/phi3:mini" >> .env
```

---

## Getting Help

1. Check `~/workspace/logs/setup.log` for setup errors
2. Re-run `./setup.sh` — it's idempotent
3. Open an issue at the GitHub repository
4. For Aider issues: https://aider.chat/docs/troubleshooting.html
5. For Ollama issues: https://ollama.com/docs
