/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // GitHub-inspired dark theme
        canvas: {
          DEFAULT: "#0d1117",
          subtle: "#161b22",
          inset: "#010409",
        },
        border: {
          DEFAULT: "#30363d",
          muted: "#21262d",
        },
        fg: {
          DEFAULT: "#c9d1d9",
          muted: "#8b949e",
          subtle: "#6e7681",
          on_emphasis: "#ffffff",
        },
        accent: {
          fg: "#58a6ff",
          emphasis: "#1f6feb",
        },
        success: {
          fg: "#3fb950",
          emphasis: "#238636",
        },
        danger: {
          fg: "#f85149",
          emphasis: "#da3633",
        },
        warning: {
          fg: "#d29922",
          emphasis: "#9e6a03",
        },
        attention: {
          fg: "#d29922",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
    },
  },
  plugins: [],
};
