import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [
    react(),
    {
      name: "portable-inline-favicon",
      transformIndexHtml(html) {
        const icon = readFileSync(
          new URL("./public/favicon.svg", import.meta.url),
        ).toString("base64");
        return html.replace(
          'href="./favicon.svg"',
          `href="data:image/svg+xml;base64,${icon}"`,
        );
      },
    },
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  build: {
    outDir: "portable",
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
});
