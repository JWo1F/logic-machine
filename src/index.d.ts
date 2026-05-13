export type BuiltinOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "regexp"
  | "includes"
  | "excludes";

// Built-in names give IDE autocomplete; the trailing `string & {}` keeps
// the type open for operators registered at runtime via `extend()`.
export type Operator = BuiltinOperator | (string & {});

export type Handler = (expected: unknown, value: unknown) => boolean;

export interface Item {
  operator: Operator;
  /** Operand for the operator. Omit for nullary ops (e.g. `isEven()`). */
  expected?: unknown;
  /** Literal value to test. If omitted, the runtime input is used (optionally via `field`). */
  value?: unknown;
  /** Field name on the runtime input object whose value to test against. */
  field?: string;
}

export interface Logic {
  type: "and" | "or";
  group: Node[];
}

export interface Quantifier {
  type: "every" | "some" | "none";
  /** Source array: a field name on the input, a literal array, or omitted to iterate the input itself. */
  over?: string | unknown[];
  /** Sub-tree applied to each element of the source. */
  match: Node;
}

export type Node = Logic | Quantifier | Item;

export interface ComputeOptions {
  /** Throw on unknown operator (default: true). When false, that leaf is `false`. */
  strict?: boolean;
}

/**
 * A logic-machine instance owns one parsed rule plus a private handler
 * registry that layers on top of the global one. Use the static methods
 * for one-off, strict operations.
 *
 *     LogicMachine.extend({ isEven: (_, v) => v % 2 === 0 });
 *
 *     const lm = new LogicMachine('every(scores, gte(60))');
 *     lm.compute({ scores: [80, 92, 67] });   // true
 *
 *     const private_ = new LogicMachine();
 *     private_.extend({ weird: (e, v) => v.startsWith(e) });
 *     private_.parse('weird("Mr.")').compute("Mr. X");   // true
 */
export default class LogicMachine {
  constructor(source?: string | Node);

  /** Register custom operators on this instance only. */
  extend(extensions: Record<string, Handler>): this;

  /** Parse a DSL string, validate against this instance's handlers, store as the rule. */
  parse(source: string): this;

  /** Serialize the loaded rule (or the given tree) to the DSL form. */
  stringify(tree?: Node): string;

  /** Evaluate the loaded rule against an input. */
  compute(input?: unknown, options?: ComputeOptions): boolean;

  /** The currently loaded rule, or null. */
  readonly tree: Node | null;

  /** Register custom operators globally. */
  static extend(extensions: Record<string, Handler>): void;

  /** Parse with strict validation against the global registry only. */
  static parse(source: string): Node;

  /** Serialize with strict validation against the global registry only. */
  static stringify(tree: Node): string;
}
