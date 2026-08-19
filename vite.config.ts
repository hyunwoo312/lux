import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function preloadBodyFont(): Plugin {
  return {
    name: "preload-body-font",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((name) =>
          /inter-latin-wght-normal-[^/]+\.woff2$/.test(name),
        );
        if (!font) return html;
        return {
          html,
          tags: [
            {
              tag: "link",
              attrs: {
                rel: "preload",
                as: "font",
                type: "font/woff2",
                href: `/${font}`,
                crossorigin: "",
              },
              injectTo: "head-prepend",
            },
          ],
        };
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadBodyFont()],
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
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "anilistCallback") return "anilist-callback.js";
          if (chunk.name === "background") return "background.js";
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    pool: "threads",
    maxWorkers: 8,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/vite-env.d.ts",
        "src/**/index.ts",
        "src/**/types.ts",
      ],
      thresholds: {
        statements: 63,
        branches: 52,
        functions: 58,
        lines: 65,
      },
    },
  },
});
