// Entry for the IIFE/browser bundle. Re-exports the default so the global
// `LogicMachine` becomes the function itself (with `parse` and `stringify`
// attached as properties), not an exports object.
export { default } from "./index.js";
