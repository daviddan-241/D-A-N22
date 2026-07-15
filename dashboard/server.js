/**
 * DAVE DevBox Dashboard — v3.0.0
 * Everything real. Everything from the web app. No pasting in terminal.
 */
"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync, exec, spawn } = require("child_process");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

// ─── Load .env ────────────────────────────────────────────────────────────────
const ENV_PATH = path.join(__dirname, "..", ".env");
function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  fs.readFileSync(ENV_PATH, "utf8").split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#") && line.includes("=")) {
      const [k, ...v] = line.split("=");
      process.env[k.trim()] = process.env[k.trim()] || v.join("=").trim();
    }
  });
}
loadEnv();

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const obj = {};
  fs.readFileSync(ENV_PATH, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const [k, ...v] = t.split("=");
      obj[k.trim()] = v.join("=").trim();
    }
  });
  return obj;
}

function writeEnvFile(obj) {
  // Merge with existing so comments are preserved where possible
  let content = "";
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
    const written = new Set();
    content = lines.map((line) => {
      const t = line.trim();
      if (t && !t.startsWith("#") && t.includes("=")) {
        const k = t.split("=")[0].trim();
        if (k in obj) {
          written.add(k);
          return `${k}=${obj[k]}`;
        }
      }
      return line;
    }).join("\n");
    // Append any new keys
    for (const [k, v] of Object.entries(obj)) {
      if (!written.has(k)) content += `\n${k}=${v}`;
    }
  } else {
    content = Object.entries(obj).map(([k, v]) => `${k}=${v}`).join("\n");
  }
  fs.writeFileSync(ENV_PATH, content);
  // Reload into process.env
  for (const [k, v] of Object.entries(obj)) process.env[k] = v;
}

const PORT = parseInt(process.env.DASHBOARD_PORT || "3000", 10);
const DASH_USER = process.env.DASHBOARD_USERNAME || "admin";
const DASH_PASS = process.env.DASHBOARD_PASSWORD || "dave2024";
const DAVE_DIR = path.join(__dirname, "..");
const WORKSPACE = path.join(os.homedir(), "dave-workspace");
const MEMORY_FILE = path.join(WORKSPACE, ".aider.memory.md");

const app = express();
const server = http.createServer(app);
const sessions = new Map();

app.use(express.json({ limit: "10mb" }));
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
app.get("/api/health", (_req, res) => res.json({ status: "ok", version: "3.0.0" }));

// ─── ENV management (read/write from web UI) ──────────────────────────────────
app.get("/api/env", requireAuth, (_req, res) => {
  const raw = readEnvFile();
  // Mask actual values but show which keys are set
  const masked = {};
  for (const [k, v] of Object.entries(raw)) {
    masked[k] = { set: v.length > 0, value: k.includes("KEY") || k.includes("SECRET") || k.includes("PASSWORD")
      ? (v ? "••••••••" : "") : v };
  }
  res.json(masked);
});

app.post("/api/env", requireAuth, (req, res) => {
  const updates = req.body; // { KEY: value, ... }
  if (!updates || typeof updates !== "object") return res.status(400).json({ error: "Invalid body" });
  try {
    writeEnvFile(updates);
    res.json({ ok: true, updated: Object.keys(updates) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SSH key management (add a-Shell key from web UI) ─────────────────────────
app.post("/api/ssh/add-key", requireAuth, (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey || !publicKey.trim().startsWith("ssh-")) {
    return res.status(400).json({ error: "Invalid SSH public key. Must start with ssh-ed25519 or ssh-rsa" });
  }
  const key = publicKey.trim();
  try {
    const sshDir = path.join(os.homedir(), ".ssh");
    fs.mkdirSync(sshDir, { recursive: true });
    fs.chmodSync(sshDir, 0o700);
    const authFile = path.join(sshDir, "authorized_keys");

    // Check if key already exists
    let existing = "";
    if (fs.existsSync(authFile)) existing = fs.readFileSync(authFile, "utf8");
    if (!existing.includes(key)) {
      fs.appendFileSync(authFile, `\n${key}\n`);
      fs.chmodSync(authFile, 0o600);
    }

    // Save to .env for persistence across setups
    writeEnvFile({ ASHELL_SSH_PUBKEY: key });

    // Get connection string
    const codespaceName = process.env.CODESPACE_NAME || "";
    const ghUser = process.env.GITHUB_USER || process.env.GITHUB_ACTOR || "";
    let connectionStr = "";
    if (codespaceName && ghUser) {
      connectionStr = `ssh -p 443 ${ghUser}@${codespaceName}.ssh.github.com`;
    } else if (codespaceName) {
      connectionStr = `ssh -p 443 USER@${codespaceName}.ssh.github.com`;
    } else {
      connectionStr = `ssh -p 443 GITHUB_USERNAME@CODESPACE_NAME.ssh.github.com`;
    }

    res.json({
      ok: true,
      alreadyExists: existing.includes(key),
      connectionString: connectionStr,
      codespaceName,
      hint: codespaceName ? "" : "Run: echo $CODESPACE_NAME in the terminal to get your Codespace name"
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/ssh/connection", requireAuth, (_req, res) => {
  const codespaceName = process.env.CODESPACE_NAME || "";
  const ghUser = process.env.GITHUB_USER || process.env.GITHUB_ACTOR || "";
  const hasKey = (() => {
    try {
      const af = path.join(os.homedir(), ".ssh", "authorized_keys");
      return fs.existsSync(af) && fs.readFileSync(af, "utf8").includes("ssh-");
    } catch (_) { return false; }
  })();

  res.json({
    codespaceName,
    githubUser: ghUser,
    connectionString: codespaceName && ghUser
      ? `ssh -p 443 ${ghUser}@${codespaceName}.ssh.github.com`
      : "ssh -p 443 GITHUB_USERNAME@CODESPACE_NAME.ssh.github.com",
    hasAuthorizedKey: hasKey,
    tmuxCommand: "tmux new -s dave",
    tmuxReattach: "tmux attach -t dave",
  });
});

// ─── System status ────────────────────────────────────────────────────────────
app.get("/api/system", requireAuth, async (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  let disk = { total: "N/A", used: "N/A", free: "N/A", percent: "N/A" };
  try {
    const d = execSync("df -h / 2>/dev/null | tail -1", { encoding: "utf8" }).trim().split(/\s+/);
    disk = { total: d[1], used: d[2], free: d[3], percent: d[4] };
  } catch (_) {}

  let torRunning = false, torIp = null, realIp = null;
  try { execSync("pgrep -x tor", { encoding: "utf8" }); torRunning = true; } catch (_) {}
  try { torIp = execSync("torsocks curl -sf --max-time 8 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim(); } catch (_) {}
  try { realIp = execSync("curl -sf --max-time 5 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim(); } catch (_) {}

  let ollamaModels = [];
  try { ollamaModels = execSync("ollama list 2>/dev/null", { encoding: "utf8" }).split("\n").slice(1).filter(Boolean).map((l) => l.split(/\s+/)[0]); } catch (_) {}

  let aiderVersion = null;
  try { aiderVersion = execSync("aider --version 2>/dev/null", { encoding: "utf8" }).trim(); } catch (_) {}

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
    cpu: { cores: os.cpus().length, loadavg: os.loadavg() },
    memory: { total: totalMem, used: totalMem - freeMem, percentUsed: Math.round(((totalMem - freeMem) / totalMem) * 100) },
    disk,
    tor: { running: torRunning, ip: torIp, realIp },
    ollama: { running: ollamaModels.length > 0, models: ollamaModels },
    aider: { installed: !!aiderVersion, version: aiderVersion },
    env: {
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasSSHKey: !!process.env.ASHELL_SSH_PUBKEY,
    },
    setup: {
      complete: !!(process.env.GEMINI_API_KEY && process.env.ASHELL_SSH_PUBKEY),
    },
  });
});

// ─── Tor ──────────────────────────────────────────────────────────────────────
app.post("/api/tor/newcircuit", requireAuth, (_req, res) => {
  exec("pkill -HUP tor 2>/dev/null", () => {
    setTimeout(async () => {
      try {
        const ip = execSync("torsocks curl -sf --max-time 12 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim();
        res.json({ ok: true, newIp: ip });
      } catch (_) {
        res.json({ ok: true, newIp: "tor still connecting..." });
      }
    }, 4000);
  });
});

app.get("/api/tor/status", requireAuth, (_req, res) => {
  let torRunning = false, torIp = null, realIp = null;
  try { execSync("pgrep -x tor"); torRunning = true; } catch (_) {}
  try { torIp = execSync("torsocks curl -sf --max-time 8 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim(); } catch (_) {}
  try { realIp = execSync("curl -sf --max-time 5 https://api.ipify.org 2>/dev/null", { encoding: "utf8" }).trim(); } catch (_) {}
  res.json({ running: torRunning, torIp, realIp, anonymous: torIp && realIp && torIp !== realIp });
});

// ─── Anonymous web fetch (via Tor) ────────────────────────────────────────────
app.post("/api/web/fetch", requireAuth, async (req, res) => {
  const { url, useTor = true } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const cmd = useTor
      ? `torsocks curl -sL --max-time 15 -A "Mozilla/5.0" "${url}" 2>/dev/null`
      : `curl -sL --max-time 15 -A "Mozilla/5.0" "${url}" 2>/dev/null`;
    const content = execSync(cmd, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
    res.json({ ok: true, content, usedTor: useTor });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Anonymous web search (DuckDuckGo via Tor) ────────────────────────────────
app.post("/api/web/search", requireAuth, async (req, res) => {
  const { query, useTor = true } = req.body;
  if (!query) return res.status(400).json({ error: "query required" });
  try {
    const encoded = encodeURIComponent(query);
    const cmd = useTor
      ? `torsocks curl -sL --max-time 15 -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" "https://html.duckduckgo.com/html/?q=${encoded}" 2>/dev/null`
      : `curl -sL --max-time 15 "https://html.duckduckgo.com/html/?q=${encoded}" 2>/dev/null`;
    const html = execSync(cmd, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
    // Parse results from HTML
    const results = [];
    const linkRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    const links = [];
    while ((m = linkRe.exec(html)) !== null) links.push({ url: m[1], title: m[2].replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim() });
    const snippets = [];
    while ((m = snippetRe.exec(html)) !== null) snippets.push(m[1].replace(/<[^>]+>/g, "").trim());
    for (let i = 0; i < Math.min(links.length, 8); i++) {
      results.push({ ...links[i], snippet: snippets[i] || "" });
    }
    res.json({ ok: true, results, usedTor, query });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI Chat (Gemini-first, streaming capable) ────────────────────────────────
app.post("/api/chat", requireAuth, async (req, res) => {
  const { messages, agent = "assistant" } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "No messages" });

  // Build system prompt based on agent mode
  const systemPrompts = {
    assistant: "You are DAVE, a powerful AI assistant inside a self-hosted development environment. You help with coding, research, system administration, and anything else. You have access to tools for web search, code execution, and file management.",
    coder: "You are DAVE Coder — an expert software engineer. You write complete, working code. You think step by step. You use best practices. You explain what you're doing.",
    researcher: "You are DAVE Researcher — you analyze information, find patterns, and produce comprehensive research reports. Be thorough, cite sources when possible, and think critically.",
    planner: "You are DAVE Planner — you break complex tasks into clear, ordered steps. You think about dependencies, risks, and edge cases. You produce actionable plans.",
    reviewer: "You are DAVE Reviewer — you review code and systems for bugs, security issues, performance problems, and improvements. Be thorough and specific.",
    hacker: "You are DAVE Security — you analyze systems for vulnerabilities, perform security assessments, suggest hardening measures, and explain attack vectors for educational purposes. You operate anonymously via Tor.",
  };

  const systemMsg = { role: "user", parts: [{ text: systemPrompts[agent] || systemPrompts.assistant }] };
  const userMessages = messages.filter((m) => m.role !== "system");

  // ── Gemini ──
  if (process.env.GEMINI_API_KEY) {
    try {
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const contents = [
        systemMsg,
        { role: "model", parts: [{ text: "Understood. I'm ready to help." }] },
        ...userMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      ];
      const r = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 4096, temperature: 0.7 } }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || "Gemini error");
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return res.json({ reply, provider: "gemini", agent, model: "gemini-2.0-flash" });
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
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompts[agent] }, ...userMessages], max_tokens: 4096 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message);
      return res.json({ reply: d.choices[0].message.content, provider: "openai", agent });
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
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "llama3", messages: [{ role: "system", content: systemPrompts[agent] }, ...userMessages], stream: false }),
    });
    const d = await r.json();
    return res.json({ reply: d.message?.content || "", provider: "ollama", agent });
  } catch (_) {}

  res.status(503).json({ error: "No AI provider configured. Add GEMINI_API_KEY to .env via the Setup page (free at aistudio.google.com/apikey)" });
});

// ─── Memory / Notes (persistent AI memory) ────────────────────────────────────
app.get("/api/memory", requireAuth, (_req, res) => {
  fs.mkdirSync(WORKSPACE, { recursive: true });
  let content = "";
  if (fs.existsSync(MEMORY_FILE)) content = fs.readFileSync(MEMORY_FILE, "utf8");
  res.json({ content, path: MEMORY_FILE });
});

app.post("/api/memory", requireAuth, (req, res) => {
  const { content, append = false } = req.body;
  fs.mkdirSync(WORKSPACE, { recursive: true });
  if (append) {
    const ts = new Date().toISOString();
    fs.appendFileSync(MEMORY_FILE, `\n\n## ${ts}\n${content}`);
  } else {
    fs.writeFileSync(MEMORY_FILE, content);
  }
  res.json({ ok: true });
});

// ─── Git operations ────────────────────────────────────────────────────────────
app.get("/api/git/status", requireAuth, (req, res) => {
  const dir = req.query.dir || DAVE_DIR;
  try {
    const status = execSync("git status --short 2>/dev/null", { cwd: dir, encoding: "utf8" });
    const branch = execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", { cwd: dir, encoding: "utf8" }).trim();
    const log = execSync("git log --oneline -5 2>/dev/null", { cwd: dir, encoding: "utf8" });
    const remote = execSync("git remote -v 2>/dev/null", { cwd: dir, encoding: "utf8" });
    res.json({ ok: true, status, branch, log, remote });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/git/commit-push", requireAuth, (req, res) => {
  const { message = "DAVE DevBox update", dir = DAVE_DIR, useTor = false } = req.body;
  const envVars = readEnvFile();
  const token = envVars.GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
  const remote = envVars.GITHUB_REMOTE || process.env.GITHUB_REMOTE || "";
  const branch = envVars.GITHUB_BRANCH || process.env.GITHUB_BRANCH || "main";

  try {
    execSync("git add -A", { cwd: dir });
    const statusOut = execSync("git status --short", { cwd: dir, encoding: "utf8" });
    if (!statusOut.trim()) return res.json({ ok: true, message: "Nothing to commit" });

    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: dir });

    if (!token || !remote) {
      return res.status(400).json({ error: "GITHUB_TOKEN and GITHUB_REMOTE not set in .env. Add them via the Setup page." });
    }

    const pushUrl = remote.replace("https://", `https://x-access-token:${token}@`);
    const pushCmd = useTor
      ? `torsocks git push ${pushUrl} ${branch} --force 2>&1`
      : `git push ${pushUrl} ${branch} --force 2>&1`;
    const out = execSync(pushCmd, { cwd: dir, encoding: "utf8", timeout: 60000 });
    res.json({ ok: true, output: out, committed: statusOut });
  } catch (e) {
    res.status(500).json({ error: e.stderr || e.message });
  }
});

// ─── File browser ─────────────────────────────────────────────────────────────
app.get("/api/files", requireAuth, (req, res) => {
  const rel = req.query.path || "";
  const ROOTS = { workspace: WORKSPACE, dave: DAVE_DIR, home: os.homedir() };
  let base = WORKSPACE;
  for (const [k, v] of Object.entries(ROOTS)) {
    if (rel.startsWith(k + "/") || rel === k) { base = v; break; }
  }
  const target = rel ? path.join(base, rel.replace(/^(workspace|dave|home)\//, "")) : WORKSPACE;
  try {
    const items = fs.readdirSync(target).map((name) => {
      const full = path.join(target, name);
      const stat = fs.statSync(full);
      return { name, path: full, isDir: stat.isDirectory(), size: stat.size, mtime: stat.mtime };
    });
    res.json({ path: target, items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/files/read", requireAuth, (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).json({ error: "path required" });
  try { res.json({ content: fs.readFileSync(p, "utf8"), path: p }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/files/write", requireAuth, (req, res) => {
  const { path: p, content } = req.body;
  if (!p) return res.status(400).json({ error: "path required" });
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content || ""); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Shell command execution (unrestricted) ────────────────────────────────────
app.post("/api/exec", requireAuth, (req, res) => {
  const { command, cwd = WORKSPACE, useTor = false, timeout = 30000 } = req.body;
  if (!command) return res.status(400).json({ error: "command required" });
  const cmd = useTor ? `torsocks ${command}` : command;
  exec(cmd, { cwd, timeout, encoding: "utf8" }, (err, stdout, stderr) => {
    res.json({ ok: !err, stdout: stdout || "", stderr: stderr || "", exitCode: err?.code ?? 0 });
  });
});

// ─── WebSocket: Terminal ───────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/terminal" });
wss.on("connection", (ws, req) => {
  const token = new URL(req.url, "http://x").searchParams.get("token");
  if (!token || !sessions.has(token)) { ws.close(1008, "Unauthorized"); return; }
  try {
    const pty = require("node-pty").spawn(process.env.SHELL || "/bin/bash", [], {
      name: "xterm-256color", cols: 120, rows: 40, cwd: WORKSPACE, env: { ...process.env, TERM: "xterm-256color" },
    });
    pty.onData((d) => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ type: "output", data: d })));
    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === "input") pty.write(m.data);
        if (m.type === "resize") pty.resize(m.cols || 80, m.rows || 24);
      } catch (_) { pty.write(raw.toString()); }
    });
    ws.on("close", () => pty.kill());
  } catch (_) {
    ws.send(JSON.stringify({ type: "output", data: "\r\nTerminal needs node-pty. Run: npm install node-pty\r\n" }));
  }
});

// ─── WebSocket: Aider live AI coding session ──────────────────────────────────
const aiderWss = new WebSocketServer({ server, path: "/ws/aider" });
const aiderSessions = new Map();

aiderWss.on("connection", (ws, req) => {
  const params = new URL(req.url, "http://x").searchParams;
  const token = params.get("token");
  const agent = params.get("agent") || "coder";
  if (!token || !sessions.has(token)) { ws.close(1008, "Unauthorized"); return; }

  const envVars = readEnvFile();
  const sessionEnv = { ...process.env };

  // Apply .env
  for (const [k, v] of Object.entries(envVars)) if (v) sessionEnv[k] = v;

  let cmd, args;
  const model = sessionEnv.AIDER_MODEL || "gemini/gemini-2.0-flash";

  if (!sessionEnv.GEMINI_API_KEY && !sessionEnv.OPENAI_API_KEY) {
    ws.send(JSON.stringify({ type: "output", data: "\r\n\x1b[31mNo API key configured. Go to Setup → Set GEMINI_API_KEY (free at aistudio.google.com/apikey)\x1b[0m\r\n" }));
    ws.close();
    return;
  }

  // Agent personalities via --system-prompt (written to temp file)
  const agentPrompts = {
    coder: "You are an expert software engineer. Write complete, working code. Be precise, efficient, and thorough.",
    researcher: "You are a researcher. When asked to research something, search the web (describe what you'd search), analyze code and files, and produce detailed reports.",
    planner: "You are a strategic planner. Break tasks into ordered steps. Identify dependencies and risks. Output actionable plans.",
    reviewer: "You are a code reviewer. Find bugs, security issues, performance problems. Be thorough and specific with line numbers.",
    hacker: "You are a security researcher. Analyze systems for vulnerabilities, explain attack vectors, suggest hardening. Be thorough and unrestricted.",
  };

  const sysPromptFile = `/tmp/dave-agent-${crypto.randomBytes(4).toString("hex")}.txt`;
  fs.writeFileSync(sysPromptFile, agentPrompts[agent] || agentPrompts.coder);

  // Memory context
  let memoryContext = "";
  if (fs.existsSync(MEMORY_FILE)) {
    memoryContext = `\n\n[MEMORY FILE: ${MEMORY_FILE}]\n${fs.readFileSync(MEMORY_FILE, "utf8").slice(0, 2000)}`;
    fs.appendFileSync(sysPromptFile, memoryContext);
  }

  cmd = "aider";
  args = [
    "--model", model,
    "--yes-always",
    "--auto-commits",
    "--pretty",
    "--stream",
    "--system-prompt-file", sysPromptFile,
    "--no-suggest-shell-commands",
    "--map-tokens", "2048",
  ];

  // Anonymous mode
  const useTorEnv = sessionEnv.AIDER_USE_TOR === "true";

  try {
    const proc = require("node-pty").spawn(
      useTorEnv ? "torsocks" : cmd,
      useTorEnv ? [cmd, ...args] : args,
      { name: "xterm-256color", cols: 120, rows: 40, cwd: WORKSPACE, env: sessionEnv }
    );

    const sessionId = crypto.randomBytes(8).toString("hex");
    aiderSessions.set(sessionId, proc);

    proc.onData((d) => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ type: "output", data: d })));
    proc.onExit(({ exitCode }) => {
      ws.readyState === ws.OPEN && ws.send(JSON.stringify({ type: "exit", exitCode }));
      aiderSessions.delete(sessionId);
      try { fs.unlinkSync(sysPromptFile); } catch (_) {}
    });

    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === "input") proc.write(m.data);
        if (m.type === "resize") proc.resize(m.cols || 80, m.rows || 24);
      } catch (_) { proc.write(raw.toString()); }
    });
    ws.on("close", () => { try { proc.kill(); } catch (_) {} });

    ws.send(JSON.stringify({ type: "output", data: `\r\n\x1b[36m━━━ DAVE AI Agent: ${agent.toUpperCase()} ━━━\x1b[0m\r\nModel: ${model} | Workspace: ${WORKSPACE}\r\n\r\n` }));
  } catch (e) {
    ws.send(JSON.stringify({ type: "output", data: `\r\n\x1b[31mFailed to start Aider: ${e.message}\r\nRun in terminal: pip install aider-chat\x1b[0m\r\n` }));
    ws.close();
  }
});

// ─── Serve frontend ───────────────────────────────────────────────────────────
const distDir = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_, res) => res.sendFile(path.join(distDir, "index.html")));
} else {
  app.get("/", (_, res) => res.send(`<!DOCTYPE html><html><head><title>DAVE DevBox</title>
<style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:2rem;max-width:520px;width:100%}
h1{color:#58a6ff}code{background:#21262d;padding:.2rem .5rem;border-radius:4px;display:block;margin:.3rem 0}</style></head>
<body><div class="box"><h1>DAVE DevBox v3.0 ✓</h1><p>Server running. Build the frontend:</p>
<code>cd dashboard/frontend && npm install && npm run build</code></div></body></html>`));
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DAVE Dashboard v3.0.0: http://0.0.0.0:${PORT}`);
});
