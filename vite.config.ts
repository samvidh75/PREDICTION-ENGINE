import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET ?? "http://localhost:4001";

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
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: false,
      proxy: {
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
            if (id.includes("node_modules/@xenova/transformers") || id.includes("onnxruntime")) {
              return "transformers";
            }
            return undefined;
          },
        },
      },
    },
  };
});
