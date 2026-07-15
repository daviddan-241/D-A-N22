import { useState, useEffect } from "react";

export default function Files({ token }) {
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (p = "") => {
    setError("");
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPath(data.path);
      setEntries(data.entries);
      setSelected(null);
      setContent("");
    } catch (err) {
      setError(err.message);
    }
  };

  const openFile = async (entry) => {
    if (entry.type === "dir") return load(entry.path);
    setError("");
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(entry.path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(entry);
      setContent(data.content);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveFile = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: selected.path, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { load(""); }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border-DEFAULT">
        <h1 className="font-bold">File Browser</h1>
        <p className="text-fg-subtle text-xs">workspace/{path || ""}</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-56 flex-shrink-0 border-r border-border-DEFAULT overflow-y-auto p-2">
          {path && (
            <button
              onClick={() => load(path.includes("/") ? path.split("/").slice(0, -1).join("/") : "")}
              className="sidebar-item w-full text-xs mb-1"
            >
              ← ..
            </button>
          )}
          {entries.map((e) => (
            <button
              key={e.path}
              onClick={() => openFile(e)}
              className={`sidebar-item w-full text-left text-xs ${selected?.path === e.path ? "active" : ""}`}
            >
              <span>{e.type === "dir" ? "▶" : "·"}</span>
              <span className="truncate">{e.name}</span>
            </button>
          ))}
          {entries.length === 0 && (
            <p className="text-fg-subtle text-xs px-3 py-2">Empty directory</p>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-muted bg-canvas-subtle">
                <span className="text-xs text-fg-muted">{selected.path}</span>
                <button onClick={saveFile} disabled={saving} className="btn-primary text-xs py-1">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              <textarea
                className="flex-1 bg-canvas-inset text-fg-DEFAULT text-xs font-mono p-4 resize-none focus:outline-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-fg-subtle text-sm">
              Select a file to view or edit
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 text-danger-fg text-xs border-t border-border-muted">{error}</div>
      )}
    </div>
  );
}
