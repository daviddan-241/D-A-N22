import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Terminal from "./pages/Terminal";
import AiChat from "./pages/AiChat";
import Files from "./pages/Files";
import Settings from "./pages/Settings";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("dave_token"));

  const handleLogin = (tok) => {
    localStorage.setItem("dave_token", tok);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem("dave_token");
    setToken(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <Layout onLogout={handleLogout} token={token}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard token={token} />} />
        <Route path="/terminal" element={<Terminal token={token} />} />
        <Route path="/chat" element={<AiChat token={token} />} />
        <Route path="/files" element={<Files token={token} />} />
        <Route path="/settings" element={<Settings token={token} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
