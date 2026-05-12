import { defineConfig } from "rolldown";
import { copyFileSync, mkdirSync } from "node:fs";

export default defineConfig({
  input: "src/index.js",
  output: [
    {
      file: "dist/index.cjs",
      format: "cjs",
      exports: "default",
      sourcemap: true,
    },
    {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    {
      name: "copy-types",
      writeBundle() {
        mkdirSync("dist", { recursive: true });
        copyFileSync("src/index.d.ts", "dist/index.d.ts");
      },
    },
  ],
});
