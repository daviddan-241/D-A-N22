import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = (path, token) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });

function StatCard({ label, value, sub, color = "#58a6ff", onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "16px 20px", cursor: onClick ? "pointer" : "default", transition: "border-color .15s" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "#30363d")}>
      <div style={{ color: "#8b949e", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 22, fontFamily: "monospace" }}>{value ?? "–"}</div>
      {sub && <div style={{ color: "#8b949e", fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ token }) {
  const [sys, setSys] = useState(null);
  const [rotating, setRotating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    const d = await API("/system", token).then(r => r.json()).catch(() => null);
    setSys(d);
  }

  async function newCircuit() {
    setRotating(true);
    await fetch("/api/tor/newcircuit", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    await load();
    setRotating(false);
  }

  const setupNeeded = sys && (!sys.env?.hasGemini || !sys.env?.hasSSHKey);

  return (
    <div style={{ padding: 24 }}>
      {/* Setup banner */}
      {setupNeeded && (
        <div onClick={() => navigate("/setup")} style={{ background: "rgba(210,168,255,.08)", border: "1px solid #d2a8ff", borderRadius: 10, padding: "14px 18px", marginBottom: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚙</span>
          <div>
            <div style={{ color: "#d2a8ff", fontWeight: 600 }}>Setup required</div>
            <div style={{ color: "#8b949e", fontSize: 13 }}>
              {!sys.env?.hasGemini && "Add your Gemini API key. "}
              {!sys.env?.hasSSHKey && "Add your a-Shell SSH key for iPhone access."}
            </div>
          </div>
          <span style={{ marginLeft: "auto", color: "#d2a8ff" }}>→ Go to Setup</span>
        </div>
      )}

      <h1 style={{ color: "#58a6ff", marginTop: 0, marginBottom: 20 }}>Dashboard</h1>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="CPU CORES" value={sys?.cpu?.cores} sub={`Load: ${sys?.cpu?.loadavg?.[0]?.toFixed(2) ?? "–"}`} />
        <StatCard label="MEMORY" value={sys ? `${sys.memory.percentUsed}%` : "–"} sub={sys ? `${(sys.memory.used/1e9).toFixed(1)}/${(sys.memory.total/1e9).toFixed(1)} GB` : ""} color={sys?.memory?.percentUsed > 80 ? "#f85149" : "#58a6ff"} />
        <StatCard label="DISK" value={sys?.disk?.percent} sub={`${sys?.disk?.used} / ${sys?.disk?.total}`} />
        <StatCard label="UPTIME" value={sys ? `${Math.floor(sys.uptime/3600)}h` : "–"} sub={sys ? `${Math.floor((sys.uptime%3600)/60)}m` : ""} color="#3fb950" />
      </div>

      {/* Tor status */}
      <div style={{ background: "#161b22", border: `1px solid ${sys?.tor?.running ? "#238636" : "#30363d"}`, borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🧅</span>
              <span style={{ fontWeight: 700, color: sys?.tor?.running ? "#3fb950" : "#f85149", fontSize: 16 }}>
                Tor {sys?.tor?.running ? "Active" : "Not Running"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#8b949e", fontSize: 11 }}>TOR EXIT IP</div>
                <div style={{ color: "#79c0ff", fontFamily: "monospace", fontSize: 15 }}>{sys?.tor?.ip || "–"}</div>
              </div>
              <div>
                <div style={{ color: "#8b949e", fontSize: 11 }}>REAL IP</div>
                <div style={{ color: "#f85149", fontFamily: "monospace", fontSize: 15 }}>{sys?.tor?.realIp || "–"}</div>
              </div>
              <div>
                <div style={{ color: "#8b949e", fontSize: 11 }}>ANONYMOUS</div>
                <div style={{ color: sys?.tor?.ip && sys?.tor?.realIp && sys.tor.ip !== sys.tor.realIp ? "#3fb950" : "#f85149", fontWeight: 700, fontSize: 15 }}>
                  {sys?.tor?.ip && sys?.tor?.realIp ? (sys.tor.ip !== sys.tor.realIp ? "YES ✓" : "NO ✗") : "–"}
                </div>
              </div>
            </div>
          </div>
          <button onClick={newCircuit} disabled={rotating} style={{ padding: "10px 18px", background: "#238636", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            {rotating ? "Rotating..." : "🔄 New Circuit"}
          </button>
        </div>
      </div>

      {/* Services */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Gemini AI", ok: sys?.env?.hasGemini, detail: "gemini-2.0-flash (free)", action: () => navigate("/setup"), actionLabel: "Configure" },
          { label: "a-Shell SSH", ok: sys?.env?.hasSSHKey, detail: "iPhone access via Codespaces", action: () => navigate("/setup"), actionLabel: "Configure" },
          { label: "Aider", ok: sys?.aider?.installed, detail: sys?.aider?.version || "not installed" },
          { label: "Ollama", ok: sys?.ollama?.running, detail: sys?.ollama?.models?.join(", ") || "no models" },
        ].map(({ label, ok, detail, action, actionLabel }) => (
          <div key={label} style={{ background: "#161b22", border: `1px solid ${ok ? "#238636" : "#30363d"}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: ok ? "#3fb950" : "#f85149", fontSize: 16 }}>{ok ? "●" : "○"}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#c9d1d9" }}>{label}</span>
            </div>
            <div style={{ color: "#8b949e", fontSize: 12 }}>{detail}</div>
            {!ok && action && (
              <button onClick={action} style={{ marginTop: 8, padding: "4px 10px", background: "#21262d", border: "1px solid #58a6ff", color: "#58a6ff", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
                {actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ fontWeight: 600, color: "#c9d1d9", marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "AI Chat", to: "/chat", color: "#238636" },
            { label: "Agents", to: "/agents", color: "#1f6feb" },
            { label: "Terminal", to: "/terminal", color: "#30363d" },
            { label: "Files", to: "/files", color: "#30363d" },
            { label: "Network", to: "/network", color: "#30363d" },
            { label: "Setup", to: "/setup", color: "#6e40c9" },
          ].map(({ label, to, color }) => (
            <button key={to} onClick={() => navigate(to)} style={{ padding: "10px 18px", background: color, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
