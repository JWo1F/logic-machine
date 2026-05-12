# Changelog

## 2.0.0

Major rewrite. See the README's "Migrating from 1.x" section for breaking changes.

### Breaking

* `Logic.type` is now required (`"and" | "or"`).
* Renamed operators: `contain` → `contains`, `notContain` → `notContains`, `startWith` → `startsWith`, `endWith` → `endsWith`, `include` → `includes`, `exclude` → `excludes`.
* `eq` / `neq` now use strict equality (`===` / `!==`).
* `contains` / `notContains` / `startsWith` / `endsWith` no longer interpret regex syntax in `expected`. Use `regexp` for patterns.
* Default export only — the API surface is a single function.

### Added

* Hand-written TypeScript declarations in `dist/index.d.ts` exporting `Logic`, `Item`, `Node`, `Operator`, `Result`.
* `regexp` accepts a `RegExp` instance and returns `false` on invalid patterns.
* Dual ESM/CJS distribution with proper `exports` map.
* `notContains` joins `eq` / `excludes` in using "every element matches" semantics for array values.
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
