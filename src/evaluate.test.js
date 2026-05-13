import { describe, expect, test } from "@jest/globals";
import evaluate from "./evaluate.js";
import builtins from "./handlers.js";

const handlers = { ...builtins };
const run = (tree, input) => evaluate(tree, input, handlers, true);

describe("scalar handlers", () => {
  test("strict equality (eq/neq do not coerce)", () => {
    expect(run({ operator: "eq", expected: 1, value: 1 })).toBe(true);
    expect(run({ operator: "eq", expected: 1, value: "1" })).toBe(false);
    expect(run({ operator: "neq", expected: 1, value: "1" })).toBe(true);
  });

  test("comparisons", () => {
    expect(run({ operator: "gt", expected: 5, value: 6 })).toBe(true);
    expect(run({ operator: "gte", expected: 5, value: 5 })).toBe(true);
    expect(run({ operator: "lt", expected: 5, value: 4 })).toBe(true);
    expect(run({ operator: "lte", expected: 5, value: 5 })).toBe(true);
  });

  test("string operators take expected literally", () => {
    expect(run({ operator: "contains", expected: "a.b", value: "a.b.c" })).toBe(true);
    expect(run({ operator: "contains", expected: "a.b", value: "aXbXc" })).toBe(false);
    expect(run({ operator: "startsWith", expected: "[x]", value: "[x]y" })).toBe(true);
    expect(run({ operator: "endsWith", expected: ".jpg", value: "p.jpg" })).toBe(true);
  });

  test("regexp accepts RegExp instances and string patterns", () => {
    expect(run({ operator: "regexp", expected: /^[A-Z]+$/, value: "HELLO" })).toBe(true);
    expect(run({ operator: "regexp", expected: /^[A-Z]+$/i, value: "hello" })).toBe(true);
    expect(run({ operator: "regexp", expected: "^[A-Z]+$", value: "HELLO" })).toBe(true);
    expect(run({ operator: "regexp", expected: "(", value: "abc" })).toBe(false);
  });

  test("variadic custom op: handler receives expected as an array", () => {
    const local = {
      ...builtins,
      between: (expected, value) => value >= expected[0] && value <= expected[1],
    };
    expect(evaluate({ operator: "between", expected: [1, 10], value: 5 }, undefined, local, true)).toBe(true);
    expect(evaluate({ operator: "between", expected: [1, 10], value: 11 }, undefined, local, true)).toBe(false);
  });

  test("array value to a non-iterating operator yields false (no element-wise magic)", () => {
    // In v3 there is no implicit per-element iteration — the user must
    // wrap with every/some/none.
    expect(run({ operator: "eq", expected: 1, value: [1, 1, 1] })).toBe(false);
  });

  test("nullary operator: handler is called with undefined expected", () => {
    const localHandlers = {
      ...builtins,
      isEven: (_, value) => Number(value) % 2 === 0,
    };
    expect(
      evaluate({ operator: "isEven", value: 4 }, undefined, localHandlers, true),
    ).toBe(true);
    expect(
      evaluate({ operator: "isEven", value: 5 }, undefined, localHandlers, true),
    ).toBe(false);
    // Reads from input when no value is set
    expect(
      evaluate({ operator: "isEven", field: "n" }, { n: 8 }, localHandlers, true),
    ).toBe(true);
  });
});

describe("value resolution", () => {
  test("item.value wins over field and input", () => {
    expect(
      run({ operator: "eq", expected: 1, value: 1, field: "ignored" }, { ignored: 99 }),
    ).toBe(true);
  });

  test("field reads off the input", () => {
    expect(
      run({ operator: "eq", expected: "A", field: "name" }, { name: "A" }),
    ).toBe(true);
  });

  test("bare input is used when no value or field is set", () => {
    expect(run({ operator: "eq", expected: 5 }, 5)).toBe(true);
  });

  test("missing field on input → false", () => {
    expect(run({ operator: "eq", expected: 1, field: "missing" }, { other: 1 })).toBe(false);
  });

  test("null / non-object input with a field → false", () => {
    expect(run({ operator: "eq", expected: 1, field: "name" }, null)).toBe(false);
    expect(run({ operator: "eq", expected: 1, field: "name" }, undefined)).toBe(false);
  });
});

describe("Logic groups", () => {
  test("and is every", () => {
    expect(
      run({
        type: "and",
        group: [
          { operator: "eq", expected: 1, value: 1 },
          { operator: "eq", expected: 2, value: 2 },
        ],
      }),
    ).toBe(true);
  });

  test("or is some", () => {
    expect(
      run({
        type: "or",
        group: [
          { operator: "eq", expected: 1, value: 9 },
          { operator: "eq", expected: 2, value: 2 },
        ],
      }),
    ).toBe(true);
  });

  test("empty and is vacuously true; empty or is false", () => {
    expect(run({ type: "and", group: [] })).toBe(true);
    expect(run({ type: "or", group: [] })).toBe(false);
  });
});

describe("Quantifiers", () => {
  test("every requires all elements to pass", () => {
    expect(
      run(
        { type: "every", over: "scores", match: { operator: "gte", expected: 60 } },
        { scores: [80, 92, 67] },
      ),
    ).toBe(true);
    expect(
      run(
        { type: "every", over: "scores", match: { operator: "gte", expected: 60 } },
        { scores: [80, 50, 92] },
      ),
    ).toBe(false);
  });

  test("some requires at least one element to pass", () => {
    expect(
      run(
        { type: "some", over: "tags", match: { operator: "eq", expected: "urgent" } },
        { tags: ["normal", "urgent", "info"] },
      ),
    ).toBe(true);
  });

  test("none requires no element to pass", () => {
    expect(
      run(
        { type: "none", over: "errors", match: { operator: "neq", expected: null } },
        { errors: [null, null] },
      ),
    ).toBe(true);
    expect(
      run(
        { type: "none", over: "errors", match: { operator: "neq", expected: null } },
        { errors: [null, "boom"] },
      ),
    ).toBe(false);
  });

  test("array literal as source", () => {
    expect(
      run({
        type: "every",
        over: [1, 1, 1],
        match: { operator: "eq", expected: 1 },
      }),
    ).toBe(true);
  });

  test("non-array source resolves to false", () => {
    expect(
      run(
        { type: "every", over: "scores", match: { operator: "eq", expected: 1 } },
        { scores: "not an array" },
      ),
    ).toBe(false);
    expect(
      run(
        { type: "every", over: "missing", match: { operator: "eq", expected: 1 } },
        { other: 1 },
      ),
    ).toBe(false);
  });

  test("predicate receives each element as its input", () => {
    expect(
      run(
        {
          type: "every",
          over: "items",
          match: {
            type: "and",
            group: [
              { operator: "gt", expected: 0, field: "qty" },
              { operator: "lt", expected: 100, field: "price" },
            ],
          },
        },
        { items: [{ qty: 1, price: 50 }, { qty: 5, price: 99 }] },
      ),
    ).toBe(true);
  });

  test("quantifiers nest", () => {
    expect(
      run(
        {
          type: "every",
          over: "rows",
          match: {
            type: "some",
            over: "cells",
            match: { operator: "eq", expected: "x" },
          },
        },
        { rows: [{ cells: ["a", "x"] }, { cells: ["x"] }] },
      ),
    ).toBe(true);
  });

  test("over omitted → iterate the input itself", () => {
    expect(
      run({ type: "every", match: { operator: "gt", expected: 0 } }, [1, 2, 3]),
    ).toBe(true);
  });
});

describe("strict mode", () => {
  test("unknown operator throws in strict mode (default)", () => {
    expect(() =>
      evaluate({ operator: "wat", expected: 1, value: 1 }, undefined, handlers, true),
    ).toThrow(ReferenceError);
  });

  test("unknown operator returns false in non-strict mode", () => {
    expect(
      evaluate({ operator: "wat", expected: 1, value: 1 }, undefined, handlers, false),
    ).toBe(false);
  });

  test("non-strict mode still evaluates surrounding rule correctly", () => {
    expect(
      evaluate(
        {
          type: "or",
          group: [
            { operator: "wat", expected: 1, value: 1 },
            { operator: "eq", expected: 1, value: 1 },
          ],
        },
        undefined,
        handlers,
        false,
      ),
    ).toBe(true);
  });
});
