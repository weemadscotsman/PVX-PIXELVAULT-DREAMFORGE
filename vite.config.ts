import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';
import path, { dirname, resolve as pathResolve } from "path"; // Import dirname and resolve as pathResolve
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": pathResolve(__dirname, "client", "src"),
      "@shared": pathResolve(__dirname, "shared"),
      "@assets": pathResolve(__dirname, "attached_assets"),
    },
  },
  root: pathResolve(__dirname, "client"),
  build: {
    outDir: pathResolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
