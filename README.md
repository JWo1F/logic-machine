# logic-machine

Tiny rules engine for JavaScript. Express a boolean rule as a string, as JSON, or both — evaluate it against your data and get `true` or `false`.

Zero dependencies. Works in Node.js 18+, modern browsers, and edge runtimes.

```js
import logic from "logic-machine";

// "owner can edit; an editor can edit only while their account is active"
logic(
  'role:eq("owner") or (role:eq("editor") and status:eq("active"))',
  { role: "editor", status: "active" },
); // true
```

## When you'd reach for this

You have data, and you want to ask boolean questions of it where the *questions* aren't hard-coded — they come from config, a database, an admin UI, or a user. Typical fits:

- Feature flags and audience targeting.
- Access control rules.
- Eligibility checks (promos, recommendations, filters).
- Validation rules you want to author or store outside the codebase.

If the rules live in your source forever, a plain `if` is fine. Reach for `logic-machine` when they don't.

## Install

```sh
npm install logic-machine
```

Or include the IIFE bundle in a browser:

```html
<script src="https://unpkg.com/logic-machine"></script>
<script>
  LogicMachine('age:gte(18)', { age: 22 }); // true
</script>
```

## Two ways to write a rule

A rule can be a **DSL string** or a **JSON tree**. Both are first-class — pick whichever is easier to write or store. They're interchangeable; [`parse`](#parse-and-stringify) and [`stringify`](#parse-and-stringify) convert between them.

### DSL strings

Compact and easy to author by hand, store in a database, or hand to a non-programmer.

```js
logic('age:gte(18) and country:includes("US", "CA")', {
  age: 22,
  country: "US",
}); // true
```

The grammar:

- A leaf is `operator(arg, …)`, optionally prefixed with `field:`.
- Combine leaves with `and` / `or`. `and` binds tighter; parens override.
- Literals are numbers, single- or double-quoted strings (with JSON-style escapes), `true`, `false`, `null`.

```text
(age:gte(18) and country:includes("US", "CA")) or role:eq("admin")
```

### JSON trees

Better when you generate or transform rules programmatically.

```js
logic(
  {
    type: "or",
    group: [
      { field: "role", operator: "eq", expected: "owner" },
      {
        type: "and",
        group: [
          { field: "role", operator: "eq", expected: "editor" },
          { field: "status", operator: "eq", expected: "active" },
        ],
      },
    ],
  },
  { role: "editor", status: "active" },
); // true
```

A node is either a `Logic` group (`{ type: "and" | "or", group: [...] }`) or an `Item` leaf (`{ operator, expected, ... }`). They nest freely.

## How values get resolved

Every leaf compares some *value* against the literal `expected`. You can supply the value in any of these ways. The resolver tries them in order:

```js
// 1. The runtime input itself
logic("gte(18)", 22); // true

// 2. A named field on the input, DSL form
logic("age:gte(18)", { age: 22 }); // true

// 3. A named field on the input, JSON form (same as #2)
logic({ operator: "gte", expected: 18, field: "age" }, { age: 22 }); // true

// 4. A literal baked into the rule (JSON only)
logic({ operator: "gte", expected: 18, value: 22 }); // true

// 5. Mixed — different leaves of the same rule choose independently.
//    Here the first leaf hard-codes its value; the second reads `age`
//    off the runtime input.
logic(
  {
    type: "and",
    group: [
      { operator: "eq", expected: "active", value: "active" },
      { operator: "gte", expected: 18, field: "age" },
    ],
  },
  { age: 22 },
); // true
```

`#2` and `#3` are exactly the same rule — the DSL is just sugar over JSON. Within a single Item, `value` wins over `field`, which wins over the bare input. If nothing is set — no `value`, no `field`, no `input` — the leaf is `false`. The same goes if a `field` is missing on the input or the input isn't an object.

## Operators

| Operator      | True when                                                  | Example                         |
| ------------- | ---------------------------------------------------------- | ------------------------------- |
| `eq`          | `value === expected`                                       | `eq(42)`                        |
| `neq`         | `value !== expected`                                       | `neq(0)`                        |
| `gt`          | `value > expected`                                         | `gt(18)`                        |
| `gte`         | `value >= expected`                                        | `gte(18)`                       |
| `lt`          | `value < expected`                                         | `lt(100)`                       |
| `lte`         | `value <= expected`                                        | `lte(100)`                      |
| `contains`    | `value` contains `expected` as a literal substring         | `contains("foo")`               |
| `notContains` | `value` does **not** contain `expected` as a substring     | `notContains("foo")`            |
| `startsWith`  | `value` starts with `expected`                             | `startsWith("Mr.")`             |
| `endsWith`    | `value` ends with `expected`                               | `endsWith(".jpg")`              |
| `regexp`      | `value` matches `expected` (string pattern or `RegExp`)    | `regexp("^[A-Z]+$")`            |
| `includes`    | `value` is in `expected` — array membership                | `includes("admin", "owner")`    |
| `excludes`    | `value` is **not** in `expected`                           | `excludes("banned", "pending")` |

A few things worth knowing:

- `eq` / `neq` are strict (`===` / `!==`). `1` and `"1"` are not equal.
- String operators (`contains`, `startsWith`, etc.) treat `expected` as a literal — regex characters are not interpreted. Use `regexp` for patterns.
- `regexp` accepts a `RegExp` instance (so you can pass flags) and returns `false` on invalid patterns instead of throwing.
- `includes` / `excludes` flip the usual handler shape: `expected` is the *set*, `value` is the *item*. They use `Array.prototype.includes` (SameValueZero — matches `NaN`).
- A value resolving to `undefined` makes the leaf `false`. No exceptions, no coercion.

## Array values

If the resolved value is an array and the operator is *not* `includes` / `excludes`, the operator runs against each element. The default rule for combining the per-element results depends on the operator:

- **Every element must match** for `eq` and `notContains` ("none of them are X", "none of them contain X").
- **At least one element must match** for everything else.

```js
// "any name contains 'o'"
logic("contains('o')", ["Alex", "Bob", "Carol"]); // true

// "every score equals 100"
logic("eq(100)", [100, 100, 100]); // true
```

Override the combiner per leaf with `getValue` (JSON form):

```js
logic({
  operator: "eq",
  expected: 1,
  value: [1, 1, 3],
  getValue: (results) => results.filter((r) => r.result).length === 2,
}); // true — exactly two elements equal 1

// results: [{ value: 1, result: true }, { value: 1, result: true }, { value: 3, result: false }]
```

## Custom operators

Register your own with `extend`. Registered operators work everywhere a built-in does — JSON, DSL, parse, stringify.

```js
import logic, { extend } from "logic-machine";

extend({
  isEven: (_, value) => Number(value) % 2 === 0,
  domainOf: (expected, value) => String(value).endsWith(`@${expected}`),
});

logic("isEven(0)", 8);                                       // true
logic('email:domainOf("example.com")', { email: "a@x.com" });// false
```

Names must be valid identifiers and must not collide with the DSL keywords (`and`, `or`, `true`, `false`, `null`). Built-ins can be overridden if you really want.

## Parse and stringify

`parse` turns a DSL string into a JSON tree; `stringify` is the inverse. Use them to store rules in either form and convert on demand.

```js
import { parse, stringify } from "logic-machine";

parse('age:gte(18) and country:includes("US", "CA")');
// {
//   type: "and",
//   group: [
//     { operator: "gte", expected: 18, field: "age" },
//     { operator: "includes", expected: ["US", "CA"], field: "country" },
//   ],
// }

stringify({
  type: "or",
  group: [
    { operator: "eq", expected: "owner", field: "role" },
    { operator: "gte", expected: 18, field: "age" },
  ],
});
// 'role:eq("owner") or age:gte(18)'
```

`parse(stringify(tree))` and `stringify(parse(rule))` roundtrip for any valid input.

Both are also reachable as `logic.parse` and `logic.stringify` if you'd rather not have multiple imports.

## TypeScript

Hand-written declarations ship with the package. Everything is exported by name:

```ts
import logic, {
  Logic,
  Item,
  Node,
  Operator,
  Handler,
  Result,
} from "logic-machine";
```

`Operator` is `BuiltinOperator | (string & {})` so the built-ins get IDE autocomplete without locking out names you register through `extend`.

## Browser

The IIFE bundle exposes `window.LogicMachine` — the default function with `parse`, `stringify`, and `extend` attached as properties.

```html
<script src="https://unpkg.com/logic-machine"></script>
<script>
  LogicMachine.extend({ isEven: (_, v) => v % 2 === 0 });
  LogicMachine("age:isEven(0)", { age: 12 }); // true
</script>
```

## Development

```sh
npm install
npm test       # Jest, native ESM — runs on Node 18+
npm run build  # rolldown -> dist/ (ESM + IIFE + types) — needs Node 20+
```

## License

MIT — see [LICENSE.md](./LICENSE.md).
