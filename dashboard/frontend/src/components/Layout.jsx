import { NavLink } from "react-router-dom";
import { useState } from "react";

const NAV = [
  { to: "/", icon: "⬡", label: "Dashboard" },
  { to: "/setup", icon: "⚙", label: "Setup" },
  { to: "/chat", icon: "◈", label: "AI Chat" },
  { to: "/agents", icon: "◉", label: "Agents" },
  { to: "/terminal", icon: "▸", label: "Terminal" },
  { to: "/files", icon: "◫", label: "Files" },
  { to: "/network", icon: "◎", label: "Network / Tor" },
  { to: "/settings", icon: "◧", label: "Settings" },
];

export default function Layout({ children, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "monospace" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 52 : 200,
        minWidth: collapsed ? 52 : 200,
        background: "#161b22",
        borderRight: "1px solid #30363d",
        display: "flex",
        flexDirection: "column",
        transition: "width .2s",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "16px 12px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#58a6ff", fontSize: 18, fontWeight: 700, cursor: "pointer" }} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "D" : "DAVE"}
          </span>
          {!collapsed && <span style={{ color: "#8b949e", fontSize: 11 }}>DevBox</span>}
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 14px", color: isActive ? "#58a6ff" : "#8b949e",
                background: isActive ? "rgba(88,166,255,.08)" : "transparent",
                borderLeft: isActive ? "2px solid #58a6ff" : "2px solid transparent",
                textDecoration: "none", fontSize: 13, transition: "all .15s",
                whiteSpace: "nowrap", overflow: "hidden",
              })}>
              <span style={{ fontSize: 15, minWidth: 16, textAlign: "center" }}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        {/* Logout */}
        <div style={{ padding: "12px", borderTop: "1px solid #30363d" }}>
          <button onClick={onLogout} style={{
            width: "100%", padding: "8px", background: "transparent", border: "1px solid #30363d",
            color: "#8b949e", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex",
            alignItems: "center", gap: 8, justifyContent: collapsed ? "center" : "flex-start",
          }}>
            <span>⏏</span>{!collapsed && "Logout"}
          </button>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", maxHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
