export default function Settings() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Settings</h1>
      <p className="text-fg-muted text-sm mb-6">Configure your DAVE DevBox environment.</p>

      <div className="space-y-6">
        <Section title="Environment Variables">
          <p className="text-fg-muted text-sm mb-3">
            Edit the <code className="bg-canvas-subtle px-1 rounded text-xs">.env</code> file in your DevBox root to configure API keys and settings.
          </p>
          <pre className="bg-canvas-inset border border-border-DEFAULT rounded p-3 text-xs text-fg-DEFAULT overflow-x-auto">{`OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
OLLAMA_URL=http://localhost:11434
DASHBOARD_PORT=3000
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=your-password`}</pre>
        </Section>

        <Section title="Quick Commands">
          <div className="space-y-2">
            {[
              ["dave-aider", "Start AI coding assistant (terminal)"],
              ["dave-ssh", "Show SSH connection details"],
              ["dave-status", "Show system status"],
              ["ollama pull llama3", "Download a local AI model"],
              ["ollama list", "List downloaded models"],
              ["tmux new -s dave", "Start a persistent terminal session"],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex items-start gap-3">
                <code className="bg-canvas-inset border border-border-DEFAULT rounded px-2 py-0.5 text-xs text-accent-fg flex-shrink-0">
                  {cmd}
                </code>
                <span className="text-fg-muted text-xs pt-0.5">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Documentation">
          <div className="space-y-2 text-sm">
            {[
              ["README.md", "Project overview and quick start"],
              ["INSTALL.md", "Detailed installation guide"],
              ["TROUBLESHOOTING.md", "Common issues and fixes"],
              [".env.example", "All available environment variables"],
            ].map(([file, desc]) => (
              <div key={file} className="flex items-center gap-3">
                <code className="text-xs text-accent-fg">{file}</code>
                <span className="text-fg-muted text-xs">— {desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="About">
          <div className="text-sm text-fg-muted space-y-1">
            <p><strong className="text-fg-DEFAULT">DAVE DevBox</strong> v1.0.0</p>
            <p>Self-hosted AI development environment</p>
            <p>Free-tier friendly · iPhone a-Shell compatible · GitHub Codespaces ready</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}
