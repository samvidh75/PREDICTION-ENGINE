import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET ?? "http://localhost:4001";

  return {
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
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks: {
            react: ["react", "react-dom"],
            framer: ["framer-motion"],
            firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          },
        },
      },
    },
  };
});
