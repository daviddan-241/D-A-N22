import { useState, useEffect, useCallback } from "react";

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...opts,
  });

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={copy} style={{
      padding: "4px 10px", background: copied ? "#238636" : "#21262d",
      border: `1px solid ${copied ? "#238636" : "#30363d"}`, borderRadius: 5,
      color: copied ? "#fff" : "#8b949e", cursor: "pointer", fontSize: 11,
      whiteSpace: "nowrap", transition: "all .15s",
    }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ─── Command row: shows a command with a copy button ─────────────────────────
function Cmd({ label, value, note }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 4 }}>{label}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <code style={{
          flex: 1, display: "block", background: "#0d1117", border: "1px solid #30363d",
          borderRadius: 6, padding: "9px 12px", fontFamily: "monospace", fontSize: 13,
          color: "#79c0ff", wordBreak: "break-all",
        }}>
          {value}
        </code>
        <CopyBtn text={value} />
      </div>
      {note && <div style={{ color: "#8b949e", fontSize: 11, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

// ─── Key input row ────────────────────────────────────────────────────────────
function KeyField({ label, keyName, placeholder, description, link, linkLabel, isSet, value, onChange, secret = true, multiline = false }) {
  const [show, setShow] = useState(false);
  const inputStyle = {
    flex: 1, padding: "9px 12px", background: "#0d1117",
    border: `1px solid ${isSet ? "#238636" : "#30363d"}`,
    borderRadius: 6, color: "#c9d1d9", fontSize: 13,
    fontFamily: "monospace", boxSizing: "border-box",
    resize: multiline ? "vertical" : "none",
    minHeight: multiline ? 72 : "auto",
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: "#c9d1d9", fontSize: 14 }}>{label}</span>
        {isSet
          ? <span style={{ background: "#238636", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 11 }}>● Set</span>
          : <span style={{ background: "#f8514922", color: "#f85149", border: "1px solid #f8514944", borderRadius: 10, padding: "2px 8px", fontSize: 11 }}>○ Empty</span>
        }
        <code style={{ color: "#8b949e", fontSize: 11, marginLeft: "auto" }}>{keyName}</code>
      </div>
      {description && (
        <p style={{ color: "#8b949e", fontSize: 12, margin: "0 0 8px" }}>
          {description}
          {link && <> — <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>{linkLabel || link}</a></>}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {multiline ? (
          <textarea style={{ ...inputStyle, width: "100%" }} placeholder={placeholder}
            value={value} onChange={e => onChange(e.target.value)} spellCheck={false} />
        ) : (
          <input style={{ ...inputStyle, width: "100%" }}
            type={secret && !show ? "password" : "text"}
            placeholder={placeholder} value={value}
            onChange={e => onChange(e.target.value)} />
        )}
        {secret && !multiline && (
          <button onClick={() => setShow(s => !s)} style={{ padding: "9px 10px", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, icon, children, accent = "#58a6ff" }) {
  return (
    <div style={{ background: "#161b22", border: `1px solid #30363d`, borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: accent, fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#c9d1d9" }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Settings({ token }) {
  const [env, setEnv] = useState({});
  const [conn, setConn] = useState(null);
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState("");
  const [gitStatus, setGitStatus] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState("");
  const [commitMsg, setCommitMsg] = useState("DAVE DevBox update");
  const [sshApplying, setSshApplying] = useState(false);
  const [sshResult, setSshResult] = useState("");

  useEffect(() => {
    API("/env", token).then(r => r.json()).then(d => setEnv(d)).catch(() => {});
    API("/ssh/connection", token).then(r => r.json()).then(d => setConn(d)).catch(() => {});
    API("/git/status", token).then(r => r.json()).then(d => setGitStatus(d.status || d.error || "")).catch(() => {});
  }, []);

  const set = (k, v) => setVals(prev => ({ ...prev, [k]: v }));
  const isSet = (k) => env[k]?.set;
  const val = (k) => vals[k] ?? "";

  async function saveKey(k) {
    if (!vals[k]) return;
    setSaving(k);
    setSaveResult("");
    const r = await API("/env", token, { method: "POST", body: JSON.stringify({ [k]: vals[k] }) });
    const d = await r.json();
    if (d.ok) {
      const fresh = await API("/env", token).then(r => r.json());
      setEnv(fresh);
      setVals(p => ({ ...p, [k]: "" }));
      setSaveResult(`✓ ${k} saved`);
      setTimeout(() => setSaveResult(""), 2500);
    } else {
      setSaveResult("✗ " + d.error);
    }
    setSaving(false);
  }

  async function applySSHKey() {
    const k = vals["ASHELL_SSH_PUBKEY"] || "";
    if (!k.trim().startsWith("ssh-")) {
      setSshResult("✗ Paste the full key starting with ssh-ed25519");
      return;
    }
    setSshApplying(true);
    setSshResult("");
    const r = await API("/ssh/add-key", token, { method: "POST", body: JSON.stringify({ publicKey: k.trim() }) });
    const d = await r.json();
    if (d.ok) {
      const fresh = await API("/env", token).then(r => r.json());
      setEnv(fresh);
      const connFresh = await API("/ssh/connection", token).then(r => r.json());
      setConn(connFresh);
      setVals(p => ({ ...p, ASHELL_SSH_PUBKEY: "" }));
      setSshResult("✓ Key saved and authorized");
    } else {
      setSshResult("✗ " + d.error);
    }
    setSshApplying(false);
  }

  async function pushGit() {
    setPushing(true);
    setPushResult("");
    const r = await API("/git/commit-push", token, { method: "POST", body: JSON.stringify({ message: commitMsg }) });
    const d = await r.json();
    setPushResult(d.ok ? "✓ " + (d.message || "Pushed") : "✗ " + d.error);
    setPushing(false);
  }

  const saveBtn = (k, overrideAction) => (
    <button
      onClick={overrideAction || (() => saveKey(k))}
      disabled={saving === k || !vals[k]}
      style={{
        padding: "9px 18px", background: saving === k ? "#21262d" : "#238636",
        border: "none", borderRadius: 6, color: "#fff", cursor: vals[k] ? "pointer" : "not-allowed",
        fontWeight: 600, fontSize: 13, opacity: vals[k] ? 1 : 0.5, marginTop: 8,
      }}>
      {saving === k ? "Saving..." : "Save"}
    </button>
  );

  const codespaceName = conn?.codespaceName || "YOUR_CODESPACE_NAME";
  const githubUser = conn?.githubUser || "YOUR_GITHUB_USERNAME";
  const sshCmd = `ssh -p 443 ${githubUser}@${codespaceName}.ssh.github.com`;

  return (
    <div style={{ padding: 24, maxWidth: 760, fontFamily: "monospace" }}>
      <h1 style={{ color: "#58a6ff", marginTop: 0, marginBottom: 4 }}>Settings</h1>
      <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 24 }}>All keys save directly to .env on this Codespace. Copy buttons work on iPhone.</p>

      {saveResult && (
        <div style={{ background: saveResult.startsWith("✓") ? "#238636" : "#da3633", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#fff", fontSize: 13 }}>
          {saveResult}
        </div>
      )}

      {/* ── AI Key ─────────────────────────────────────────────────────────── */}
      <Section title="Gemini AI Key" icon="◈" accent="#58a6ff">
        <KeyField
          label="Gemini API Key"
          keyName="GEMINI_API_KEY"
          placeholder="AIzaSy..."
          description="Free, no credit card. Powers all AI features."
          link="https://aistudio.google.com/apikey"
          linkLabel="Get free key →"
          isSet={isSet("GEMINI_API_KEY")}
          value={val("GEMINI_API_KEY")}
          onChange={v => set("GEMINI_API_KEY", v)}
        />
        {saveBtn("GEMINI_API_KEY")}
      </Section>

      {/* ── a-Shell SSH ────────────────────────────────────────────────────── */}
      <Section title="a-Shell Mini — iPhone SSH" icon="📱" accent="#3fb950">
        <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 16, marginTop: 0 }}>
          Run these in a-Shell mini once to set up your SSH key, then paste the public key below.
        </p>

        <Cmd label="Step 1 — Generate key (run once in a-Shell mini)" value="ssh-keygen -t ed25519" note="Press Enter 3× to accept defaults." />
        <Cmd label="Step 2 — Show your public key (copy all output)" value="cat ~/.ssh/id_ed25519.pub" note='Copy the whole line starting with "ssh-ed25519 AAAA..."' />

        <div style={{ margin: "20px 0 10px", borderTop: "1px solid #21262d", paddingTop: 16 }}>
          <KeyField
            label="Your a-Shell Public Key"
            keyName="ASHELL_SSH_PUBKEY"
            placeholder="ssh-ed25519 AAAA..."
            description="Paste the full line from step 2 above."
            isSet={isSet("ASHELL_SSH_PUBKEY")}
            value={val("ASHELL_SSH_PUBKEY")}
            onChange={v => set("ASHELL_SSH_PUBKEY", v)}
            secret={false}
            multiline={true}
          />
          <button onClick={applySSHKey} disabled={sshApplying || !vals["ASHELL_SSH_PUBKEY"]}
            style={{ padding: "9px 18px", background: sshApplying ? "#21262d" : "#238636", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: vals["ASHELL_SSH_PUBKEY"] ? 1 : 0.5 }}>
            {sshApplying ? "Saving..." : "Save & Authorize"}
          </button>
          {sshResult && <p style={{ color: sshResult.startsWith("✓") ? "#3fb950" : "#f85149", fontSize: 13, marginTop: 8 }}>{sshResult}</p>}
        </div>

        <div style={{ marginTop: 20, borderTop: "1px solid #21262d", paddingTop: 16 }}>
          <div style={{ color: "#c9d1d9", fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
            Connect from a-Shell mini
            {conn?.hasAuthorizedKey && <span style={{ color: "#3fb950", fontSize: 12, fontWeight: 400, marginLeft: 10 }}>● Key authorized</span>}
          </div>

          <Cmd
            label="Step 3 — SSH into your Codespace"
            value={sshCmd}
            note={!conn?.codespaceName ? "⚠ Open a Codespace first — name auto-fills when dashboard starts inside one" : ""}
          />
          <Cmd label="Step 4 — Start tmux so session survives closing a-Shell" value="tmux new -s dave" note="To reconnect later: tmux attach -t dave" />
          <Cmd label="Run AI coding agent" value="dave-ai" note="Opens Gemini Coder in your workspace" />
          <Cmd label="Check Tor anonymity" value="dave-tor-check" />
          <Cmd label="System status" value="dave-status" />
        </div>
      </Section>

      {/* ── GitHub ─────────────────────────────────────────────────────────── */}
      <Section title="GitHub — Push from this app" icon="◧" accent="#d2a8ff">
        <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 16, marginTop: 0 }}>
          Lets you commit and push code changes directly from the web app without touching the terminal.
        </p>
        <Cmd
          label="Create a token at — check repo scope"
          value="github.com/settings/tokens/new"
          note="Classic token, check the repo checkbox."
        />
        <KeyField
          label="GitHub Token"
          keyName="GITHUB_TOKEN"
          placeholder="ghp_..."
          isSet={isSet("GITHUB_TOKEN")}
          value={val("GITHUB_TOKEN")}
          onChange={v => set("GITHUB_TOKEN", v)}
        />
        {saveBtn("GITHUB_TOKEN")}

        <div style={{ marginTop: 20, borderTop: "1px solid #21262d", paddingTop: 16 }}>
          <KeyField
            label="Repository URL"
            keyName="GITHUB_REMOTE"
            placeholder="https://github.com/username/repo"
            description="The repo to push to."
            isSet={isSet("GITHUB_REMOTE")}
            value={val("GITHUB_REMOTE")}
            onChange={v => set("GITHUB_REMOTE", v)}
            secret={false}
          />
          {saveBtn("GITHUB_REMOTE")}
        </div>

        <div style={{ marginTop: 20, borderTop: "1px solid #21262d", paddingTop: 16 }}>
          <div style={{ fontWeight: 600, color: "#c9d1d9", marginBottom: 8, fontSize: 14 }}>Commit & Push</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#8b949e", background: "#0d1117", borderRadius: 6, padding: 10, marginBottom: 10, maxHeight: 100, overflow: "auto", whiteSpace: "pre-wrap" }}>
            {gitStatus || "Loading..."}
          </div>
          <input
            style={{ width: "100%", padding: "9px 12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 8 }}
            value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message"
          />
          <button onClick={pushGit} disabled={pushing} style={{ padding: "9px 18px", background: "#1f6feb", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {pushing ? "Pushing..." : "Commit & Push"}
          </button>
          {pushResult && <p style={{ color: pushResult.startsWith("✓") ? "#3fb950" : "#f85149", fontSize: 13, marginTop: 8 }}>{pushResult}</p>}
        </div>
      </Section>

      {/* ── Dashboard login ────────────────────────────────────────────────── */}
      <Section title="Dashboard Login" icon="◎" accent="#d29922">
        <KeyField
          label="Username"
          keyName="DASHBOARD_USERNAME"
          placeholder="admin"
          isSet={isSet("DASHBOARD_USERNAME")}
          value={val("DASHBOARD_USERNAME")}
          onChange={v => set("DASHBOARD_USERNAME", v)}
          secret={false}
        />
        {saveBtn("DASHBOARD_USERNAME")}
        <div style={{ marginTop: 16 }}>
          <KeyField
            label="Password"
            keyName="DASHBOARD_PASSWORD"
            placeholder="dave2024"
            isSet={isSet("DASHBOARD_PASSWORD")}
            value={val("DASHBOARD_PASSWORD")}
            onChange={v => set("DASHBOARD_PASSWORD", v)}
          />
          {saveBtn("DASHBOARD_PASSWORD")}
        </div>
      </Section>

      {/* ── Optional AI ────────────────────────────────────────────────────── */}
      <Section title="Optional AI Providers" icon="◉" accent="#8b949e">
        <p style={{ color: "#8b949e", fontSize: 12, marginTop: 0, marginBottom: 16 }}>Not required — Gemini above is free and used by default.</p>
        <KeyField
          label="OpenAI Key"
          keyName="OPENAI_API_KEY"
          placeholder="sk-..."
          isSet={isSet("OPENAI_API_KEY")}
          value={val("OPENAI_API_KEY")}
          onChange={v => set("OPENAI_API_KEY", v)}
        />
        {saveBtn("OPENAI_API_KEY")}
        <div style={{ marginTop: 16 }}>
          <KeyField
            label="OpenRouter Key"
            keyName="OPENROUTER_API_KEY"
            placeholder="sk-or-..."
            description="Access many models, some free."
            link="https://openrouter.ai/keys"
            linkLabel="openrouter.ai/keys"
            isSet={isSet("OPENROUTER_API_KEY")}
            value={val("OPENROUTER_API_KEY")}
            onChange={v => set("OPENROUTER_API_KEY", v)}
          />
          {saveBtn("OPENROUTER_API_KEY")}
        </div>
      </Section>
    </div>
  );
}
