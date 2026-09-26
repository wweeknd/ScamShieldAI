import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend talks to the backend via the VITE_API_URL env var
// (defaults to http://localhost:8000 in src/api/client.js).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    // No source maps in production (keeps source private + smaller output).
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy vendors so the initial payload stays lean.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
