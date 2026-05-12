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
  value: unknown;
  getValue?: (results: Result[]) => boolean;
}

export interface Logic {
  type: "or" | "and";
  group: Node[];
}

export type Node = Logic | Item;

declare function logicMachine(logic: Logic): boolean;

export default logicMachine;
