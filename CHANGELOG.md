# Changelog

## 3.1.0

### Added

* **Nullary operators.** Items no longer require `expected`. Calls like `isEven()` now parse and evaluate; the handler receives `undefined` as its first argument.

  ```js
  LogicMachine.extend({ isEven: (_, v) => Number(v) % 2 === 0 });
  new LogicMachine("isEven()").compute(8);                  // true
  new LogicMachine("every(scores, isEven())").compute({ scores: [2, 4, 6] }); // true
  ```

  In JSON, omit `expected`: `{ operator: "isEven", field: "age" }`.

### Changed

* The evaluator's `expected === undefined → false` guard is removed. Built-in operators are well-behaved for the omitted-expected case (`eq()` always false, `gt()` always false, etc.); user handlers that ignore `expected` now work naturally.
* `Item.expected` is now optional in the TypeScript definitions.

## 3.0.0

The default export is now the **`LogicMachine` class**. The implicit per-element array semantics on Items are gone; arrays are handled by explicit `every` / `some` / `none` quantifier nodes.

### Breaking

* **Class-based API.** `import logic from "logic-machine"` becomes `import LogicMachine from "logic-machine"`. Each instance owns one rule.

  ```js
  // before
  logic("eq(10)", 10);
  // after
  new LogicMachine("eq(10)").compute(10);
  ```

* **No implicit array iteration on Items.** A leaf with an array value used to iterate element-wise, with `eq` and `notContains` defaulting to "every" and everything else to "some". That magic is gone. Use the explicit quantifier nodes:

  ```js
  // before — "every score >= 60" implicit on eq
  logic({ operator: "eq", expected: 1, value: [1, 1, 1] });
  // after — explicit
  new LogicMachine({
    type: "every",
    over: [1, 1, 1],
    match: { operator: "eq", expected: 1 },
  }).compute();
  ```

* **`every` / `some` / `none` are first-class node types.** In the DSL: `every(field_or_array_literal, predicate)`. The predicate can be any sub-expression, not just a leaf.

* **Array literals in the DSL.** `[1, 2, 3]` is now a literal. `includes` / `excludes` take a single array arg (`includes([1, 2, 3])`); the old variadic form (`includes(1, 2, 3)`) is gone.

* **`notContains` dropped.** Express it as `none(xs, contains(x))` or as a custom operator.

* **`Item.getValue` dropped.** Quantifiers cover every/some/none; very niche custom combiners now go through `extend` instead.

* **Strict `compute` by default.** An unknown operator throws `ReferenceError`. Pass `{ strict: false }` to get `false` instead.

* **Static-only strict variants.** `LogicMachine.parse(str)` and `LogicMachine.stringify(tree)` validate against the global registry and throw `ReferenceError` on unknown operators. The instance counterparts validate against globals + the instance's own handlers.

* **CJS bundle stays dropped.** ESM in Node, IIFE in browsers (as in 2.x).

### Added

* `class LogicMachine`:
  - `new LogicMachine(source?)` — DSL string, JSON tree, or empty.
  - `lm.extend(handlers)` — register handlers on this instance; chainable.
  - `lm.parse(source)` — parse + validate + store; chainable.
  - `lm.compute(input?, { strict? })`
  - `lm.stringify(tree?)` — defaults to the loaded rule.
  - `lm.tree` — read-only view of the loaded tree.
  - Static: `LogicMachine.extend`, `LogicMachine.parse`, `LogicMachine.stringify`.
* `Quantifier` node type exported from the type definitions.
* Quantifier with `over` omitted iterates the runtime input itself if it's an array (JSON form only).

## 2.3.0

### Added

* Regex literals in the DSL — `/pattern/flags` instead of `"pattern"`:

  ```text
  regexp(/^[A-Z]+$/i)
  code:regexp(/^[A-Z]{3}$/)
  ```

  The literal is parsed into a `RegExp` instance (so flags are preserved) and passed straight to the `regexp` handler. Forward slashes inside `[…]` character classes don't need escaping; outside, use `\/`.

* `stringify` now renders a `RegExp` `expected` back as `/source/flags` instead of a JSON-quoted string, so `parse(stringify(x))` roundtrips for regex-bearing rules.

## 2.2.0

### Added

* `extend(extensions)` — register custom operators. Names must be valid identifiers and must not collide with the DSL keywords `and`, `or`, `true`, `false`, `null`. Registered operators participate in JSON evaluation, the string DSL, and `parse` / `stringify`.

  ```js
  import logic, { extend } from "logic-machine";

  extend({ isEven: (_, value) => Number(value) % 2 === 0 });
  logic("isEven(0)", 4); // true
  ```

* `extend` is also exposed on the default function as `logic.extend(...)`.

### Changed

* `Operator` is now `BuiltinOperator | (string & {})` to keep IDE autocomplete for the built-ins while allowing names registered through `extend`.

## 2.1.0

### Added

* String DSL for rules:

  ```text
  (eq(10) or includes(1, 2, 3)) and lt(20)
  name:eq("Alex") and age:gte(18)
  ```

* `logic(rule, input)` — `rule` may be a string (parsed automatically) or a JSON tree. `input` is used as the value for any item that doesn't set `value` directly.
* Named fields: a leaf can be prefixed `field:op(args)` to read that field off an object `input`.
* `Item.field?: string` — pulls a key off the runtime input.
* New named exports: `parse(string) -> Logic | Item` and `stringify(node) -> string`. Both are also attached to the default function as `logic.parse` / `logic.stringify`.
* IIFE bundle (`dist/logic-machine.global.js`) for direct `<script>` use in browsers; exposes `window.LogicMachine`.

### Changed

* Build outputs: ESM (`dist/index.mjs`) + IIFE (`dist/logic-machine.global.js`). The package's `exports` map and `browser` / `unpkg` / `jsdelivr` fields point to the right one per consumer.
* `Item.value` is now optional. If omitted, the runtime input (optionally via `field`) is used.

### Removed

* CJS bundle. Use ESM in Node or the IIFE in browsers.

## 2.0.0

Major rewrite. See the README's "Migrating from 1.x" section for breaking changes.

### Breaking

* `Logic.type` is now required (`"and" | "or"`).
* Renamed operators: `contain` → `contains`, `notContain` → `notContains`, `startWith` → `startsWith`, `endWith` → `endsWith`, `include` → `includes`, `exclude` → `excludes`.
* `includes` / `excludes` are now array-membership operators: `expected` is the set of allowed/disallowed values, `value` is the single item being tested. They no longer act as scalar `eq` / `neq` aliases.
* `eq` / `neq` now use strict equality (`===` / `!==`).
* `contains` / `notContains` / `startsWith` / `endsWith` no longer interpret regex syntax in `expected`. Use `regexp` for patterns.
* Default export only — the API surface is a single function.

### Added

* Hand-written TypeScript declarations in `dist/index.d.ts` exporting `Logic`, `Item`, `Node`, `Operator`, `Result`.
* `regexp` accepts a `RegExp` instance and returns `false` on invalid patterns.
* Dual ESM/CJS distribution with proper `exports` map.
* `notContains` joins `eq` in using "every element matches" semantics for array values (when applied element-wise to an array).
* GitHub Actions CI matrix on Node 18 / 20 / 22.

### Changed

* Source is plain ESM JavaScript again — TypeScript is no longer a build-time dependency, but the public API is fully typed via a hand-maintained `.d.ts`.
* Bundler swapped from rollup to rolldown.

### Removed

* Stray `console.log` in the evaluator.
* `escape-string-regexp` dependency (string operators no longer use regex).
* `typescript`, `@swc/jest`, `@swc/core`, `@testing-library/react`, `jest-environment-jsdom`, ESLint config dependencies, and the rollup toolchain.

### Fixed

* README documented an API that did not exist (`['or', ...]` tuple form, `includes`/`nincludes`, `getResult`). The library now matches its docs.
* Source and shipped bundle had drifted apart — published builds are now CI-built from source.

## 0.4.0

* `eq` semantics for array values: require every element to match.

## 0.3.1

* Doc fixes.

## 0.3.0

* Renamed `nincludes` → `notInclude`.

## 0.2.1

* Doc fixes.

## 0.2.0

* Array value support.

## 0.1.0

* Initial release.
