import { useEffect, useState } from "react";

function StatCard({ label, value, sub, color = "text-fg-DEFAULT" }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-fg-subtle uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, color = "bg-accent-emphasis" }) {
  return (
    <div className="w-full bg-canvas-inset rounded-full h-1.5 mt-2">
      <div
        className={`h-1.5 rounded-full ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function fmt(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + " MB";
  return bytes + " B";
}

export default function Dashboard({ token }) {
  const [sys, setSys] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/system", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      setSys(await res.json());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (error) return <div className="p-6 text-danger-fg">{error}</div>;
  if (!sys) return <div className="p-6 text-fg-muted">Loading…</div>;

  const memPct = sys.memory.percentUsed;
  const loadNorm = Math.min(100, (sys.cpu.loadavg[0] / sys.cpu.cores) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">System Dashboard</h1>
          <p className="text-fg-muted text-sm mt-0.5">{sys.hostname} · {sys.platform}/{sys.arch}</p>
        </div>
        <button onClick={load} className="btn-ghost text-xs">↺ Refresh</button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="CPU Load"
          value={`${loadNorm.toFixed(0)}%`}
          sub={`${sys.cpu.cores} cores · load ${sys.cpu.loadavg[0].toFixed(2)}`}
          color={loadNorm > 80 ? "text-danger-fg" : "text-success-fg"}
        />
        <StatCard
          label="Memory"
          value={`${memPct}%`}
          sub={`${fmt(sys.memory.used)} / ${fmt(sys.memory.total)}`}
          color={memPct > 85 ? "text-danger-fg" : "text-fg-DEFAULT"}
        />
        <StatCard
          label="Disk"
          value={sys.disk.used}
          sub={`of ${sys.disk.total} used (${sys.disk.percent})`}
        />
        <StatCard
          label="Uptime"
          value={`${Math.floor(sys.uptime / 3600)}h`}
          sub={`${Math.floor((sys.uptime % 3600) / 60)}m running`}
        />
      </div>

      {/* Progress bars */}
      <div className="card p-4 mb-6">
        <div className="mb-4">
          <div className="flex justify-between text-xs text-fg-muted mb-1">
            <span>CPU</span><span>{loadNorm.toFixed(0)}%</span>
          </div>
          <ProgressBar value={loadNorm} color={loadNorm > 80 ? "bg-danger-fg" : "bg-accent-emphasis"} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-fg-muted mb-1">
            <span>Memory</span><span>{memPct}%</span>
          </div>
          <ProgressBar value={memPct} color={memPct > 85 ? "bg-danger-fg" : "bg-success-emphasis"} />
        </div>
      </div>

      {/* AI Providers */}
      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3 text-fg-muted uppercase tracking-wider">AI Providers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["OpenAI", sys.env.hasOpenAI],
            ["Gemini", sys.env.hasGemini],
            ["OpenRouter", sys.env.hasOpenRouter],
            ["Ollama", sys.env.hasOllama || sys.ollama.running],
          ].map(([name, active]) => (
            <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded border ${
              active ? "border-success-emphasis/40 bg-success-emphasis/10 text-success-fg"
                     : "border-border-DEFAULT text-fg-subtle"
            }`}>
              <span className="text-xs">{active ? "●" : "○"}</span>
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ollama Models */}
      {sys.ollama.models.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3 text-fg-muted uppercase tracking-wider">Ollama Models</h2>
          <div className="flex flex-wrap gap-2">
            {sys.ollama.models.map((m) => (
              <span key={m} className="px-2 py-1 bg-canvas-inset border border-border-DEFAULT rounded text-xs text-fg-DEFAULT">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
