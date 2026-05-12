# logic-machine

A small, dependency-free evaluator for boolean expression trees. Describe a rule as plain JSON, get back `true` or `false`.

Works in Node.js (>=18) and modern browsers. Ships ESM, CJS, and TypeScript declarations.

## Install

```sh
npm install logic-machine
```

## Quick start

```ts
import logic from "logic-machine";

const result = logic({
  type: "or",
  group: [
    { operator: "gt", expected: 5, value: 7 },
    { operator: "eq", expected: 5, value: 3 },
    {
      type: "and",
      group: [
        { operator: "lt", expected: 5, value: 6 },
        { operator: "lte", expected: 5, value: 5 },
      ],
    },
  ],
});

// result === true
```

A logic tree is a `Logic` node (with `type` and `group`) or a leaf `Item` (with `operator`, `expected`, `value`). Branches nest freely.

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
  value: unknown;
  getValue?: (results: Result[]) => boolean;
};
```

An item compares `value` against `expected` using one of the operators below. If either side is `undefined`, the item evaluates to `false`.

### Operators

| Operator      | Returns `true` when…                                  |
| ------------- | ----------------------------------------------------- |
| `eq`          | `value === expected`                                  |
| `neq`         | `value !== expected`                                  |
| `gt`          | `value > expected`                                    |
| `gte`         | `value >= expected`                                   |
| `lt`          | `value < expected`                                    |
| `lte`         | `value <= expected`                                   |
| `contains`    | `value` contains `expected` as a substring            |
| `notContains` | `value` does not contain `expected` as a substring    |
| `startsWith`  | `value` starts with `expected`                        |
| `endsWith`    | `value` ends with `expected`                          |
| `regexp`      | `value` matches `expected` (a `RegExp` or pattern)    |
| `includes`    | `value === expected` (alias of `eq`, scalar form)     |
| `excludes`    | `value !== expected` (alias of `neq`, scalar form)    |

`contains` and friends treat `expected` as a literal string — regex characters are not interpreted. Use `regexp` if you want pattern matching. Invalid regex patterns return `false` instead of throwing.

## Array values

When `value` is an array, the operator is applied element-wise. The default rule for combining the per-element results depends on the operator:

* **Every element must match** for `eq`, `excludes`, `notContains` — i.e. "all values are X", "none of them are X", "none of them contain X".
* **At least one element must match** for everything else.

```ts
// "all values are 1"
logic({
  type: "and",
  group: [{ operator: "eq", expected: 1, value: [1, 1, 1] }],
}); // true

// "any value equals 'abc'"
logic({
  type: "or",
  group: [{ operator: "includes", expected: "abc", value: ["x", "abc", "y"] }],
}); // true
```

### Custom combiners

Provide a `getValue` to override the default array combiner. It receives the per-element results and returns the final boolean.

```ts
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

## Migrating from 1.x

* `Logic.type` is now required. Previously omitting it silently meant `or`.
* Renamed operators: `contain` → `contains`, `notContain` → `notContains`, `startWith` → `startsWith`, `endWith` → `endsWith`, `include` → `includes`, `exclude` → `excludes`.
* `eq` and `neq` now use strict equality. `1 === "1"` is `false`.
* `contains`, `notContains`, `startsWith`, `endsWith` no longer interpret regex syntax in `expected`. Use the `regexp` operator for that.
* The `regexp` operator now accepts a `RegExp` instance (so you can pass flags) and returns `false` on invalid patterns instead of throwing.
* Debug `console.log` calls are gone.
* Dual ESM/CJS build; types live in `dist/index.d.ts`.

## Development

The source is plain JavaScript (ESM). The public TypeScript types live in [src/index.d.ts](./src/index.d.ts) and are copied into `dist/` at build time.

```sh
npm install
npm test       # run tests (Jest, native ESM)
npm run build  # bundle dist/ (rolldown)
```

## License

MIT — see [LICENSE.md](./LICENSE.md).
