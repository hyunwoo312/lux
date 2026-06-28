import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function syncManifestVersion(): Plugin {
  return {
    name: "sync-manifest-version",
    apply: "build",
    closeBundle() {
      const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as {
        version: string;
      };
      const manifestPath = resolve(__dirname, "dist/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string };
      if (manifest.version !== pkg.version) {
        manifest.version = pkg.version;
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), syncManifestVersion()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, "index.html"),
        anilistCallback: resolve(__dirname, "src/anilist-callback.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "anilistCallback") return "anilist-callback.js";
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
