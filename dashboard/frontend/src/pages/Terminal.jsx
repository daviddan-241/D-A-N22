import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Terminal({ token }) {
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);
  const fitRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const xterm = new XTerm({
      theme: { background: "#0d1117", foreground: "#c9d1d9", cursor: "#58a6ff", selectionBackground: "rgba(88,166,255,.3)" },
      fontSize: 14, fontFamily: '"Cascadia Code", "Fira Code", monospace',
      cursorBlink: true, scrollback: 10000, convertEol: true,
    });
    const fit = new FitAddon();
    xterm.loadAddon(fit);
    if (termRef.current) {
      xterm.open(termRef.current);
      setTimeout(() => fit.fit(), 50);
    }
    xtermRef.current = xterm;
    fitRef.current = fit;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws/terminal?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      xterm.writeln("\x1b[36m━━━  DAVE DevBox Terminal  ━━━\x1b[0m");
      xterm.writeln("Type \x1b[33mdave-ai\x1b[0m to start AI coding, \x1b[33mdave-status\x1b[0m for system status");
      xterm.writeln("");
    };
    ws.onclose = () => { setConnected(false); xterm.writeln("\r\n\x1b[31m[Connection closed]\x1b[0m"); };
    ws.onerror = () => setError("WebSocket error — make sure node-pty is installed");
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "output") xterm.write(m.data);
    };

    xterm.onData((d) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input", data: d }));
    });

    const handleResize = () => {
      try {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          const { cols, rows } = xterm;
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      } catch (_) {}
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      xterm.dispose();
    };
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0d1117" }}>
      <div style={{ padding: "10px 16px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 600, color: "#c9d1d9" }}>Terminal</span>
        <span style={{ color: connected ? "#3fb950" : "#f85149", fontSize: 12 }}>● {connected ? "Connected" : "Disconnected"}</span>
        {error && <span style={{ color: "#f85149", fontSize: 12 }}>{error}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[["dave-ai\r", "AI Coding"], ["dave-status\r", "Status"], ["dave-tor-check\r", "Tor Check"]].map(([cmd, label]) => (
            <button key={cmd} onClick={() => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: "input", data: cmd }))}
              style={{ padding: "5px 12px", background: "#21262d", border: "1px solid #30363d", color: "#8b949e", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={termRef} style={{ flex: 1, overflow: "hidden", padding: "4px 4px 0" }} />
    </div>
  );
}
