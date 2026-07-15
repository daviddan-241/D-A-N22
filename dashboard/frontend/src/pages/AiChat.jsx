import { useState, useRef, useEffect } from "react";

export default function AiChat({ token }) {
  const [messages, setMessages] = useState([
    { role: "system", content: "You are a helpful AI coding assistant in DAVE DevBox. Help the user with coding, debugging, and development tasks." },
    { role: "assistant", content: "Hi! I'm your AI coding assistant. Ask me anything — code review, debugging, architecture, or just chat." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newMessages.filter((m) => m.role !== "system").concat(
          [{ role: "system", content: messages[0].content }]
        ) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const displayed = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-DEFAULT">
        <div>
          <h1 className="font-bold">AI Chat</h1>
          <p className="text-fg-subtle text-xs">Powered by your configured AI provider</p>
        </div>
        <button
          onClick={() => setMessages([messages[0], messages[1]])}
          className="btn-ghost text-xs"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {displayed.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent-emphasis text-fg-on_emphasis"
                  : "bg-canvas-subtle border border-border-DEFAULT text-fg-DEFAULT"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-canvas-subtle border border-border-DEFAULT rounded-lg px-4 py-2.5 text-sm text-fg-muted">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center text-danger-fg text-sm">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border-DEFAULT">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            className="input resize-none"
            rows={2}
            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="btn-primary px-4 self-end"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
