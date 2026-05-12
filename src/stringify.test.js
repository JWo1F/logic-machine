import { describe, expect, test } from "@jest/globals";
import parse from "./parse.js";
import stringify from "./stringify.js";

describe("leaves", () => {
  test("scalar operator with a numeric argument", () => {
    expect(stringify({ operator: "eq", expected: 10 })).toBe("eq(10)");
  });

  test("variadic operator emits comma-separated args", () => {
    expect(stringify({ operator: "includes", expected: [1, 2, 3] })).toBe(
      "includes(1, 2, 3)",
    );
  });

  test("strings are quoted with JSON escaping", () => {
    expect(stringify({ operator: "eq", expected: "hi" })).toBe('eq("hi")');
    expect(stringify({ operator: "eq", expected: 'a"b' })).toBe('eq("a\\"b")');
    expect(stringify({ operator: "eq", expected: "a\nb" })).toBe('eq("a\\nb")');
  });

  test("booleans and null", () => {
    expect(stringify({ operator: "eq", expected: true })).toBe("eq(true)");
    expect(stringify({ operator: "eq", expected: false })).toBe("eq(false)");
    expect(stringify({ operator: "eq", expected: null })).toBe("eq(null)");
  });

  test("regex expected is rendered as its source string", () => {
    expect(stringify({ operator: "regexp", expected: /^foo/ })).toBe('regexp("^foo")');
  });

  test("a field prefix is emitted when present", () => {
    expect(stringify({ operator: "eq", expected: "Alex", field: "name" })).toBe(
      'name:eq("Alex")',
    );
  });
});

describe("groups and precedence", () => {
  test("and / or are joined without parens at the top level", () => {
    expect(
      stringify({
        type: "and",
        group: [
          { operator: "eq", expected: 1 },
          { operator: "eq", expected: 2 },
        ],
      }),
    ).toBe("eq(1) and eq(2)");
  });

  test("an OR nested inside an AND is wrapped in parens", () => {
    expect(
      stringify({
        type: "and",
        group: [
          {
            type: "or",
            group: [
              { operator: "eq", expected: 10 },
              { operator: "includes", expected: [1, 2, 3] },
            ],
          },
          { operator: "eq", expected: 5 },
        ],
      }),
    ).toBe("(eq(10) or includes(1, 2, 3)) and eq(5)");
  });

  test("an AND nested inside an OR does not need parens", () => {
    expect(
      stringify({
        type: "or",
        group: [
          { operator: "eq", expected: 1 },
          {
            type: "and",
            group: [
              { operator: "eq", expected: 2 },
              { operator: "eq", expected: 3 },
            ],
          },
        ],
      }),
    ).toBe("eq(1) or eq(2) and eq(3)");
  });

  test("a single-child group unwraps in the output", () => {
    expect(
      stringify({ type: "and", group: [{ operator: "eq", expected: 1 }] }),
    ).toBe("eq(1)");
  });
});

describe("roundtrip", () => {
  const cases = [
    "eq(10)",
    "includes(1, 2, 3)",
    'name:eq("Alex")',
    "eq(1) and eq(2)",
    "eq(1) or eq(2)",
    "(eq(10) or includes(1, 2, 3)) and eq(5)",
    "eq(1) or eq(2) and eq(3)",
    'name:eq("Alex") and age:gte(18)',
    'role:includes("admin", "owner")',
  ];

  test.each(cases)("stringify(parse(%j)) === input", (src) => {
    expect(stringify(parse(src))).toBe(src);
  });
});

describe("errors", () => {
  test("rejects items whose 'value' is set", () => {
    expect(() => stringify({ operator: "eq", expected: 1, value: 5 })).toThrow(TypeError);
  });

  test("rejects unknown logic types", () => {
    expect(() => stringify({ type: "xor", group: [] })).toThrow(TypeError);
  });

  test("rejects unstringifiable literals", () => {
    expect(() => stringify({ operator: "eq", expected: { obj: 1 } })).toThrow(TypeError);
    expect(() => stringify({ operator: "eq", expected: undefined })).toThrow(TypeError);
    expect(() => stringify({ operator: "eq", expected: Infinity })).toThrow(TypeError);
  });

  test("rejects invalid field names", () => {
    expect(() =>
      stringify({ operator: "eq", expected: 1, field: "not valid!" }),
    ).toThrow(TypeError);
  });

  test("rejects non-array expected on a variadic operator", () => {
    expect(() => stringify({ operator: "includes", expected: 1 })).toThrow(TypeError);
  });
});
