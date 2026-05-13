import builtins, { validateExtensions } from "./handlers.js";
import parse from "./parse.js";
import stringify from "./stringify.js";
import evaluate from "./evaluate.js";

// The global handler registry. Starts as a copy of the built-ins; the
// static `LogicMachine.extend` mutates it; every LogicMachine instance
// reads from it (and can layer instance-only handlers on top).
const globals = { ...builtins };

const NO_RULE = Symbol("no rule loaded");

export default class LogicMachine {
  #handlers = {};
  #tree = NO_RULE;

  /**
   * @param {string | object} [source] DSL string or JSON tree. When
   * omitted, the instance has no rule loaded — call `parse()` later.
   * When provided, the source is parsed syntactically without validating
   * operator names so you can register custom ops afterwards. Use
   * `instance.parse()` to validate.
   */
  constructor(source) {
    if (source === undefined) return;
    if (typeof source === "string") {
      this.#tree = parse(source);
      return;
    }
    if (source !== null && typeof source === "object") {
      this.#tree = source;
      return;
    }
    throw new TypeError("LogicMachine: source must be a string or a Node object");
  }

  /**
   * Register custom operators on this instance. Validates names, returns
   * `this` for chaining. Instance ops shadow built-ins and globals for
   * this machine only.
   */
  extend(extensions) {
    validateExtensions(extensions);
    Object.assign(this.#handlers, extensions);
    return this;
  }

  /**
   * Parse a DSL string, validate that every operator it references is
   * known (built-ins + globals + this instance's handlers), and store
   * the result as this instance's rule. Returns `this` for chaining.
   */
  parse(source) {
    const tree = parse(source);
    validateTree(tree, this.#resolveHandlers());
    this.#tree = tree;
    return this;
  }

  /**
   * Serialize this instance's rule to a DSL string, validating against
   * the instance's resolved handler set.
   */
  stringify(tree) {
    const target = tree === undefined ? this.#tree : tree;
    if (target === NO_RULE) {
      throw new Error("LogicMachine: no rule loaded — pass one to the constructor, parse(), or stringify(tree)");
    }
    return stringify(target, this.#resolveHandlers());
  }

  /**
   * Evaluate the loaded rule against an input.
   *
   * @param {unknown} [input]
   * @param {{ strict?: boolean }} [options] When strict (the default),
   * referencing an unregistered operator throws ReferenceError. When
   * false, it returns false for that leaf and continues.
   */
  compute(input, options = {}) {
    if (this.#tree === NO_RULE) {
      throw new Error("LogicMachine: no rule loaded — pass one to the constructor or call parse()");
    }
    const strict = options.strict !== false;
    return evaluate(this.#tree, input, this.#resolveHandlers(), strict);
  }

  /** The currently loaded rule tree, or `null` if none. Read-only. */
  get tree() {
    return this.#tree === NO_RULE ? null : this.#tree;
  }

  #resolveHandlers() {
    return { ...globals, ...this.#handlers };
  }

  /** Register a handler globally — visible to every LogicMachine. */
  static extend(extensions) {
    validateExtensions(extensions);
    Object.assign(globals, extensions);
  }

  /**
   * Parse with strict validation against the global registry only.
   * Throws on unknown operators.
   */
  static parse(source) {
    const tree = parse(source);
    validateTree(tree, globals);
    return tree;
  }

  /**
   * Stringify with strict validation against the global registry only.
   * Throws on unknown operators.
   */
  static stringify(tree) {
    return stringify(tree, globals);
  }

  /** @internal Test helper — wipes globals back to built-ins. Not part of the public API. */
  static _resetGlobals() {
    for (const k of Object.keys(globals)) delete globals[k];
    Object.assign(globals, builtins);
  }
}

function validateTree(node, handlers) {
  if (node === null || typeof node !== "object") return;
  if (node.type === "and" || node.type === "or") {
    if (!Array.isArray(node.group)) {
      throw new TypeError(`Logic node of type '${node.type}' requires a 'group' array`);
    }
    for (const child of node.group) validateTree(child, handlers);
    return;
  }
  if (node.type === "every" || node.type === "some" || node.type === "none") {
    if (node.match === undefined) {
      throw new TypeError(`Quantifier '${node.type}' requires a 'match' sub-tree`);
    }
    validateTree(node.match, handlers);
    return;
  }
  if (typeof node.operator !== "string") {
    throw new TypeError("Item must have a string 'operator'");
  }
  if (!Object.prototype.hasOwnProperty.call(handlers, node.operator)) {
    throw new ReferenceError(`Unknown operator '${node.operator}'`);
  }
}
