# =============================================================================
# DAVE DevBox — Dockerfile
# =============================================================================
FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_VERSION=20

LABEL maintainer="DAVE DevBox"
LABEL description="Self-hosted AI development environment"

# ─── System packages ──────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl wget nano vim tmux htop unzip jq \
    build-essential ca-certificates gnupg lsb-release \
    python3 python3-pip python3-venv \
    openssh-server openssh-client \
    default-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# ─── Node.js ──────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# ─── Go ───────────────────────────────────────────────────────────────────────
RUN curl -fsSL https://go.dev/dl/go1.22.4.linux-amd64.tar.gz | tar -C /usr/local -xzf -
ENV PATH=$PATH:/usr/local/go/bin

# ─── Rust ─────────────────────────────────────────────────────────────────────
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --quiet
ENV PATH=$PATH:/root/.cargo/bin

# ─── Python AI & Automation ───────────────────────────────────────────────────
RUN pip3 install --no-cache-dir \
    aider-chat \
    playwright \
    selenium \
    requests \
    python-dotenv \
    fastapi \
    uvicorn[standard] \
    httpx

# ─── Playwright browsers ──────────────────────────────────────────────────────
RUN python3 -m playwright install chromium --with-deps

# ─── SSH configuration ────────────────────────────────────────────────────────
RUN mkdir -p /var/run/sshd \
    && echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config \
    && echo 'PermitRootLogin no' >> /etc/ssh/sshd_config \
    && echo 'PubkeyAuthentication yes' >> /etc/ssh/sshd_config \
    && echo 'AllowTcpForwarding yes' >> /etc/ssh/sshd_config

# ─── Dashboard ────────────────────────────────────────────────────────────────
WORKDIR /dave
COPY dashboard/package.json dashboard/package-lock.json* ./dashboard/
RUN cd dashboard && npm install --production

COPY . .
RUN chmod +x setup.sh aider-start.sh ssh-setup.sh

# Build frontend
RUN cd dashboard/frontend && npm install && npm run build || true

# ─── Ports ────────────────────────────────────────────────────────────────────
EXPOSE 3000 22

# ─── Entrypoint ───────────────────────────────────────────────────────────────
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "/dave/dashboard/server.js"]
