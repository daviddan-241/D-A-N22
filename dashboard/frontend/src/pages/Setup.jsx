import { useState, useEffect } from "react";

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...opts });

function Step({ num, title, done, active, children }) {
  return (
    <div style={{ marginBottom: 24, borderRadius: 10, border: `1px solid ${done ? "#238636" : active ? "#58a6ff" : "#30363d"}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", background: done ? "rgba(35,134,54,.1)" : active ? "rgba(88,166,255,.07)" : "#161b22", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#238636" : active ? "#58a6ff" : "#30363d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", flexShrink: 0 }}>
          {done ? "✓" : num}
        </span>
        <span style={{ fontWeight: 600, fontSize: 15, color: done ? "#3fb950" : active ? "#58a6ff" : "#c9d1d9" }}>{title}</span>
      </div>
      {active && <div style={{ padding: "18px" }}>{children}</div>}
    </div>
  );
}

export default function Setup({ token }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState(null);

  // Step 1: Gemini key
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiDone, setGeminiDone] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState("");

  // Step 2: SSH key
  const [sshKey, setSshKey] = useState("");
  const [sshSaving, setSshSaving] = useState(false);
  const [sshResult, setSshResult] = useState(null);

  // Step 3: GitHub token
  const [githubToken, setGithubToken] = useState("");
  const [githubRemote, setGithubRemote] = useState("https://github.com/daviddan-241/D-A-N22");
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubDone, setGithubDone] = useState(false);

  useEffect(() => {
    API("/system", token).then(r => r.json()).then(d => {
      setStatus(d);
      if (d.env?.hasGemini) { setGeminiDone(true); if (step === 1) setStep(2); }
      if (d.env?.hasSSHKey) { setSshResult({ ok: true, alreadyExists: true }); if (step <= 2) setStep(3); }
    }).catch(() => {});
  }, []);

  async function saveGemini() {
    if (!geminiKey.trim()) return;
    setGeminiSaving(true);
    setGeminiMsg("");
    try {
      // Test the key first
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey.trim()}`;
      const testRes = await fetch(testUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
      });
      if (!testRes.ok) {
        const e = await testRes.json();
        throw new Error(e.error?.message || "Key test failed");
      }
      // Save to .env via API
      const r = await API("/env", token, { method: "POST", body: JSON.stringify({ GEMINI_API_KEY: geminiKey.trim() }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      setGeminiDone(true);
      setGeminiMsg("✓ Key saved and verified!");
      setTimeout(() => setStep(2), 800);
    } catch (e) {
      setGeminiMsg("✗ " + e.message);
    }
    setGeminiSaving(false);
  }

  async function saveSSHKey() {
    if (!sshKey.trim()) return;
    setSshSaving(true);
    try {
      const r = await API("/ssh/add-key", token, { method: "POST", body: JSON.stringify({ publicKey: sshKey.trim() }) });
      const d = await r.json();
      setSshResult(d);
      if (d.ok) setTimeout(() => setStep(3), 600);
    } catch (e) {
      setSshResult({ ok: false, error: e.message });
    }
    setSshSaving(false);
  }

  async function saveGitHub() {
    if (!githubToken.trim()) return;
    setGithubSaving(true);
    try {
      const r = await API("/env", token, { method: "POST", body: JSON.stringify({ GITHUB_TOKEN: githubToken.trim(), GITHUB_REMOTE: githubRemote.trim(), GITHUB_BRANCH: "main" }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      setGithubDone(true);
      setTimeout(() => setStep(4), 600);
    } catch (e) {
      alert("Error: " + e.message);
    }
    setGithubSaving(false);
  }

  const box = { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 14, marginBottom: 12 };
  const input = { width: "100%", padding: "10px 12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" };
  const btn = (color = "#238636") => ({ padding: "10px 20px", background: color, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const code = { background: "#0d1117", border: "1px solid #30363d", borderRadius: 5, padding: "8px 12px", fontFamily: "monospace", fontSize: 12, color: "#79c0ff", display: "block", marginTop: 6, userSelect: "all" };

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h1 style={{ color: "#58a6ff", marginTop: 0, marginBottom: 6 }}>DAVE DevBox Setup</h1>
      <p style={{ color: "#8b949e", marginBottom: 24, fontSize: 14 }}>Complete these steps once — everything is saved and auto-loaded forever.</p>

      {/* Step 1: Gemini */}
      <Step num={1} title="Add your free Gemini API key" done={geminiDone} active={step === 1}>
        <div style={box}>
          <p style={{ color: "#8b949e", fontSize: 13, margin: "0 0 10px" }}>
            Get a <strong style={{ color: "#58a6ff" }}>free</strong> key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>aistudio.google.com/apikey</a>
            {" "}— no credit card, no billing.
          </p>
          <input style={input} type="password" placeholder="AIzaSy..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveGemini()} />
          {geminiMsg && <p style={{ color: geminiMsg.startsWith("✓") ? "#3fb950" : "#f85149", fontSize: 13, marginTop: 8 }}>{geminiMsg}</p>}
        </div>
        <button style={btn()} disabled={geminiSaving || !geminiKey.trim()} onClick={saveGemini}>
          {geminiSaving ? "Saving & testing..." : "Save & Verify →"}
        </button>
      </Step>

      {/* Step 2: SSH key */}
      <Step num={2} title="Add your a-Shell SSH public key" done={!!sshResult?.ok} active={step === 2}>
        <div style={box}>
          <p style={{ color: "#8b949e", fontSize: 13, margin: "0 0 12px" }}>
            In <strong>a-Shell mini</strong> on your iPhone, run these two commands once:
          </p>
          <code style={code}>ssh-keygen -t ed25519</code>
          <code style={code}>cat ~/.ssh/id_ed25519.pub</code>
          <p style={{ color: "#8b949e", fontSize: 13, margin: "12px 0 6px" }}>Copy all the text starting with <code style={{ color: "#79c0ff" }}>ssh-ed25519</code> and paste here:</p>
          <textarea style={{ ...input, height: 80, resize: "vertical" }} placeholder="ssh-ed25519 AAAA..." value={sshKey} onChange={e => setSshKey(e.target.value)} />
          {sshResult && (
            <p style={{ color: sshResult.ok ? "#3fb950" : "#f85149", fontSize: 13, marginTop: 8 }}>
              {sshResult.ok ? (sshResult.alreadyExists ? "✓ Key already registered" : "✓ Key added!") : "✗ " + sshResult.error}
            </p>
          )}
        </div>
        <button style={btn()} disabled={sshSaving || !sshKey.trim()} onClick={saveSSHKey}>
          {sshSaving ? "Saving..." : "Save SSH Key →"}
        </button>
      </Step>

      {/* Step 3: GitHub token */}
      <Step num={3} title="Add GitHub token (for git push from app)" done={githubDone} active={step === 3}>
        <div style={box}>
          <p style={{ color: "#8b949e", fontSize: 13, margin: "0 0 12px" }}>
            Create a token at{" "}
            <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>
              github.com/settings/tokens
            </a>
            {" "}(Classic, check <strong>repo</strong> scope).
          </p>
          <label style={{ color: "#8b949e", fontSize: 12, display: "block", marginBottom: 4 }}>GitHub Personal Access Token</label>
          <input style={input} type="password" placeholder="ghp_..." value={githubToken} onChange={e => setGithubToken(e.target.value)} />
          <label style={{ color: "#8b949e", fontSize: 12, display: "block", margin: "10px 0 4px" }}>Repository URL</label>
          <input style={input} type="text" value={githubRemote} onChange={e => setGithubRemote(e.target.value)} />
        </div>
        <button style={btn()} disabled={githubSaving || !githubToken.trim()} onClick={saveGitHub}>
          {githubSaving ? "Saving..." : "Save Token →"}
        </button>
        <button style={{ ...btn("#30363d"), marginLeft: 8 }} onClick={() => setStep(4)}>Skip for now</button>
      </Step>

      {/* Step 4: Done */}
      <Step num={4} title="You're all set!" done={step > 4} active={step === 4}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <p style={{ color: "#3fb950", fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>DAVE DevBox is fully configured</p>
          {sshResult?.connectionString && (
            <div style={box}>
              <p style={{ color: "#8b949e", fontSize: 13, margin: "0 0 8px" }}>Connect from a-Shell mini:</p>
              <code style={code}>{sshResult.connectionString}</code>
              <p style={{ color: "#8b949e", fontSize: 12, margin: "8px 0 0" }}>Then run: <code style={{ color: "#79c0ff" }}>tmux new -s dave</code></p>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/chat" style={{ ...btn(), textDecoration: "none", display: "inline-block" }}>→ AI Chat</a>
            <a href="/agents" style={{ ...btn("#1f6feb"), textDecoration: "none", display: "inline-block" }}>→ AI Agents</a>
            <a href="/terminal" style={{ ...btn("#30363d"), textDecoration: "none", display: "inline-block" }}>→ Terminal</a>
          </div>
        </div>
      </Step>
    </div>
  );
}
