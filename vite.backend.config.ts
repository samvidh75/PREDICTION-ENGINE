import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "src/backend/startServer.ts",
    target: "node20",
    outDir: "dist/backend",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: "startServer.js",
        format: "es",
      },
      external: [
        "@fastify/compress",
        "@fastify/cookie",
        "@fastify/cors",
        "@fastify/helmet",
        "@fastify/websocket",
        "better-sqlite3",
        "dotenv",
        "fastify",
        "fastify-plugin",
        "pg",
        "redis",
      ],
    },
  },
});
