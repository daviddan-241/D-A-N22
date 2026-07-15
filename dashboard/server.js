/**
 * DAVE DevBox — Web Dashboard Server
 * Node.js + Express backend
 * Serves React frontend + provides REST/WebSocket APIs
 */
"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync, spawn } = require("child_process");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

// ─── Environment ──────────────────────────────────────────────────────────────
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PORT = parseInt(process.env.DASHBOARD_PORT || "3000", 10);
const SECRET = process.env.DASHBOARD_SECRET || crypto.randomBytes(32).toString("hex");
const DASH_USER = process.env.DASHBOARD_USERNAME || "admin";
const DASH_PASS = process.env.DASHBOARD_PASSWORD || "changeme";

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store (in-memory; swap for Redis in production)
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function requireAuth(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.session = sessions.get(token);
  next();
}

// ─── CORS (dev) ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === DASH_USER && password === DASH_PASS) {
    const token = generateToken();
    sessions.set(token, { username, loginAt: Date.now() });
    res.json({ token, username });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  sessions.delete(token);
  res.json({ ok: true });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", ts: new Date().toISOString() });
});

// ─── System Status ────────────────────────────────────────────────────────────
app.get("/api/system", requireAuth, (_req, res) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let diskInfo = {};
  try {
    const df = execSync("df -h / 2>/dev/null | tail -1", { encoding: "utf8" }).trim().split(/\s+/);
    diskInfo = { total: df[1], used: df[2], free: df[3], percent: df[4] };
  } catch (_) {
    diskInfo = { total: "N/A", used: "N/A", free: "N/A", percent: "N/A" };
  }

  let ollamaModels = [];
  try {
    const raw = execSync("ollama list 2>/dev/null", { encoding: "utf8" });
    ollamaModels = raw.split("\n").slice(1).filter(Boolean).map((l) => l.split(/\s+/)[0]);
  } catch (_) {}

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    cpu: {
      model: cpus[0]?.model || "Unknown",
      cores: cpus.length,
      loadavg: os.loadavg(),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentUsed: Math.round((usedMem / totalMem) * 100),
    },
    disk: diskInfo,
    ollama: {
      running: ollamaModels.length > 0,
      models: ollamaModels,
    },
    node: process.version,
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasOllama: !!process.env.OLLAMA_URL,
    },
  });
});

// ─── File Browser ─────────────────────────────────────────────────────────────
const WORKSPACE_DIR = path.join(os.homedir(), "workspace");

function safePath(relPath) {
  const resolved = path.resolve(WORKSPACE_DIR, relPath || "");
  if (!resolved.startsWith(WORKSPACE_DIR)) throw new Error("Path traversal denied");
  return resolved;
}

app.get("/api/files", requireAuth, (req, res) => {
  try {
    const dir = safePath(req.query.path || "");
    const entries = fs.readdirSync(dir, { withFileTypes: true }).map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
      path: path.relative(WORKSPACE_DIR, path.join(dir, e.name)),
    }));
    res.json({ path: path.relative(WORKSPACE_DIR, dir), entries });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/files/read", requireAuth, (req, res) => {
  try {
    const filePath = safePath(req.query.path || "");
    const stat = fs.statSync(filePath);
    if (stat.size > 1024 * 1024) return res.status(400).json({ error: "File too large (>1MB)" });
    const content = fs.readFileSync(filePath, "utf8");
    res.json({ content, path: req.query.path });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/files/write", requireAuth, (req, res) => {
  try {
    const filePath = safePath(req.body.path || "");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, req.body.content || "", "utf8");
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── AI Chat Proxy ────────────────────────────────────────────────────────────
app.post("/api/chat", requireAuth, async (req, res) => {
  const { messages, provider } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "No messages" });

  // Simple provider detection
  if (process.env.OPENAI_API_KEY && (provider === "openai" || !provider)) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          messages,
          max_tokens: 2048,
        }),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message });
      return res.json({ reply: data.choices[0].message.content, provider: "openai" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (process.env.OLLAMA_URL || provider === "ollama") {
    try {
      const ollamaBase = process.env.OLLAMA_URL || "http://localhost:11434";
      const response = await fetch(`${ollamaBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3",
          messages,
          stream: false,
        }),
      });
      const data = await response.json();
      return res.json({ reply: data.message?.content, provider: "ollama" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(503).json({ error: "No AI provider configured. Add keys to .env" });
});

// ─── WebSocket Terminal ───────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/terminal" });

wss.on("connection", (ws, req) => {
  // Auth check via query param token
  const url = new URL(req.url, `http://localhost`);
  const token = url.searchParams.get("token");
  if (!token || !sessions.has(token)) {
    ws.close(1008, "Unauthorized");
    return;
  }

  let pty;
  try {
    const nodePty = require("node-pty");
    pty = nodePty.spawn(process.env.SHELL || "/bin/bash", [], {
      name: "xterm-256color",
      cols: 120,
      rows: 40,
      cwd: WORKSPACE_DIR,
      env: process.env,
    });

    pty.onData((data) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "output", data }));
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === "input") pty.write(msg.data);
        if (msg.type === "resize") pty.resize(msg.cols, msg.rows);
      } catch (_) {
        pty.write(raw.toString());
      }
    });

    ws.on("close", () => pty.kill());
  } catch (_) {
    // node-pty not available — send friendly message
    ws.send(JSON.stringify({
      type: "output",
      data: "Terminal requires node-pty. Run: npm install node-pty\r\n",
    }));
    ws.on("close", () => {});
  }
});

// ─── Serve React Frontend ─────────────────────────────────────────────────────
const frontendDist = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
} else {
  // Fallback minimal HTML
  app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DAVE DevBox</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #c9d1d9; 
           display: flex; align-items: center; justify-content: center; 
           min-height: 100vh; margin: 0; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; 
            padding: 2rem; max-width: 480px; width: 100%; }
    h1 { color: #58a6ff; margin-top: 0; }
    .status { color: #3fb950; }
    .cmd { background: #21262d; padding: 0.5rem 1rem; border-radius: 4px; 
           margin: 0.25rem 0; display: block; font-size: 0.85rem; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>DAVE DevBox</h1>
    <p class="status">Server running on port ${PORT}</p>
    <p>Build the frontend to enable the full dashboard:</p>
    <code class="cmd">cd dashboard/frontend && npm install && npm run build</code>
    <p>API endpoints available:</p>
    <code class="cmd">GET  /api/health</code>
    <code class="cmd">POST /api/auth/login</code>
    <code class="cmd">GET  /api/system</code>
    <code class="cmd">GET  /api/files</code>
    <code class="cmd">POST /api/chat</code>
  </div>
</body>
</html>`);
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`DAVE DevBox Dashboard running on http://0.0.0.0:${PORT}`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server };
