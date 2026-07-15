import { useEffect, useState } from "react";

function fmt(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  return (bytes / 1e6).toFixed(0) + " MB";
}

function Bar({ value, color = "bg-accent-emphasis" }) {
  return (
    <div className="w-full bg-canvas-inset rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Card({ label, value, sub, color = "" }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-fg-subtle uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-fg-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ token }) {
  const [sys, setSys] = useState(null);
  const [torLoading, setTorLoading] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/system", { headers: { Authorization: `Bearer ${token}` } });
      setSys(await r.json());
    } catch (_) {}
  };

  const newTorCircuit = async () => {
    setTorLoading(true);
    try {
      await fetch("/api/tor/newcircuit", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setTimeout(() => { load(); setTorLoading(false); }, 4000);
    } catch (_) { setTorLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);

  if (!sys) return <div className="p-6 text-fg-muted text-sm">Loading…</div>;

  const memPct = sys.memory.percentUsed;
  const loadPct = Math.min(100, (sys.cpu.loadavg[0] / sys.cpu.cores) * 100);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button onClick={load} className="btn-ghost text-xs">↺ Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card label="CPU" value={`${loadPct.toFixed(0)}%`} sub={`${sys.cpu.cores} cores`}
          color={loadPct > 80 ? "text-danger-fg" : "text-success-fg"} />
        <Card label="Memory" value={`${memPct}%`} sub={`${fmt(sys.memory.used)} / ${fmt(sys.memory.total)}`} />
        <Card label="Disk" value={sys.disk.used || "?"} sub={`of ${sys.disk.total || "?"}`} />
        <Card label="Uptime" value={`${Math.floor(sys.uptime / 3600)}h`} sub={`${Math.floor((sys.uptime % 3600) / 60)}m`} />
      </div>

      <div className="card p-4 mb-5">
        <div className="text-xs text-fg-subtle uppercase tracking-wider mb-3">Resources</div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-fg-muted"><span>CPU</span><span>{loadPct.toFixed(0)}%</span></div>
            <Bar value={loadPct} color={loadPct > 80 ? "bg-danger-fg" : "bg-accent-emphasis"} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-fg-muted"><span>Memory</span><span>{memPct}%</span></div>
            <Bar value={memPct} color={memPct > 85 ? "bg-danger-fg" : "bg-success-emphasis"} />
          </div>
        </div>
      </div>

      {/* Tor */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-fg-subtle uppercase tracking-wider">Tor Anonymity</div>
          <button onClick={newTorCircuit} disabled={torLoading} className="btn-ghost text-xs py-1">
            {torLoading ? "Rotating…" : "↺ New Circuit"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-fg-subtle mb-1">Tor Status</div>
            <div className={`text-sm font-semibold ${sys.tor.running ? "text-success-fg" : "text-danger-fg"}`}>
              {sys.tor.running ? "● Active" : "○ Stopped"}
            </div>
          </div>
          {sys.tor.ip && (
            <div>
              <div className="text-xs text-fg-subtle mb-1">Anonymous IP</div>
              <div className="text-sm font-mono text-accent-fg">{sys.tor.ip}</div>
            </div>
          )}
          {sys.tor.realIp && (
            <div>
              <div className="text-xs text-fg-subtle mb-1">Real IP (hidden by Tor)</div>
              <div className="text-sm font-mono text-fg-muted line-through">{sys.tor.realIp}</div>
            </div>
          )}
        </div>
      </div>

      {/* AI Providers */}
      <div className="card p-4">
        <div className="text-xs text-fg-subtle uppercase tracking-wider mb-3">AI Providers</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["Gemini (free)", sys.env.hasGemini],
            ["OpenAI", sys.env.hasOpenAI],
            ["OpenRouter", sys.env.hasOpenRouter],
            ["Ollama (local)", sys.ollama.running],
          ].map(([n, a]) => (
            <div key={n} className={`px-3 py-2 rounded border text-xs flex items-center gap-2 ${
              a ? "border-success-emphasis/40 bg-success-emphasis/10 text-success-fg" : "border-border-DEFAULT text-fg-subtle"
            }`}>
              <span>{a ? "●" : "○"}</span> {n}
            </div>
          ))}
        </div>
        {!sys.env.hasGemini && (
          <p className="text-xs text-warning-fg mt-3">
            Add your free Gemini key to .env → <span className="font-mono">GEMINI_API_KEY=...</span>
            <br />Get it free: <span className="text-accent-fg">aistudio.google.com/apikey</span>
          </p>
        )}
      </div>
    </div>
  );
}
