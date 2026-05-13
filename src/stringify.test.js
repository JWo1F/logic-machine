import { describe, expect, test } from "@jest/globals";
import parse from "./parse.js";
import stringify from "./stringify.js";

describe("leaves", () => {
  test("scalar with numeric arg", () => {
    expect(stringify({ operator: "eq", expected: 10 })).toBe("eq(10)");
  });

  test("string is JSON-escaped", () => {
    expect(stringify({ operator: "eq", expected: "hi" })).toBe('eq("hi")');
    expect(stringify({ operator: "eq", expected: 'a"b' })).toBe('eq("a\\"b")');
  });

  test("boolean and null", () => {
    expect(stringify({ operator: "eq", expected: true })).toBe("eq(true)");
    expect(stringify({ operator: "eq", expected: null })).toBe("eq(null)");
  });

  test("array literal expected", () => {
    expect(stringify({ operator: "includes", expected: [1, 2, 3] })).toBe(
      "includes([1, 2, 3])",
    );
  });

  test("regex expected emits a regex literal", () => {
    expect(stringify({ operator: "regexp", expected: /^foo/i })).toBe(
      "regexp(/^foo/i)",
    );
  });

  test("field prefix is emitted when present", () => {
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

  test("OR nested inside AND is wrapped", () => {
    expect(
      stringify({
        type: "and",
        group: [
          {
            type: "or",
            group: [
              { operator: "eq", expected: 1 },
              { operator: "eq", expected: 2 },
            ],
          },
          { operator: "eq", expected: 3 },
        ],
      }),
    ).toBe("(eq(1) or eq(2)) and eq(3)");
  });

  test("AND nested inside OR needs no parens", () => {
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

  test("single-child group unwraps", () => {
    expect(
      stringify({ type: "and", group: [{ operator: "eq", expected: 1 }] }),
    ).toBe("eq(1)");
  });
});

describe("quantifiers", () => {
  test("every with field source", () => {
    expect(
      stringify({
        type: "every",
        over: "scores",
        match: { operator: "gte", expected: 60 },
      }),
    ).toBe("every(scores, gte(60))");
  });

  test("some with array literal source", () => {
    expect(
      stringify({
        type: "some",
        over: [1, 2, 3],
        match: { operator: "eq", expected: 2 },
      }),
    ).toBe("some([1, 2, 3], eq(2))");
  });

  test("nested predicate inside quantifier", () => {
    expect(
      stringify({
        type: "every",
        over: "items",
        match: {
          type: "and",
          group: [
            { operator: "gt", expected: 0, field: "qty" },
            { operator: "lt", expected: 100, field: "price" },
          ],
        },
      }),
    ).toBe("every(items, qty:gt(0) and price:lt(100))");
  });
});

describe("roundtrip", () => {
  const cases = [
    "eq(10)",
    "includes([1, 2, 3])",
    'name:eq("Alex")',
    "eq(1) and eq(2)",
    "eq(1) or eq(2) and eq(3)",
    "(eq(1) or eq(2)) and eq(3)",
    "every(scores, gte(60))",
    "some([1, 2, 3], eq(2))",
    "none(errors, neq(null))",
    "every(items, qty:gt(0) and price:lt(100))",
    "regexp(/^[A-Z]+$/gim)",
  ];

  test.each(cases)("stringify(parse(%j)) === input", (src) => {
    expect(stringify(parse(src))).toBe(src);
  });
});

describe("strict validation against a handler set", () => {
  const handlers = { eq: () => true, gte: () => true };

  test("known operators are accepted", () => {
    expect(stringify({ operator: "eq", expected: 1 }, handlers)).toBe("eq(1)");
  });

  test("unknown operator throws ReferenceError", () => {
    expect(() => stringify({ operator: "xyz", expected: 1 }, handlers)).toThrow(
      ReferenceError,
    );
  });

  test("validation walks into quantifiers and groups", () => {
    expect(() =>
      stringify(
        {
          type: "and",
          group: [
            { operator: "eq", expected: 1 },
            {
              type: "every",
              over: "xs",
              match: { operator: "xyz", expected: 0 },
            },
          ],
        },
        handlers,
      ),
    ).toThrow(ReferenceError);
  });
});

describe("structural errors", () => {
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

  test("rejects invalid quantifier source", () => {
    expect(() =>
      stringify({ type: "every", over: 42, match: { operator: "eq", expected: 0 } }),
    ).toThrow(TypeError);
  });
});
