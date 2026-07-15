import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/dashboard", icon: "⬡", label: "Dashboard" },
  { to: "/terminal", icon: "⌨", label: "Terminal" },
  { to: "/chat", icon: "◈", label: "AI Chat" },
  { to: "/files", icon: "◫", label: "Files" },
  { to: "/settings", icon: "◎", label: "Settings" },
];

export default function Layout({ children, onLogout }) {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-canvas-subtle border-r border-border-DEFAULT flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border-muted">
          <div className="text-accent-fg font-bold text-lg tracking-tight">DAVE</div>
          <div className="text-fg-subtle text-xs mt-0.5">DevBox v1.0.0</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active text-fg-DEFAULT" : ""}`
              }
            >
              <span className="w-5 text-center text-base leading-none">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-border-muted">
          <button onClick={onLogout} className="sidebar-item w-full text-danger-fg hover:text-danger-fg">
            <span className="w-5 text-center">⏻</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-canvas">{children}</main>
    </div>
  );
}
