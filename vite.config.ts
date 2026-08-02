import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { localApiPlugin } from "./vite-plugin-local-api";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // loadEnv only exposes vars to import.meta.env; the Vercel serverless
  // handlers under api/*.ts (run in dev via vite-plugin-local-api's
  // ssrLoadModule) read process.env directly, same as they do on Vercel —
  // so mirror unprefixed vars (EODHD_KEY, UPSTASH_*, etc.) into process.env
  // here, without clobbering anything already set in the real environment.
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env) && value !== undefined) process.env[key] = value;
  }
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
      host: true,
      allowedHosts: ["stockstory-ph.com", "www.stockstory-ph.com"],
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
      minify: "esbuild",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks(id) {
            // React core
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
              return "react";
            }
            // React Router
            if (id.includes("node_modules/react-router")) {
              return "react-router";
            }
            // React Query (data fetching)
            if (id.includes("node_modules/@tanstack/react-query")) {
              return "react-query";
            }
            // Animation library
            if (id.includes("node_modules/framer-motion")) {
              return "framer";
            }
            // Firebase (heavy, load only when needed)
            if (id.includes("node_modules/firebase")) {
              return "firebase";
            }
            // Charting libraries (lazy loaded for stock pages)
            if (id.includes("node_modules/apexcharts") ||
                id.includes("node_modules/react-apexcharts") ||
                id.includes("node_modules/recharts") ||
                id.includes("node_modules/lightweight-charts")) {
              return "charts";
            }
            // UI Icons
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }
            return undefined;
          },
        },
      },
    },
  };
});
