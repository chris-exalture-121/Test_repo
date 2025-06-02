import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    environment: "jsdom",
    env: {
      CANVA_ENV: "dev",
      CACHE_JWT: "false",
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@functions": path.resolve(__dirname, "./src/functions"),
      "@libs": path.resolve(__dirname, "./src/libs"),
    },
  },
});
