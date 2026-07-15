import { useEffect, useRef, useState } from "react";

export default function Terminal({ token }) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const termRef = useRef(null);
  const [status, setStatus] = useState("disconnected");

  useEffect(() => {
    let term, fitAddon, ws;

    const init = async () => {
      // Dynamically import xterm
      const { Terminal: XTerm } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      await import("xterm/css/xterm.css");

      term = new XTerm({
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#58a6ff",
          selectionBackground: "#264f78",
          black: "#0d1117",
          brightBlack: "#6e7681",
          red: "#f85149",
          brightRed: "#f85149",
          green: "#3fb950",
          brightGreen: "#3fb950",
          yellow: "#d29922",
          brightYellow: "#d29922",
          blue: "#58a6ff",
          brightBlue: "#58a6ff",
          magenta: "#bc8cff",
          brightMagenta: "#bc8cff",
          cyan: "#39c5cf",
          brightCyan: "#39c5cf",
          white: "#c9d1d9",
          brightWhite: "#ffffff",
        },
        fontFamily: "JetBrains Mono, Fira Code, monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;

      // WebSocket
      const wsProto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${wsProto}://${location.host}/ws/terminal?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        term.write("\r\n\x1b[32m Connected to DAVE DevBox terminal \x1b[0m\r\n\r\n");
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") term.write(msg.data);
      };

      ws.onerror = () => {
        setStatus("error");
        term.write("\r\n\x1b[31m Terminal error — check if node-pty is installed \x1b[0m\r\n");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        term.write("\r\n\x1b[33m Connection closed \x1b[0m\r\n");
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Resize
      const ro = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      });
      ro.observe(containerRef.current);
    };

    init().catch(console.error);

    return () => {
      ws?.close();
      term?.dispose();
    };
  }, [token]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-DEFAULT">
        <div>
          <h1 className="font-bold">Terminal</h1>
          <p className="text-fg-subtle text-xs">Interactive shell</p>
        </div>
        <span className={`text-xs flex items-center gap-1.5 ${
          status === "connected" ? "text-success-fg" : 
          status === "error" ? "text-danger-fg" : "text-fg-muted"
        }`}>
          <span>●</span> {status}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 p-2" style={{ minHeight: 0 }} />
    </div>
  );
}
