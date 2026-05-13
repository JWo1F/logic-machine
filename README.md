# logic-machine

Tiny rules engine for JavaScript. Express a boolean rule as a string, as JSON, or both — evaluate it against your data and get `true` or `false`.

Zero dependencies. Works in Node.js 18+, modern browsers, and edge runtimes.

```js
import LogicMachine from "logic-machine";

// "owner can edit; an editor can edit only while their account is active"
const lm = new LogicMachine(
  'role:eq("owner") or (role:eq("editor") and status:eq("active"))',
);

lm.compute({ role: "editor", status: "active" });    // true
lm.compute({ role: "editor", status: "suspended" }); // false
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
  new LogicMachine("age:gte(18)").compute({ age: 22 }); // true
</script>
```

## The API in 30 seconds

`LogicMachine` is a class. Each instance owns one parsed rule plus a private handler registry that layers on top of a shared global one.

```js
import LogicMachine from "logic-machine";

// 1. One-off evaluation.
new LogicMachine("eq(10)").compute(10);                 // true

// 2. Register a built-in available to every instance.
LogicMachine.extend({ isEven: (_, v) => v % 2 === 0 });

// 3. Register a private operator on one instance.
const lm = new LogicMachine();
lm.extend({ domainOf: (e, v) => String(v).endsWith(`@${e}`) });
lm.parse('email:domainOf("example.com")');
lm.compute({ email: "alex@example.com" });              // true

// 4. Strict static round-trip via the class.
LogicMachine.parse("eq(10)");      // returns a JSON tree
LogicMachine.stringify(tree);      // returns the DSL string
```

## Writing rules

A rule is a **DSL string** or a **JSON tree**. Both are first-class; the DSL is just a compact spelling of the tree.

### DSL

```text
expression := and-expr ("or" and-expr)*
and-expr   := term ("and" term)*
term       := "(" expression ")" | quantifier | op-call
quantifier := ("every"|"some"|"none") "(" source "," expression ")"
source     := field-name | array-literal
op-call    := [field ":"] operator "(" literal ")"
literal    := number | string | regex | boolean | null | array-literal
```

* `and` binds tighter than `or`. Parens override.
* Strings are `"…"` or `'…'` with JSON-style escapes.
* Regex literals are `/pattern/flags`.
* Array literals are `[1, 2, 3]`.

```js
new LogicMachine('age:gte(18) and country:includes(["US", "CA"])');
new LogicMachine('every(scores, gte(60))');
new LogicMachine('some(orders, status:eq("pending") or status:eq("processing"))');
new LogicMachine('none(errors, neq(null))');
```

### JSON

Each node is either a `Logic` group, a `Quantifier`, or an `Item` leaf.

```ts
type Logic      = { type: "and" | "or"; group: Node[] };
type Quantifier = { type: "every" | "some" | "none"; over?: string | unknown[]; match: Node };
type Item       = { operator: string; expected: unknown; value?: unknown; field?: string };
type Node       = Logic | Quantifier | Item;
```

```js
new LogicMachine({
  type: "and",
  group: [
    { operator: "gte", expected: 18, field: "age" },
    { type: "every", over: "scores", match: { operator: "gte", expected: 60 } },
  ],
});
```

## How values get resolved

Every leaf compares some *value* against the literal `expected`. The value comes from one of:

```js
// 1. The runtime input itself
new LogicMachine("gte(18)").compute(22); // true

// 2. A named field on the input (DSL)
new LogicMachine("age:gte(18)").compute({ age: 22 }); // true

// 3. A named field on the input (JSON)
new LogicMachine({ operator: "gte", expected: 18, field: "age" }).compute({ age: 22 }); // true

// 4. A literal baked into the rule (JSON only)
new LogicMachine({ operator: "gte", expected: 18, value: 22 }).compute(); // true

// 5. Mixed — different leaves of the same rule choose independently
new LogicMachine({
  type: "and",
  group: [
    { operator: "eq", expected: "active", value: "active" },  // hard-coded
    { operator: "gte", expected: 18, field: "age" },           // from input
  ],
}).compute({ age: 22 }); // true
```

The resolver tries `item.value` first, then `input[item.field]`, then `input` itself. If nothing is set, the leaf is `false`.

## Quantifiers — for arrays

`every` / `some` / `none` iterate a source array and apply a predicate to each element. The predicate's "input" is the current element, so nested fields and quantifiers compose naturally.

```js
// "every score is at least 60"
new LogicMachine("every(scores, gte(60))").compute({ scores: [80, 92, 67] }); // true

// "any tag is 'urgent' OR 'blocker'"
new LogicMachine('some(tags, eq("urgent") or eq("blocker"))')
  .compute({ tags: ["normal", "urgent"] }); // true

// "no error is present"
new LogicMachine("none(errors, neq(null))").compute({ errors: [null, null] }); // true

// "every item has positive qty and reasonable price"
new LogicMachine("every(items, qty:gt(0) and price:lt(1000))")
  .compute({ items: [{ qty: 2, price: 50 }, { qty: 1, price: 99 }] }); // true

// Literal array as source
new LogicMachine("every([1, 1, 1], eq(1))").compute(); // true
```

Sources:
- A **field name** — `input[name]` is the array.
- An **array literal** — used as-is.
- **Omitted** (JSON only, `over` left out) — iterates the input itself if it's an array.

If the resolved source isn't an array, the quantifier evaluates to `false`.

## Operators

| Operator     | True when                                                  | Example                       |
| ------------ | ---------------------------------------------------------- | ----------------------------- |
| `eq`         | `value === expected`                                       | `eq(42)`                      |
| `neq`        | `value !== expected`                                       | `neq(0)`                      |
| `gt`         | `value > expected`                                         | `gt(18)`                      |
| `gte`        | `value >= expected`                                        | `gte(18)`                     |
| `lt`         | `value < expected`                                         | `lt(100)`                     |
| `lte`        | `value <= expected`                                        | `lte(100)`                    |
| `contains`   | `value` contains `expected` as a literal substring         | `contains("foo")`             |
| `startsWith` | `value` starts with `expected`                             | `startsWith("Mr.")`           |
| `endsWith`   | `value` ends with `expected`                               | `endsWith(".jpg")`            |
| `regexp`     | `value` matches `expected` (string pattern or `RegExp`)    | `regexp(/^[A-Z]+$/i)`         |
| `includes`   | `value` is in `expected` (array membership)                | `includes([1, 2, 3])`         |
| `excludes`   | `value` is **not** in `expected`                           | `excludes(["banned"])`        |

- `eq` / `neq` are strict (`===` / `!==`).
- String operators treat `expected` as a literal — use `regexp` for patterns.
- `regexp` accepts a `RegExp` and returns `false` on invalid patterns instead of throwing.
- `includes` / `excludes` flip the usual handler shape: `expected` is the *set*, `value` is the *item*. They use `Array.prototype.includes` semantics (SameValueZero — matches `NaN`).
- Need element-wise comparisons on an array? That's the quantifiers' job — `every(xs, eq(1))` instead of magic.

## Custom operators

Register globally with `LogicMachine.extend` or per-instance with `instance.extend`. Instance handlers shadow globals for that instance only.

```js
import LogicMachine from "logic-machine";

LogicMachine.extend({
  isEven: (_, value) => Number(value) % 2 === 0,
  domainOf: (expected, value) => String(value).endsWith(`@${expected}`),
});

new LogicMachine("isEven(0)").compute(8);                                   // true
new LogicMachine('email:domainOf("example.com")').compute({ email: "a@x" }); // false
```

Names must be valid identifiers and must not collide with DSL keywords (`and`, `or`, `every`, `some`, `none`, `true`, `false`, `null`).

## Strict and lazy modes

`compute` throws `ReferenceError` if it encounters an unknown operator. Pass `{ strict: false }` to get `false` for that leaf instead.

```js
const lm = new LogicMachine("mystery(0) or eq(10)");

lm.compute(10);                       // ReferenceError: Unknown operator 'mystery'
lm.compute(10, { strict: false });    // true — mystery becomes `false`, eq(10) matches
```

## Static vs instance

| Static                       | Instance                       |
| ---------------------------- | ------------------------------ |
| `LogicMachine.extend({…})`   | `lm.extend({…})`               |
| globals only                 | globals + instance handlers    |
| `LogicMachine.parse(str)`    | `lm.parse(str)`                |
| strict against globals       | strict against all handlers; stores tree |
| `LogicMachine.stringify(t)`  | `lm.stringify(t?)`             |
| strict against globals       | strict against all handlers; defaults to `lm.tree` |

`new LogicMachine(source)` is intentionally permissive — it parses syntactically but doesn't validate operator names. That's so you can construct a rule that references your custom ops *before* you register them. Validation happens on `instance.parse(...)` or at `compute()` time (strict mode).

## TypeScript

Hand-written declarations ship with the package:

```ts
import LogicMachine, {
  Logic,
  Quantifier,
  Item,
  Node,
  Operator,
  Handler,
  ComputeOptions,
} from "logic-machine";
```

`Operator` is `BuiltinOperator | (string & {})` so built-ins get autocomplete without locking out names registered through `extend`.

## Browser

The IIFE bundle exposes `window.LogicMachine` — the class itself.

```html
<script src="https://unpkg.com/logic-machine"></script>
<script>
  LogicMachine.extend({ isEven: (_, v) => v % 2 === 0 });
  new LogicMachine("age:isEven(0)").compute({ age: 12 }); // true
</script>
```

## Development

The source is plain JavaScript (ESM). The public TypeScript types live in [src/index.d.ts](./src/index.d.ts) and are copied into `dist/` at build time.

```sh
npm install
npm test       # Jest, native ESM — runs on Node 18+
npm run build  # rolldown -> dist/ (ESM + IIFE + types) — needs Node 20+
```

## License

MIT — see [LICENSE.md](./LICENSE.md).
