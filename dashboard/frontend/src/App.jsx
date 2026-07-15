import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Setup from "./pages/Setup";
import AiChat from "./pages/AiChat";
import Agents from "./pages/Agents";
import Terminal from "./pages/Terminal";
import Files from "./pages/Files";
import Network from "./pages/Network";
import Settings from "./pages/Settings";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("dave_token") || "");

  useEffect(() => {
    if (token) localStorage.setItem("dave_token", token);
    else localStorage.removeItem("dave_token");
  }, [token]);

  if (!token) return <Login onLogin={setToken} />;

  return (
    <BrowserRouter>
      <Layout token={token} onLogout={() => setToken("")}>
        <Routes>
          <Route path="/" element={<Dashboard token={token} />} />
          <Route path="/setup" element={<Setup token={token} />} />
          <Route path="/chat" element={<AiChat token={token} />} />
          <Route path="/agents" element={<Agents token={token} />} />
          <Route path="/terminal" element={<Terminal token={token} />} />
          <Route path="/files" element={<Files token={token} />} />
          <Route path="/network" element={<Network token={token} />} />
          <Route path="/settings" element={<Settings token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
