import { useState, useEffect } from "react";

const API = (path, token, opts = {}) =>
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...opts });

export default function Files({ token }) {
  const [path, setPath] = useState("");
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [editing, setEditing] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { browse(""); }, []);

  async function browse(p) {
    setErr("");
    const r = await API(`/files?path=${encodeURIComponent(p)}`, token);
    const d = await r.json();
    if (d.error) { setErr(d.error); return; }
    setItems(d.items || []);
    setCurrentPath(d.path || "");
    setPath(p);
  }

  async function openFile(item) {
    if (item.isDir) { browse(item.path); return; }
    const r = await API(`/files/read?path=${encodeURIComponent(item.path)}`, token);
    const d = await r.json();
    setEditing({ path: item.path, name: item.name });
    setEditContent(d.content || "");
  }

  async function save() {
    setSaving(true);
    await API("/files/write", token, { method: "POST", body: JSON.stringify({ path: editing.path, content: editContent }) });
    setSaving(false);
  }

  const isText = (name) => /\.(js|jsx|ts|tsx|py|sh|md|txt|json|yaml|yml|env|conf|cfg|html|css|gitignore|toml|ini|log)$/i.test(name);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace" }}>
      {/* File tree */}
      <div style={{ width: 260, background: "#161b22", borderRight: "1px solid #30363d", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #30363d", fontSize: 13, fontWeight: 600, color: "#c9d1d9" }}>Files</div>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid #30363d", display: "flex", gap: 6 }}>
          {[["", "workspace"], ["dave", "devbox"], ["home", "home"]].map(([p, label]) => (
            <button key={p} onClick={() => browse(p)} style={{ padding: "4px 8px", background: path === p ? "#1f6feb" : "#21262d", border: "none", borderRadius: 5, color: "#c9d1d9", cursor: "pointer", fontSize: 11 }}>
              {label}
            </button>
          ))}
        </div>
        {currentPath && (
          <div style={{ padding: "6px 14px", fontSize: 11, color: "#8b949e", borderBottom: "1px solid #21262d", wordBreak: "break-all" }}>
            {currentPath}
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {err && <div style={{ color: "#f85149", padding: "8px 14px", fontSize: 12 }}>{err}</div>}
          {items.map(item => (
            <div key={item.path} onClick={() => openFile(item)} style={{ padding: "7px 14px", cursor: "pointer", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: 8, background: editing?.path === item.path ? "#1f6feb22" : "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = "#21262d"}
              onMouseLeave={e => e.currentTarget.style.background = editing?.path === item.path ? "#1f6feb22" : "transparent"}>
              <span style={{ fontSize: 13 }}>{item.isDir ? "📁" : "📄"}</span>
              <span style={{ fontSize: 12, color: item.isDir ? "#58a6ff" : "#c9d1d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0d1117" }}>
        {editing ? (
          <>
            <div style={{ padding: "10px 16px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#c9d1d9", fontSize: 13 }}>{editing.name}</span>
              <span style={{ color: "#8b949e", fontSize: 11, wordBreak: "break-all" }}>{editing.path}</span>
              <button onClick={save} disabled={saving} style={{ marginLeft: "auto", padding: "6px 14px", background: "#238636", border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", fontSize: 12 }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            {isText(editing.name) ? (
              <textarea style={{ flex: 1, padding: 16, background: "#0d1117", border: "none", color: "#c9d1d9", fontFamily: '"Cascadia Code","Fira Code",monospace', fontSize: 13, resize: "none", lineHeight: 1.6, outline: "none" }}
                value={editContent} onChange={e => setEditContent(e.target.value)} spellCheck={false} />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e" }}>
                Binary file — cannot display
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#8b949e" }}>
            <span style={{ fontSize: 40 }}>◫</span>
            <p>Click a file to view or edit it</p>
          </div>
        )}
      </div>
    </div>
  );
}
