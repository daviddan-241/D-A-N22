import { useState, useEffect } from "react";

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...opts });

export default function Settings({ token }) {
  const [envVars, setEnvVars] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [edits, setEdits] = useState({});
  const [gitStatus, setGitStatus] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState("");
  const [commitMsg, setCommitMsg] = useState("DAVE DevBox update");

  useEffect(() => {
    API("/env", token).then(r => r.json()).then(d => { setEnvVars(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    API("/git/status", token).then(r => r.json()).then(d => setGitStatus(d.status || d.error || "")).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    // Only send keys that have actual values (not masked)
    const toSave = {};
    for (const [k, v] of Object.entries(edits)) if (v) toSave[k] = v;
    if (Object.keys(toSave).length === 0) { setSaving(false); return; }
    await API("/env", token, { method: "POST", body: JSON.stringify(toSave) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    // Refresh
    const d = await API("/env", token).then(r => r.json());
    setEnvVars(d);
    setEdits({});
  }

  async function pushToGit() {
    setPushing(true);
    setPushResult("");
    const r = await API("/git/commit-push", token, { method: "POST", body: JSON.stringify({ message: commitMsg, useTor: false }) });
    const d = await r.json();
    setPushResult(d.ok ? "✓ Pushed: " + (d.committed || d.message) : "✗ " + d.error);
    setPushing(false);
  }

  const input = { width: "100%", padding: "9px 12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" };
  const panel = { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20, marginBottom: 20 };

  const ENV_GROUPS = {
    "AI Keys": ["GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY", "AIDER_MODEL"],
    "GitHub": ["GITHUB_TOKEN", "GITHUB_REMOTE", "GITHUB_BRANCH"],
    "Dashboard": ["DASHBOARD_USERNAME", "DASHBOARD_PASSWORD", "DASHBOARD_PORT"],
    "SSH": ["ASHELL_SSH_PUBKEY"],
    "Ollama": ["OLLAMA_URL", "OLLAMA_MODEL"],
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h1 style={{ color: "#58a6ff", marginTop: 0 }}>Settings</h1>

      {/* Env vars */}
      <div style={panel}>
        <div style={{ fontWeight: 700, color: "#c9d1d9", marginBottom: 16, fontSize: 15 }}>Environment Variables (.env)</div>
        {Object.entries(ENV_GROUPS).map(([group, keys]) => (
          <div key={group} style={{ marginBottom: 18 }}>
            <div style={{ color: "#8b949e", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{group}</div>
            {keys.map(k => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <label style={{ color: "#c9d1d9", fontSize: 13, fontFamily: "monospace" }}>{k}</label>
                  {envVars[k]?.set && <span style={{ color: "#3fb950", fontSize: 11 }}>● set</span>}
                  {!envVars[k]?.set && envVars[k] !== undefined && <span style={{ color: "#f85149", fontSize: 11 }}>○ empty</span>}
                </div>
                <input
                  style={input}
                  type={k.includes("KEY") || k.includes("TOKEN") || k.includes("PASSWORD") || k.includes("SECRET") ? "password" : "text"}
                  placeholder={envVars[k]?.set ? "••••••••" : `Enter ${k}`}
                  value={edits[k] ?? ""}
                  onChange={e => setEdits(ed => ({ ...ed, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        ))}
        <button onClick={save} disabled={saving || Object.keys(edits).every(k => !edits[k])} style={{ padding: "10px 20px", background: "#238636", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Git push */}
      <div style={panel}>
        <div style={{ fontWeight: 700, color: "#c9d1d9", marginBottom: 12, fontSize: 15 }}>Push to GitHub</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#8b949e", background: "#0d1117", borderRadius: 6, padding: 10, marginBottom: 12, maxHeight: 150, overflow: "auto", whiteSpace: "pre-wrap" }}>
          {gitStatus || "Loading git status..."}
        </div>
        <input style={{ ...input, marginBottom: 10 }} value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message" />
        <button onClick={pushToGit} disabled={pushing} style={{ padding: "10px 20px", background: "#1f6feb", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
          {pushing ? "Pushing..." : "Commit & Push"}
        </button>
        {pushResult && <p style={{ color: pushResult.startsWith("✓") ? "#3fb950" : "#f85149", marginTop: 10, fontSize: 13 }}>{pushResult}</p>}
        <p style={{ color: "#8b949e", fontSize: 12, marginTop: 8 }}>Requires GITHUB_TOKEN and GITHUB_REMOTE in the env section above.</p>
      </div>

      {/* SSH connection */}
      <div style={panel}>
        <div style={{ fontWeight: 700, color: "#c9d1d9", marginBottom: 12, fontSize: 15 }}>SSH / a-Shell Connection</div>
        <p style={{ color: "#8b949e", fontSize: 13 }}>Add or update your a-Shell public key on the <a href="/setup" style={{ color: "#58a6ff" }}>Setup page</a>. After adding, connect from a-Shell mini:</p>
        <code style={{ display: "block", background: "#0d1117", padding: "10px 14px", borderRadius: 6, color: "#79c0ff", fontFamily: "monospace", fontSize: 13, marginBottom: 8 }}>
          ssh -p 443 GITHUB_USERNAME@CODESPACE_NAME.ssh.github.com
        </code>
        <code style={{ display: "block", background: "#0d1117", padding: "10px 14px", borderRadius: 6, color: "#79c0ff", fontFamily: "monospace", fontSize: 13 }}>
          tmux new -s dave
        </code>
      </div>
    </div>
  );
}
