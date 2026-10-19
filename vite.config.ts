import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// Modified by the lenerdz/zmk-studio fork: the RPC client is vendored (see
// src/vendor/zmk-studio-ts-client/README.md), so the package name resolves to it.
// tsconfig.json has the same mapping for the type checker.
const vendoredClient = fileURLToPath(
  new URL("./src/vendor/zmk-studio-ts-client", import.meta.url),
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@zmkfirmware\/zmk-studio-ts-client$/,
        replacement: `${vendoredClient}/index.ts`,
      },
      {
        find: /^@zmkfirmware\/zmk-studio-ts-client\/(.*)$/,
        replacement: `${vendoredClient}/$1`,
      },
    ],
  },
  // Added by the lenerdz/zmk-studio fork: "npm test". The tests are plain
  // TypeScript with no DOM: the demo keyboard and the protocol code run in Node.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  // Modified by the lenerdz/zmk-studio fork: GitHub Pages serves the app from a
  // subdirectory, so the workflow sets VITE_BASE_PATH (e.g. "/zmk-studio/").
  base: process.env.VITE_BASE_PATH ?? "/",
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    strictPort: true,
  },
  // to access the Tauri environment variables set by the CLI with information about the current target
  envPrefix: [
    "VITE_",
    "TAURI_PLATFORM",
    "TAURI_ARCH",
    "TAURI_FAMILY",
    "TAURI_PLATFORM_VERSION",
    "TAURI_PLATFORM_TYPE",
    "TAURI_DEBUG",
  ],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // include download page
    rollupOptions: {
      input: {
        main: "./index.html",
        download: "./download.html",
      },
    }
  },
});
