import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
// For GitHub Pages: if repo is "tasks", base will be "/tasks/"
// For custom domain or root: set base to "/"
const base = process.env.GITHUB_PAGES === 'true' ? '/tasks/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
