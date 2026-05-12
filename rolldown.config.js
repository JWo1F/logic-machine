import { defineConfig } from "rolldown";
import { copyFileSync, mkdirSync } from "node:fs";

const copyTypes = {
  name: "copy-types",
  writeBundle() {
    mkdirSync("dist", { recursive: true });
    copyFileSync("src/index.d.ts", "dist/index.d.ts");
  },
};

export default defineConfig([
  // ESM for Node and modern bundlers.
  {
    input: "src/index.js",
    output: {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true,
    },
    plugins: [copyTypes],
  },
  // IIFE for direct <script> inclusion in browsers; exposes window.LogicMachine.
  {
    input: "src/iife.js",
    output: {
      file: "dist/logic-machine.global.js",
      format: "iife",
      name: "LogicMachine",
      sourcemap: true,
    },
  },
]);
