/**
 * DAVE DevBox Dashboard Server
 * Node.js + Express — serves React UI + REST/WebSocket APIs
 * Gemini-first AI provider
 */
"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync, exec } = require("child_process");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

// ─── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#") && line.includes("=")) {
      const [k, ...v] = line.split("=");
      process.env[k.trim()] = process.env[k.trim()] || v.join("=").trim();
    }
  });
}

const PORT = parseInt(process.env.DASHBOARD_PORT || "3000", 10);
const DASH_USER = process.env.DASHBOARD_USERNAME || "admin";
const DASH_PASS = process.env.DASHBOARD_PASSWORD || "dave2024";

const app = express();
const server = http.createServer(app);
const sessions = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

function requireAuth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" });
  req.session = sessions.get(token);
  next();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === DASH_USER && password === DASH_PASS) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { username, loginAt: Date.now() });
    res.json({ token, username });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  sessions.delete((req.headers["authorization"] || "").replace("Bearer ", ""));
  res.json({ ok: true });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", version: "2.0.0" }));

// ─── System Status ────────────────────────────────────────────────────────────
app.get("/api/system", requireAuth, async (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  // Disk
  let disk = { total: "N/A", used: "N/A", free: "N/A", percent: "N/A" };
  try {
    const df = execSync("df -h / 2>/dev/null | tail -1", { encoding: "utf8" }).trim().split(/\s+/);
    disk = { total: df[1], used: df[2], free: df[3], percent: df[4] };
  } catch (_) {}

  // Tor status
  let torRunning = false;
  let torIp = null;
  try {
    execSync("pgrep -x tor", { stdio: "ignore" });
    torRunning = true;
    torIp = execSync("torsocks curl -sf --max-time 5 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim();
  } catch (_) {}

  // Real IP
  let realIp = null;
  try {
    realIp = execSync("curl -sf --max-time 5 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim();
  } catch (_) {}

  // Ollama models
  let ollamaModels = [];
  try {
    const raw = execSync("ollama list 2>/dev/null", { encoding: "utf8" });
    ollamaModels = raw.split("\n").slice(1).filter(Boolean).map((l) => l.split(/\s+/)[0]);
  } catch (_) {}

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
    cpu: { cores: os.cpus().length, loadavg: os.loadavg() },
    memory: {
      total: totalMem,
      used: totalMem - freeMem,
      percentUsed: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    disk,
    tor: { running: torRunning, ip: torIp, realIp },
    ollama: { running: ollamaModels.length > 0, models: ollamaModels },
    env: {
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    },
  });
});

// ─── AI Chat (Gemini-first) ───────────────────────────────────────────────────
app.post("/api/chat", requireAuth, async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "No messages" });

  const userMessages = messages.filter((m) => m.role !== "system");

  // ── Gemini ──
  if (process.env.GEMINI_API_KEY) {
    try {
      const GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" +
        `?key=${process.env.GEMINI_API_KEY}`;

      const contents = userMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } }),
      });
      const data = await geminiRes.json();
      if (!geminiRes.ok) throw new Error(data.error?.message || "Gemini error");
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return res.json({ reply, provider: "gemini" });
    } catch (err) {
      return res.status(500).json({ error: `Gemini: ${err.message}` });
    }
  }

  // ── OpenAI fallback ──
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-4o", messages: userMessages, max_tokens: 2048 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message);
      return res.json({ reply: d.choices[0].message.content, provider: "openai" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Ollama fallback ──
  try {
    const base = process.env.OLLAMA_URL || "http://localhost:11434";
    const r = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "llama3", messages: userMessages, stream: false }),
    });
    const d = await r.json();
    return res.json({ reply: d.message?.content || "", provider: "ollama" });
  } catch (_) {}

  res.status(503).json({
    error: "No AI provider configured. Add GEMINI_API_KEY to .env (free: aistudio.google.com/apikey)",
  });
});

// ─── Tor control ──────────────────────────────────────────────────────────────
app.post("/api/tor/newcircuit", requireAuth, (_req, res) => {
  exec("pkill -HUP tor 2>/dev/null", () => {
    setTimeout(async () => {
      try {
        const ip = execSync("torsocks curl -sf --max-time 10 https://api.ipify.org 2>/dev/null", {
          encoding: "utf8",
        }).trim();
        res.json({ ok: true, newIp: ip });
      } catch (_) {
        res.json({ ok: true, newIp: "refreshing..." });
      }
    }, 3000);
  });
});

// ─── File browser ─────────────────────────────────────────────────────────────
const WORKSPACE = path.join(os.homedir(), "dave-workspace");

function safe(rel) {
  const r = path.resolve(WORKSPACE, rel || "");
  if (!r.startsWith(WORKSPACE)) throw new Error("Invalid path");
  return r;
}

app.get("/api/files", requireAuth, (req, res) => {
  try {
    const dir = safe(req.query.path || "");
    const entries = fs.readdirSync(dir, { withFileTypes: true }).map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
      path: path.relative(WORKSPACE, path.join(dir, e.name)),
    }));
    res.json({ path: path.relative(WORKSPACE, dir), entries });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/files/read", requireAuth, (req, res) => {
  try {
    const p = safe(req.query.path || "");
    if (fs.statSync(p).size > 512 * 1024) return res.status(400).json({ error: "File too large" });
    res.json({ content: fs.readFileSync(p, "utf8"), path: req.query.path });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/files/write", requireAuth, (req, res) => {
  try {
    const p = safe(req.body.path || "");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, req.body.content || "");
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── WebSocket Terminal ───────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/terminal" });
wss.on("connection", (ws, req) => {
  const token = new URL(req.url, "http://x").searchParams.get("token");
  if (!token || !sessions.has(token)) { ws.close(1008, "Unauthorized"); return; }

  try {
    const pty = require("node-pty").spawn(process.env.SHELL || "/bin/bash", [], {
      name: "xterm-256color", cols: 120, rows: 40,
      cwd: WORKSPACE, env: process.env,
    });
    pty.onData((d) => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ type: "output", data: d })));
    ws.on("message", (raw) => {
      try { const m = JSON.parse(raw); if (m.type === "input") pty.write(m.data); if (m.type === "resize") pty.resize(m.cols, m.rows); }
      catch (_) { pty.write(raw.toString()); }
    });
    ws.on("close", () => pty.kill());
  } catch (_) {
    ws.send(JSON.stringify({ type: "output", data: "Install node-pty for terminal support: npm install node-pty\r\n" }));
  }
});

// ─── Serve frontend ───────────────────────────────────────────────────────────
const distDir = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_, res) => res.sendFile(path.join(distDir, "index.html")));
} else {
  app.get("/", (_, res) => res.send(`<!DOCTYPE html><html><head><title>DAVE DevBox</title>
<style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:2rem;max-width:480px;width:100%}
h1{color:#58a6ff;margin:0 0 1rem}code{background:#21262d;padding:.2rem .5rem;border-radius:4px;font-size:.85rem;display:block;margin:.3rem 0}
a{color:#58a6ff}</style></head><body><div class="box">
<h1>DAVE DevBox ✓</h1><p>Server running on port ${PORT}.</p>
<p>Build the frontend:</p>
<code>cd dashboard/frontend && npm install && npm run build</code>
<p>API: <a href="/api/health">/api/health</a></p></div></body></html>`));
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DAVE Dashboard: http://0.0.0.0:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
});
