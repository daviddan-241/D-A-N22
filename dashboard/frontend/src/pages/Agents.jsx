import { useState, useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const AGENTS = [
  { id: "coder", name: "Coder", icon: "◈", color: "#58a6ff", desc: "Writes complete, working code. Edits files directly. Auto-commits." },
  { id: "researcher", name: "Researcher", icon: "◉", color: "#a5d6ff", desc: "Researches topics, analyzes code, produces detailed reports." },
  { id: "planner", name: "Planner", icon: "◫", color: "#d2a8ff", desc: "Breaks tasks into steps. Identifies dependencies and risks." },
  { id: "reviewer", name: "Reviewer", icon: "◧", color: "#3fb950", desc: "Reviews code for bugs, security issues, and performance." },
  { id: "hacker", name: "Security", icon: "◎", color: "#f85149", desc: "Security research, vulnerability analysis, system hardening." },
];

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...opts });

export default function Agents({ token }) {
  const [activeAgent, setActiveAgent] = useState(null);
  const [connected, setConnected] = useState(false);
  const [useTor, setUseTor] = useState(false);
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);
  const fitRef = useRef(null);

  // Memory
  const [memory, setMemory] = useState("");
  const [memNote, setMemNote] = useState("");
  const [memSaved, setMemSaved] = useState(false);

  useEffect(() => {
    API("/memory", token).then(r => r.json()).then(d => setMemory(d.content || "")).catch(() => {});
  }, []);

  function startAgent(agentId) {
    if (wsRef.current) wsRef.current.close();
    setActiveAgent(agentId);
    setConnected(false);

    // Init xterm
    if (!xtermRef.current) {
      const xterm = new XTerm({ theme: { background: "#0d1117", foreground: "#c9d1d9", cursor: "#58a6ff" }, fontSize: 13, fontFamily: "monospace", cursorBlink: true, scrollback: 5000 });
      const fit = new FitAddon();
      xterm.loadAddon(fit);
      if (termRef.current) {
        xterm.open(termRef.current);
        fit.fit();
      }
      xtermRef.current = xterm;
      fitRef.current = fit;
      window.addEventListener("resize", () => { try { fit.fit(); } catch (_) {} });
    } else {
      xtermRef.current.clear();
      if (termRef.current) { try { fitRef.current.fit(); } catch (_) {} }
    }

    const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${location.host}/ws/aider?token=${token}&agent=${agentId}${useTor ? "&tor=1" : ""}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "output") xtermRef.current?.write(m.data);
      if (m.type === "exit") xtermRef.current?.writeln("\r\n\x1b[33m[Session ended]\x1b[0m");
    };

    xtermRef.current.onData((d) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input", data: d }));
    });
  }

  function stopAgent() {
    wsRef.current?.close();
    setActiveAgent(null);
    setConnected(false);
  }

  async function saveMemory() {
    if (!memNote.trim()) return;
    await API("/memory", token, { method: "POST", body: JSON.stringify({ content: memNote, append: true }) });
    const d = await API("/memory", token).then(r => r.json());
    setMemory(d.content);
    setMemNote("");
    setMemSaved(true);
    setTimeout(() => setMemSaved(false), 2000);
  }

  const card = (agent, active) => ({
    background: active ? `rgba(${agent.color === "#58a6ff" ? "88,166,255" : agent.color === "#f85149" ? "248,81,73" : "63,185,80"},.1)` : "#161b22",
    border: `1px solid ${active ? agent.color : "#30363d"}`,
    borderRadius: 10, padding: "14px 16px", cursor: "pointer",
    transition: "all .15s",
  });

  return (
    <div style={{ padding: 24, height: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ color: "#58a6ff", margin: 0 }}>AI Agents</h1>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8b949e", cursor: "pointer" }}>
          <input type="checkbox" checked={useTor} onChange={e => setUseTor(e.target.checked)} />
          Anonymous via Tor
        </label>
        {activeAgent && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: connected ? "#3fb950" : "#f85149", fontSize: 12 }}>● {connected ? "Live" : "Connecting"}</span>
            <button onClick={stopAgent} style={{ padding: "6px 14px", background: "#21262d", border: "1px solid #f85149", color: "#f85149", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Stop</button>
          </span>
        )}
      </div>

      {/* Agent cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {AGENTS.map(agent => (
          <div key={agent.id} style={card(agent, activeAgent === agent.id)} onClick={() => startAgent(agent.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: agent.color, fontSize: 18 }}>{agent.icon}</span>
              <span style={{ fontWeight: 600, color: activeAgent === agent.id ? agent.color : "#c9d1d9", fontSize: 14 }}>{agent.name}</span>
            </div>
            <p style={{ color: "#8b949e", fontSize: 12, margin: 0 }}>{agent.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", gap: 16, minHeight: 0 }}>
        {/* Terminal */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!activeAgent ? (
            <div style={{ flex: 1, background: "#161b22", border: "1px solid #30363d", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 40 }}>◉</span>
              <p style={{ color: "#8b949e", textAlign: "center", fontSize: 14 }}>Click an agent above to start an AI coding session.<br />The agent has full access to your workspace files.</p>
            </div>
          ) : (
            <div style={{ flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 14px", background: "#161b22", borderBottom: "1px solid #30363d", fontSize: 12, color: "#8b949e", display: "flex", gap: 16 }}>
                <span>Agent: <strong style={{ color: AGENTS.find(a => a.id === activeAgent)?.color }}>{activeAgent}</strong></span>
                <span>Model: gemini-2.0-flash (free)</span>
                {useTor && <span style={{ color: "#7ee787" }}>🧅 Tor active</span>}
              </div>
              <div ref={termRef} style={{ flex: 1 }} />
            </div>
          )}
        </div>

        {/* Memory panel */}
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 600, color: "#d2a8ff", marginBottom: 10, fontSize: 13 }}>◈ Agent Memory</div>
            <textarea
              style={{ flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontFamily: "monospace", fontSize: 11, padding: 8, resize: "none", minHeight: 120 }}
              value={memory} onChange={e => setMemory(e.target.value)}
              placeholder="Memory is loaded into every agent session automatically..."
            />
            <div style={{ marginTop: 10 }}>
              <textarea
                style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontFamily: "monospace", fontSize: 11, padding: 8, resize: "none", height: 60, boxSizing: "border-box" }}
                value={memNote} onChange={e => setMemNote(e.target.value)}
                placeholder="Add a note to memory..."
              />
              <button onClick={saveMemory} style={{ width: "100%", padding: "7px", background: "#238636", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12, marginTop: 6 }}>
                {memSaved ? "✓ Saved!" : "Append to Memory"}
              </button>
            </div>
          </div>

          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 600, color: "#8b949e", marginBottom: 8, fontSize: 12 }}>Quick Commands</div>
            {[
              ["/ask how does this work", "Ask question"],
              ["/add src/", "Add files"],
              ["/undo", "Undo last change"],
              ["/commit", "Commit changes"],
              ["/exit\n", "Exit agent"],
            ].map(([cmd, label]) => (
              <div key={cmd} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <code style={{ color: "#79c0ff", fontSize: 11 }}>{cmd.replace("\n", "")}</code>
                <button onClick={() => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: "input", data: cmd }))}
                  style={{ padding: "3px 8px", background: "#21262d", border: "1px solid #30363d", color: "#8b949e", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>
                  {label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
