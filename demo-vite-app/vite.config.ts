import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Change this if your GitHub repo name is different
const repoName = "persistx";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [tailwindcss(), react()],

    // ✅ GitHub Pages base path
    base: isProd ? `/${repoName}/` : "/",

    // ✅ WSL2 dev server reliability
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      hmr: {
        // For WSL2 + browser on Windows
        clientPort: 3000
      }
    },

    // Optional but nice: ensures clean build output
    build: {
      outDir: "dist",
      emptyOutDir: true
    }
  };
});
