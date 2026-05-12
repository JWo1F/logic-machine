import { describe, expect, test } from "@jest/globals";
import logic from "./index.js";

describe("top-level combinators", () => {
  test("'or' returns true when any branch is true", () => {
    expect(
      logic({
        type: "or",
        group: [
          { expected: 7, operator: "gt", value: 5 },
          { expected: 5, operator: "eq", value: 5 },
          { expected: 5, operator: "lt", value: 5 },
        ],
      }),
    ).toBe(true);
  });

  test("'and' returns false when any branch is false", () => {
    expect(
      logic({
        type: "and",
        group: [
          { expected: 7, operator: "gt", value: 5 },
          { expected: 5, operator: "eq", value: 5 },
          { expected: 5, operator: "lt", value: 5 },
        ],
      }),
    ).toBe(false);
  });

  test("empty 'and' group is vacuously true", () => {
    expect(logic({ type: "and", group: [] })).toBe(true);
  });

  test("empty 'or' group is false", () => {
    expect(logic({ type: "or", group: [] })).toBe(false);
  });
});

describe("nested logic", () => {
  test("evaluates nested groups recursively", () => {
    expect(
      logic({
        type: "or",
        group: [
          { expected: 7, operator: "gt", value: 5 },
          { expected: 3, operator: "eq", value: 5 },
          {
            type: "and",
            group: [
              { expected: 6, operator: "lt", value: 5 },
              { expected: 5, operator: "lte", value: 5 },
              {
                type: "or",
                group: [
                  { expected: 5, operator: "lt", value: 5 },
                  { expected: 5, operator: "lte", value: 5 },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  test("a single failing branch sinks a deeply-nested AND", () => {
    expect(
      logic({
        type: "and",
        group: [
          {
            type: "and",
            group: [
              { expected: 1, operator: "eq", value: 1 },
              { expected: 1, operator: "eq", value: 2 },
            ],
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("scalar handlers", () => {
  const cases = [
    ["eq", { expected: 1, operator: "eq", value: 1 }],
    ["neq", { expected: 2, operator: "neq", value: 1 }],
    ["gt", { expected: 5, operator: "gt", value: 6 }],
    ["gte", { expected: 5, operator: "gte", value: 5 }],
    ["lt", { expected: 2, operator: "lt", value: 1 }],
    ["lte", { expected: 1, operator: "lte", value: 1 }],
    ["contains", { expected: "hello", operator: "contains", value: "hello world" }],
    ["notContains", { expected: "foo", operator: "notContains", value: "bar" }],
    ["startsWith", { expected: "Hello", operator: "startsWith", value: "Hello world" }],
    ["endsWith", { expected: "world", operator: "endsWith", value: "Hello world" }],
    ["regexp string", { expected: "^abc$", operator: "regexp", value: "abc" }],
    ["regexp RegExp", { expected: /^abc$/, operator: "regexp", value: "abc" }],
  ];

  test.each(cases)("%s passes when satisfied", (_, item) => {
    expect(logic({ type: "and", group: [item] })).toBe(true);
  });
});

describe("strict equality", () => {
  test("eq does not coerce types", () => {
    expect(
      logic({ type: "and", group: [{ expected: 1, operator: "eq", value: "1" }] }),
    ).toBe(false);
  });

  test("neq treats different types as unequal", () => {
    expect(
      logic({ type: "and", group: [{ expected: 1, operator: "neq", value: "1" }] }),
    ).toBe(true);
  });
});

describe("string handlers treat expected as a literal, not a pattern", () => {
  test("contains handles regex special characters", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: "a.b", operator: "contains", value: "a.b.c" }],
      }),
    ).toBe(true);
    expect(
      logic({
        type: "and",
        group: [{ expected: "a.b", operator: "contains", value: "aXbXc" }],
      }),
    ).toBe(false);
  });

  test("startsWith / endsWith handle regex special characters", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: "[x]", operator: "startsWith", value: "[x]y" }],
      }),
    ).toBe(true);
    expect(
      logic({
        type: "and",
        group: [{ expected: "[x]", operator: "endsWith", value: "y[x]" }],
      }),
    ).toBe(true);
  });
});

describe("regexp safety", () => {
  test("invalid pattern returns false rather than throwing", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: "(", operator: "regexp", value: "abc" }],
      }),
    ).toBe(false);
  });

  test("accepts a RegExp instance with flags", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: /HELLO/i, operator: "regexp", value: "hello" }],
      }),
    ).toBe(true);
  });
});

describe("array values", () => {
  test("eq requires every element to match", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: 1, operator: "eq", value: [1, 2, 3] }],
      }),
    ).toBe(false);
    expect(
      logic({
        type: "and",
        group: [{ expected: 1, operator: "eq", value: [1, 1, 1] }],
      }),
    ).toBe(true);
  });

  test("notContains requires every element to not contain the substring", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: "abc", operator: "notContains", value: ["foo", "bar"] }],
      }),
    ).toBe(true);
    expect(
      logic({
        type: "and",
        group: [{ expected: "abc", operator: "notContains", value: ["foo", "xabcx"] }],
      }),
    ).toBe(false);
  });

  test("getValue overrides the default combiner", () => {
    const tally = [];
    const res = logic({
      type: "and",
      group: [
        {
          expected: 1,
          operator: "eq",
          value: [1, 1, 3],
          getValue: (results) => {
            tally.push(...results);
            return results.filter((r) => r.result).length === 2;
          },
        },
      ],
    });
    expect(res).toBe(true);
    expect(tally).toEqual([
      { value: 1, result: true },
      { value: 1, result: true },
      { value: 3, result: false },
    ]);
  });
});

describe("includes / excludes (array membership)", () => {
  test("includes is true when value is a member of expected array", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: ["user", "admin", "owner"], operator: "includes", value: "admin" }],
      }),
    ).toBe(true);
  });

  test("includes is false when value is not a member of expected array", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: ["user", "admin"], operator: "includes", value: "guest" }],
      }),
    ).toBe(false);
  });

  test("excludes is true when value is not a member of expected array", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: ["banned", "pending"], operator: "excludes", value: "active" }],
      }),
    ).toBe(true);
  });

  test("excludes is false when value is a member of expected array", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: ["banned", "pending"], operator: "excludes", value: "banned" }],
      }),
    ).toBe(false);
  });

  test("includes returns false when expected is not an array", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: "admin", operator: "includes", value: "admin" }],
      }),
    ).toBe(false);
  });

  test("excludes returns false when expected is not an array", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: "banned", operator: "excludes", value: "active" }],
      }),
    ).toBe(false);
  });

  test("includes uses strict equality (no type coercion)", () => {
    expect(
      logic({
        type: "and",
        group: [{ expected: ["1", "2", "3"], operator: "includes", value: 1 }],
      }),
    ).toBe(false);
  });

  test("includes finds objects by reference, not by structure", () => {
    const target = { id: 1 };
    expect(
      logic({
        type: "and",
        group: [
          { expected: [{ id: 1 }, target, { id: 2 }], operator: "includes", value: target },
        ],
      }),
    ).toBe(true);
    expect(
      logic({
        type: "and",
        group: [
          { expected: [{ id: 1 }, { id: 2 }], operator: "includes", value: { id: 1 } },
        ],
      }),
    ).toBe(false);
  });
});

describe("guards against missing inputs", () => {
  test("undefined value returns false", () => {
    expect(
      logic({
        type: "or",
        group: [{ expected: "abc", operator: "neq", value: undefined }],
      }),
    ).toBe(false);
  });

  test("undefined expected returns false", () => {
    expect(
      logic({
        type: "or",
        group: [{ expected: undefined, operator: "eq", value: "abc" }],
      }),
    ).toBe(false);
  });

  test("unknown operator returns false", () => {
    expect(
      logic({
        type: "or",
        group: [{ expected: 1, operator: "wat", value: 1 }],
      }),
    ).toBe(false);
  });
});

describe("NaN edge cases", () => {
  test("NaN is never eq to anything", () => {
    expect(
      logic({
        type: "or",
        group: [{ expected: NaN, operator: "eq", value: NaN }],
      }),
    ).toBe(false);
  });

  test("includes finds NaN inside an array (Array.includes uses SameValueZero)", () => {
    expect(
      logic({
        type: "or",
        group: [{ expected: [NaN, 1, 2], operator: "includes", value: NaN }],
      }),
    ).toBe(true);
  });
});
