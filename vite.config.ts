import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { localApiPlugin } from "./vite-plugin-local-api";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET ?? "http://localhost:4001";
  const useLocalApi = env.VITE_LOCAL_API !== "false";

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@/types": path.resolve(__dirname, "src/types/index.ts"),
        "@/engines": path.resolve(__dirname, "src/engines/index.ts"),
        "@/providers": path.resolve(__dirname, "src/providers/index.ts"),
        "@/services": path.resolve(__dirname, "src/services/index.ts"),
      },
    },
    plugins: [react(), ...(useLocalApi ? [localApiPlugin()] : [])],
    server: {
      port: 5174,
      strictPort: false,
      proxy: useLocalApi
        ? undefined
        : {
            "/api": {
              target: apiTarget,
              changeOrigin: true,
              secure: false,
            },
          },
    },
    preview: {
      port: 4173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "dist/public",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks(id) {
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
              return "react";
            }
            if (id.includes("node_modules/framer-motion")) {
              return "framer";
            }
            if (id.includes("node_modules/firebase")) {
              return "firebase";
            }
            return undefined;
          },
        },
      },
    },
  };
});
