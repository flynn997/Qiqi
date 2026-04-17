// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',  // ← hard-force to root in dev & build (remove any /your-repo-name/)
  server: {
    port: 3000  // if you want to keep 3000 instead of default 5173
  }
})