import { useState, useRef, useEffect } from "react";

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...opts });

const AGENT_OPTS = [
  { id: "assistant", label: "Assistant", color: "#58a6ff" },
  { id: "coder", label: "Coder", color: "#79c0ff" },
  { id: "researcher", label: "Researcher", color: "#a5d6ff" },
  { id: "planner", label: "Planner", color: "#d2a8ff" },
  { id: "reviewer", label: "Reviewer", color: "#3fb950" },
  { id: "hacker", label: "Security", color: "#f85149" },
];

export default function AiChat({ token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState("assistant");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await API("/chat", token, { method: "POST", body: JSON.stringify({ messages: newMessages, agent }) });
      const d = await r.json();
      setMessages(m => [...m, { role: "assistant", content: d.reply || d.error, provider: d.provider, agentMode: d.agent }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "Error: " + e.message, error: true }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function searchWeb() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const d = await API("/web/search", token, { method: "POST", body: JSON.stringify({ query: searchQuery, useTor: true }) }).then(r => r.json()).catch(e => ({ error: e.message }));
    if (d.results) {
      setSearchResults(d.results);
      // Add results as context to chat
      const ctx = d.results.slice(0, 5).map((r, i) => `[${i+1}] ${r.title}\n${r.snippet}\n${r.url}`).join("\n\n");
      setInput(`I searched for "${searchQuery}" and found:\n\n${ctx}\n\nBased on these results, `);
    } else {
      setSearchResults([{ title: "Error", snippet: d.error }]);
    }
    setSearching(false);
    inputRef.current?.focus();
  }

  function renderMsg(content) {
    // Simple markdown-ish rendering
    return content
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;overflow-x:auto;font-size:12px;color:#e6edf3;margin:8px 0"><code>${code.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code style="background:#161b22;padding:2px 5px;border-radius:3px;color:#79c0ff;font-size:.9em">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, "<br>");
  }

  const agent_color = AGENT_OPTS.find(a => a.id === agent)?.color || "#58a6ff";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d1117" }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, color: "#58a6ff", fontSize: 16 }}>AI Chat</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AGENT_OPTS.map(a => (
            <button key={a.id} onClick={() => setAgent(a.id)} style={{
              padding: "5px 12px", borderRadius: 20, border: `1px solid ${agent === a.id ? a.color : "#30363d"}`,
              background: agent === a.id ? `rgba(255,255,255,.06)` : "transparent",
              color: agent === a.id ? a.color : "#8b949e", cursor: "pointer", fontSize: 12,
            }}>{a.label}</button>
          ))}
        </div>
        <button onClick={() => { setMessages([]); setSearchResults([]); }} style={{ marginLeft: "auto", padding: "5px 12px", background: "#21262d", border: "1px solid #30363d", color: "#8b949e", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
          Clear
        </button>
      </div>

      {/* Web search bar */}
      <div style={{ padding: "10px 20px", background: "#0d1117", borderBottom: "1px solid #21262d", display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: "7px 12px", background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", fontSize: 13, fontFamily: "monospace" }}
          placeholder="🧅 Anonymous web search (via Tor) — results added to chat..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchWeb()}
        />
        <button onClick={searchWeb} disabled={searching || !searchQuery} style={{ padding: "7px 14px", background: "#1f6feb", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12 }}>
          {searching ? "..." : "Search"}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#8b949e", paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>DAVE AI — {AGENT_OPTS.find(a=>a.id===agent)?.label} mode</p>
            <p style={{ fontSize: 13 }}>Ask anything. Use the search bar above to search the web anonymously and pull results into chat.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.role === "user" ? "#1f6feb" : "#21262d", border: `1px solid ${m.role === "user" ? "#58a6ff" : agent_color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: m.role === "user" ? "#fff" : agent_color }}>
              {m.role === "user" ? "U" : "AI"}
            </div>
            <div style={{ flex: 1 }}>
              {m.role === "assistant" && (
                <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>
                  {m.provider} · {m.agentMode}
                </div>
              )}
              <div style={{ background: m.role === "user" ? "#161b22" : "#0d1117", border: `1px solid ${m.error ? "#f85149" : m.role === "user" ? "#30363d" : "#21262d"}`, borderRadius: 8, padding: "10px 14px", color: m.error ? "#f85149" : "#c9d1d9", fontSize: 14, lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: renderMsg(m.content || "") }} />
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#21262d", border: `1px solid ${agent_color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: agent_color }}>AI</div>
            <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "10px 14px", color: "#8b949e", fontSize: 14 }}>
              <span style={{ animation: "pulse 1s infinite" }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 20px", background: "#161b22", borderTop: "1px solid #30363d" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <textarea
            ref={inputRef}
            style={{ flex: 1, padding: "10px 14px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", fontSize: 14, fontFamily: "monospace", resize: "none", height: 72, lineHeight: 1.5 }}
            placeholder={`Message ${AGENT_OPTS.find(a => a.id === agent)?.label}... (Enter to send, Shift+Enter for newline)`}
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{ padding: "10px 20px", background: loading ? "#21262d" : "#238636", border: "none", borderRadius: 8, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, alignSelf: "flex-end" }}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
