# DAVE DevBox — Installation Guide

## System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| RAM | 2 GB | 4 GB+ |
| Storage | 10 GB | 20 GB+ |
| OS | Ubuntu 20.04+ / Debian 11+ / macOS 12+ | Ubuntu 22.04 LTS |
| Internet | Required for setup | Required for cloud AI |

---

## Method 1: GitHub Codespaces (Easiest — Free)

This is the recommended approach. No local setup needed.

### Steps

1. **Fork the repository** on GitHub

2. **Open a Codespace**
   - Click `Code` → `Codespaces` → `Create codespace on main`
   - GitHub provides 120 hours/month free on the base tier

3. **Wait for initialization**
   - The `.devcontainer/devcontainer.json` runs `setup.sh` automatically
   - First run takes 5–10 minutes

4. **Configure API keys**
   ```bash
   cp .env.example .env
   nano .env
   # Add at least one AI provider key
   ```

5. **Start coding**
   ```bash
   dave-aider
   ```

### Codespace Resource Tiers

| Tier | vCPU | RAM | Price |
|---|---|---|---|
| 2-core (free) | 2 | 8 GB | Free (120h/mo) |
| 4-core | 4 | 16 GB | ~$0.18/hr |
| 8-core | 8 | 32 GB | ~$0.36/hr |

---

## Method 2: VPS / Cloud Server

### Providers with Free Tiers

- **Oracle Cloud** — Always-Free 4 vCPU / 24 GB ARM instance
- **Google Cloud** — e2-micro (1 vCPU, 1 GB) always free
- **AWS** — t2.micro 750hrs/month (12 months)
- **Hetzner** — CX11 from €3.79/month (not free, but cheap)
- **Railway** — hobby plan

### Steps

```bash
# SSH into your server
ssh user@your-server

# Clone the repo
git clone https://github.com/YOUR_USERNAME/dave-devbox
cd dave-devbox

# Run setup
chmod +x setup.sh
./setup.sh

# Reload shell
source ~/.bashrc

# Configure keys
cp .env.example .env
nano .env
```

---

## Method 3: Local Machine

### macOS

```bash
# Install Homebrew first if you haven't
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Clone and run
git clone https://github.com/YOUR_USERNAME/dave-devbox
cd dave-devbox
chmod +x setup.sh
./setup.sh
```

### Ubuntu / Debian

```bash
# Update system first
sudo apt-get update && sudo apt-get upgrade -y

# Clone and run
git clone https://github.com/YOUR_USERNAME/dave-devbox
cd dave-devbox
chmod +x setup.sh
./setup.sh
```

---

## Method 4: Docker

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

```bash
# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com | bash

# Clone repo
git clone https://github.com/YOUR_USERNAME/dave-devbox
cd dave-devbox

# Configure environment
cp .env.example .env
nano .env

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Open dashboard
open http://localhost:3000
```

### Docker with GPU (NVIDIA, for Ollama)

Uncomment the GPU section in `docker-compose.yml`:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

---

## Manual Component Installation

If you prefer to install components individually:

### Aider

```bash
pip install aider-chat
```

### Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
```

### Playwright

```bash
pip install playwright
python3 -m playwright install chromium --with-deps
```

### Dashboard

```bash
cd dashboard
npm install
cd frontend && npm install && npm run build && cd ..
node server.js
```

---

## Post-Installation Checklist

- [ ] `.env` created with at least one AI provider key
- [ ] `source ~/.bashrc` run (or new terminal opened)
- [ ] `dave-aider` launches successfully
- [ ] Dashboard accessible at `http://localhost:3000`
- [ ] SSH configured (optional — run `./ssh-setup.sh`)
- [ ] Ollama model pulled (optional — `ollama pull llama3`)

---

## Updating

```bash
cd dave-devbox
git pull
./setup.sh   # re-runs safely, skips already-installed components
```

---

## Uninstalling

```bash
# Remove Docker containers and volumes
docker compose down -v

# Remove installed Python packages
pip uninstall aider-chat playwright selenium -y

# Remove workspace (WARNING: deletes your projects)
rm -rf ~/workspace

# Remove shell aliases
# Edit ~/.bashrc and remove the DAVE DevBox block
```
