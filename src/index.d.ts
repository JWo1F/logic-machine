export type Operator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "regexp"
  | "includes"
  | "excludes";

export interface Result {
  value: unknown;
  result: boolean;
}

export interface Item {
  operator: Operator;
  expected: unknown;
  /** Literal value to test. If omitted, the runtime input is used (optionally via `field`). */
  value?: unknown;
  /** Field name on the runtime input object whose value to test against. */
  field?: string;
  /** Custom combiner for when the resolved value is an array. */
  getValue?: (results: Result[]) => boolean;
}

export interface Logic {
  type: "or" | "and";
  group: Node[];
}

export type Node = Logic | Item;

/**
 * Evaluate a logic tree. The tree may be a JSON object, a single leaf Item,
 * or a string in the DSL form (parsed via `parse` automatically).
 *
 * Resolution of an Item's tested value, in priority order:
 *   1. `item.value` if set
 *   2. `input[item.field]` if `item.field` is set
 *   3. `input` itself
 *
 *     logicMachine("eq(10)", 10)
 *     logicMachine('name:eq("Alex") or age:eq(18)', { name: "John", age: 18 })
 */
declare function logicMachine(logic: Logic | Item | string, input?: unknown): boolean;

/** Parse a DSL string into a Logic/Item tree. */
export function parse(input: string): Logic | Item;

/** Convert a Logic/Item tree into its DSL string form. */
export function stringify(node: Logic | Item): string;

export default logicMachine;
