import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: /randomSong/ ; local dev uses /
export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : "/randomSong/",
  plugins: [react()],
  server: {
    port: 8888,
  },
}));
