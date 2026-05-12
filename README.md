# logic-machine

A small, dependency-free evaluator for boolean expression trees. Describe a rule as JSON or in a tiny string DSL, get back `true` or `false`.

Works in Node.js (>=18) and modern browsers. Ships ESM for Node and an IIFE bundle for browsers, plus TypeScript declarations.

## Install

```sh
npm install logic-machine
```

Or from a CDN:

```html
<script src="https://unpkg.com/logic-machine/dist/logic-machine.global.js"></script>
<script>
  LogicMachine("eq(10)", 10); // true
</script>
```

## Quick start

```js
import logic from "logic-machine";

// JSON form with explicit values
logic({
  type: "or",
  group: [
    { operator: "gt", expected: 5, value: 7 },
    { operator: "eq", expected: 5, value: 3 },
  ],
}); // true

// String DSL evaluated against a runtime input
logic("eq(10) or lt(5)", 3); // true

// Named fields against an object input
logic('name:eq("Alex") and age:gte(18)', { name: "Alex", age: 20 }); // true
```

A logic tree is a `Logic` node (with `type` and `group`) or a leaf `Item` (with `operator` and `expected`, optionally `value` / `field`). Branches nest freely.

## Logic nodes

```ts
type Logic = {
  type: "and" | "or";
  group: Array<Logic | Item>;
};
```

* `type: "and"` — every member of `group` must evaluate to `true`.
* `type: "or"` — at least one member of `group` must evaluate to `true`.
* An empty `and` group is vacuously `true`. An empty `or` group is `false`.

## Items

```ts
type Item = {
  operator: Operator;
  expected: unknown;
  value?: unknown;                            // explicit value to test
  field?: string;                             // read this field off the runtime input
  getValue?: (results: Result[]) => boolean;  // custom combiner for array values
};
```

An item compares the resolved value against `expected` using one of the operators below. The value is resolved in this order:

1. `item.value` if set.
2. `input[item.field]` if `item.field` is set and `input` is an object.
3. The runtime `input` itself.

If neither side has a value (or `expected` is missing), the item evaluates to `false`.

### Operators

| Operator      | Returns `true` when…                                                  |
| ------------- | --------------------------------------------------------------------- |
| `eq`          | `value === expected`                                                  |
| `neq`         | `value !== expected`                                                  |
| `gt`          | `value > expected`                                                    |
| `gte`         | `value >= expected`                                                   |
| `lt`          | `value < expected`                                                    |
| `lte`         | `value <= expected`                                                   |
| `contains`    | `value` contains `expected` as a substring                            |
| `notContains` | `value` does not contain `expected` as a substring                    |
| `startsWith`  | `value` starts with `expected`                                        |
| `endsWith`    | `value` ends with `expected`                                          |
| `regexp`      | `value` matches `expected` (a `RegExp` or pattern)                    |
| `includes`    | `expected` is an array and contains `value` (array membership)        |
| `excludes`    | `expected` is an array and does **not** contain `value`               |

`contains` and friends treat `expected` as a literal string — regex characters are not interpreted. Use `regexp` if you want pattern matching. Invalid regex patterns return `false` instead of throwing.

`includes` and `excludes` flip the usual handler shape: `expected` is the set, `value` is the single item. They use `Array.prototype.includes` (SameValueZero — matches `NaN` but otherwise behaves like `===`). If `expected` isn't an array, both return `false`.

## String DSL

`logic-machine` ships with a small string DSL so rules can be authored, stored, and shipped as plain strings.

```text
expression  := and-expr ("or" and-expr)*          // OR has lower precedence
and-expr    := term ("and" term)*
term        := "(" expression ")" | leaf
leaf        := [field ":"] operator "(" args? ")"
args        := literal ("," literal)*
literal     := number | string | true | false | null
```

* `and` binds tighter than `or`. Parens override.
* Variadic operators (`includes`, `excludes`) take any number of args.
* All other operators take exactly one arg.
* Strings use `"..."` or `'...'` with JSON-style escapes.

```js
import logic, { parse, stringify } from "logic-machine";

logic("eq(10)", 10);                            // true
logic("(eq(10) or includes(1, 2, 3)) and lt(20)", 2); // true
logic('role:includes("admin", "owner")', { role: "admin" });  // true

parse("(eq(10) or includes(1, 2, 3)) and eq(5)");
// {
//   type: "and",
//   group: [
//     { type: "or", group: [
//         { operator: "eq", expected: 10 },
//         { operator: "includes", expected: [1, 2, 3] },
//       ] },
//     { operator: "eq", expected: 5 },
//   ],
// }

stringify({
  type: "and",
  group: [
    { operator: "eq", expected: "Alex", field: "name" },
    { operator: "gte", expected: 18, field: "age" },
  ],
});
// 'name:eq("Alex") and age:gte(18)'
```

Invalid input throws `SyntaxError` (from `parse`) or `TypeError` (from `stringify`, e.g. when an item has both `expected` and `value`).

## Array values

When the resolved value is an array and the operator is **not** `includes` / `excludes`, the operator is applied element-wise. Default combiners:

* **Every element must match** for `eq` and `notContains`.
* **At least one element must match** for everything else.

```js
// "all values are 1"
logic({
  type: "and",
  group: [{ operator: "eq", expected: 1, value: [1, 1, 1] }],
}); // true

// "any value is greater than 10"
logic({
  type: "or",
  group: [{ operator: "gt", expected: 10, value: [3, 11, 7] }],
}); // true
```

### Custom combiners

Provide a `getValue` to override the default array combiner:

```js
logic({
  type: "and",
  group: [
    {
      operator: "eq",
      expected: 1,
      value: [1, 1, 3],
      getValue: (results) => results.filter((r) => r.result).length === 2,
    },
  ],
}); // true — exactly two elements equal 1
```

```ts
type Result = { value: unknown; result: boolean };
```

## TypeScript

All public types are exported:

```ts
import logic, { Logic, Item, Node, Operator, Result } from "logic-machine";
```

## Migrating from 2.0.x

* New: string DSL and a second `input` argument to `logic()`. JSON rules with explicit `value` still evaluate the same way.
* New named exports: `parse`, `stringify`. Also available as properties on the default function (`logic.parse`, `logic.stringify`).
* The CJS bundle is gone. Use ESM in Node, or the IIFE bundle in browsers.

## Migrating from 1.x

* `Logic.type` is now required. Previously omitting it silently meant `or`.
* Renamed operators: `contain` → `contains`, `notContain` → `notContains`, `startWith` → `startsWith`, `endWith` → `endsWith`, `include` → `includes`, `exclude` → `excludes`.
* `includes` / `excludes` are array-membership operators, not scalar `eq` / `neq` aliases. `expected` is the set; `value` is the single item being tested.
* `eq` / `neq` now use strict equality.
* `contains`, `notContains`, `startsWith`, `endsWith` no longer interpret regex syntax. Use `regexp` for patterns.
* `regexp` accepts a `RegExp` instance and returns `false` on invalid patterns instead of throwing.

## Development

The source is plain JavaScript (ESM). The public TypeScript types live in [src/index.d.ts](./src/index.d.ts) and are copied into `dist/` at build time.

```sh
npm install
npm test       # run tests (Jest, native ESM)
npm run build  # bundle dist/ (rolldown -> ESM + IIFE)
```

## License

MIT — see [LICENSE.md](./LICENSE.md).
