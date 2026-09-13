import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Renderer build config. Electron loads this via file:// in production
// and http://localhost:5173 in dev (see electron/main.ts).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": "/src",
      "@ai": "/ai",
    },
  },
});
