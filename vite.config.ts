import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev me CORS se bachne ke liye: /api/* → backend (VITE_PROXY_TARGET)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: env.VITE_PROXY_TARGET
        ? { "/api": { target: env.VITE_PROXY_TARGET, changeOrigin: true, secure: true } }
        : undefined,
    },
  };
});
