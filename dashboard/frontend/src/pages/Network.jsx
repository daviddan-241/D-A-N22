import { useState, useEffect } from "react";

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...opts });

export default function Network({ token }) {
  const [torStatus, setTorStatus] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [fetchUrl, setFetchUrl] = useState("https://api.ipify.org");
  const [fetchResult, setFetchResult] = useState("");
  const [fetching, setFetching] = useState(false);
  const [useTor, setUseTor] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [execCmd, setExecCmd] = useState("curl -s https://api.ipify.org");
  const [execResult, setExecResult] = useState("");
  const [execRunning, setExecRunning] = useState(false);

  function loadTor() {
    API("/tor/status", token).then(r => r.json()).then(setTorStatus).catch(() => {});
  }

  useEffect(() => { loadTor(); const t = setInterval(loadTor, 30000); return () => clearInterval(t); }, []);

  async function rotateCircuit() {
    setRotating(true);
    const d = await API("/tor/newcircuit", token, { method: "POST" }).then(r => r.json()).catch(e => ({ error: e.message }));
    setTorStatus(t => ({ ...t, torIp: d.newIp }));
    setRotating(false);
  }

  async function doFetch() {
    setFetching(true);
    setFetchResult("Fetching...");
    const d = await API("/web/fetch", token, { method: "POST", body: JSON.stringify({ url: fetchUrl, useTor }) }).then(r => r.json()).catch(e => ({ error: e.message }));
    setFetchResult(d.error ? "Error: " + d.error : d.content?.slice(0, 5000) || "(empty)");
    setFetching(false);
  }

  async function doSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    const d = await API("/web/search", token, { method: "POST", body: JSON.stringify({ query: searchQuery, useTor }) }).then(r => r.json()).catch(e => ({ error: e.message }));
    if (d.results) setSearchResults(d.results);
    else setSearchResults([{ title: "Error", snippet: d.error }]);
    setSearching(false);
  }

  async function runExec() {
    setExecRunning(true);
    setExecResult("Running...");
    const d = await API("/exec", token, { method: "POST", body: JSON.stringify({ command: execCmd, useTor, timeout: 20000 }) }).then(r => r.json()).catch(e => ({ error: e.message }));
    setExecResult((d.stdout || "") + (d.stderr ? "\n[stderr]\n" + d.stderr : "") || d.error || "(no output)");
    setExecRunning(false);
  }

  const panel = { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 18, marginBottom: 20 };
  const input = { width: "100%", padding: "9px 12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" };
  const btn = (color = "#238636") => ({ padding: "9px 18px", background: color, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 });
  const pre = { background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 12, color: "#79c0ff", maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", marginTop: 10 };

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      <h1 style={{ color: "#58a6ff", marginTop: 0 }}>Network / Tor</h1>

      {/* Tor status */}
      <div style={panel}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: torStatus?.running ? "#3fb950" : "#f85149", marginBottom: 6 }}>
              {torStatus?.running ? "🧅 Tor Active" : "⚠ Tor Not Running"}
            </div>
            {torStatus && (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#8b949e", fontSize: 11 }}>TOR EXIT IP</div>
                  <div style={{ color: "#79c0ff", fontFamily: "monospace", fontSize: 14 }}>{torStatus.torIp || "–"}</div>
                </div>
                <div>
                  <div style={{ color: "#8b949e", fontSize: 11 }}>REAL IP</div>
                  <div style={{ color: "#f85149", fontFamily: "monospace", fontSize: 14 }}>{torStatus.realIp || "–"}</div>
                </div>
                <div>
                  <div style={{ color: "#8b949e", fontSize: 11 }}>ANONYMOUS</div>
                  <div style={{ color: torStatus.anonymous ? "#3fb950" : "#f85149", fontSize: 14, fontWeight: 700 }}>
                    {torStatus.anonymous ? "YES ✓" : "NO ✗"}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btn("#1f6feb")} onClick={loadTor}>Refresh</button>
            <button style={btn()} disabled={rotating} onClick={rotateCircuit}>
              {rotating ? "Rotating..." : "🔄 New Circuit"}
            </button>
          </div>
        </div>
      </div>

      {/* Tor toggle */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#c9d1d9" }}>
          <input type="checkbox" checked={useTor} onChange={e => setUseTor(e.target.checked)} style={{ width: 16, height: 16 }} />
          Route through Tor (anonymous)
        </label>
        {useTor && <span style={{ color: "#3fb950", fontSize: 12 }}>🧅 All requests will go through Tor</span>}
      </div>

      {/* Anonymous search */}
      <div style={panel}>
        <div style={{ fontWeight: 600, color: "#c9d1d9", marginBottom: 12 }}>Anonymous Web Search (DuckDuckGo)</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...input, flex: 1 }} placeholder="Search anything..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()} />
          <button style={btn()} disabled={searching || !searchQuery} onClick={doSearch}>{searching ? "..." : "Search"}</button>
        </div>
        {searchResults.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {searchResults.map((r, i) => (
              <div key={i} style={{ borderBottom: "1px solid #21262d", paddingBottom: 10, marginBottom: 10 }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>{r.title || r.url}</a>
                <div style={{ color: "#8b949e", fontSize: 12, marginTop: 3 }}>{r.snippet}</div>
                <div style={{ color: "#3d444d", fontSize: 11, marginTop: 2, wordBreak: "break-all" }}>{r.url}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fetch URL */}
      <div style={panel}>
        <div style={{ fontWeight: 600, color: "#c9d1d9", marginBottom: 12 }}>Fetch URL</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input style={{ ...input, flex: 1 }} value={fetchUrl} onChange={e => setFetchUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && doFetch()} />
          <button style={btn()} disabled={fetching || !fetchUrl} onClick={doFetch}>{fetching ? "..." : "Fetch"}</button>
        </div>
        {fetchResult && <pre style={pre}>{fetchResult}</pre>}
      </div>

      {/* Run command (with Tor option) */}
      <div style={panel}>
        <div style={{ fontWeight: 600, color: "#c9d1d9", marginBottom: 12 }}>Run Command</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...input, flex: 1 }} value={execCmd} onChange={e => setExecCmd(e.target.value)} onKeyDown={e => e.key === "Enter" && runExec()}
            placeholder="curl -s https://..." />
          <button style={btn()} disabled={execRunning || !execCmd} onClick={runExec}>{execRunning ? "..." : "Run"}</button>
        </div>
        {execResult && <pre style={pre}>{execResult}</pre>}
      </div>
    </div>
  );
}
