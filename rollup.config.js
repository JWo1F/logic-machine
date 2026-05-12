import esbuild from "rollup-plugin-esbuild";
import ts from "@rollup/plugin-typescript";

/** @type import('rollup').RollupOptions */
export default {
  input: "src/index.ts",
  output: {
    file: "build/bundle.js",
    format: "cjs",
    sourcemap: true,
    generatedCode: "es2015",
  },
  external: [],
  plugins: [
    ts({ noForceEmit: true }),
    esbuild({
      minify: false,
      target: "es2015", // default, or 'es20XX', 'esnext'
    }),
  ],
};
