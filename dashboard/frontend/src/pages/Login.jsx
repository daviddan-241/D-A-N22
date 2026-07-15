import { useState } from "react";

export default function Login({ onLogin }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Login failed");
      onLogin(d.token);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 36, width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⬡</div>
          <h1 style={{ color: "#58a6ff", margin: 0, fontSize: 22 }}>DAVE DevBox</h1>
          <p style={{ color: "#8b949e", fontSize: 13, margin: "6px 0 0" }}>Tor · Gemini · a-Shell</p>
        </div>
        <form onSubmit={login}>
          <input style={{ width: "100%", padding: "11px 14px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 7, color: "#c9d1d9", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
            value={user} onChange={e => setUser(e.target.value)} placeholder="Username" autoComplete="username" />
          <input style={{ width: "100%", padding: "11px 14px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 7, color: "#c9d1d9", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
            type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" autoComplete="current-password" />
          {err && <p style={{ color: "#f85149", fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: 12, background: "#238636", border: "none", borderRadius: 7, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p style={{ color: "#8b949e", fontSize: 12, textAlign: "center", marginTop: 16 }}>Default: admin / dave2024</p>
      </div>
    </div>
  );
}
