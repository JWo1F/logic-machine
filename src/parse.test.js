import { describe, expect, test } from "@jest/globals";
import parse from "./parse.js";

describe("leaves and literals", () => {
  test("single op call with one numeric arg", () => {
    expect(parse("eq(10)")).toEqual({ operator: "eq", expected: 10 });
  });

  test("negative numbers and floats", () => {
    expect(parse("gt(-1.5)")).toEqual({ operator: "gt", expected: -1.5 });
  });

  test("string literals with both quote styles", () => {
    expect(parse('eq("hi")')).toEqual({ operator: "eq", expected: "hi" });
    expect(parse("eq('hi')")).toEqual({ operator: "eq", expected: "hi" });
  });

  test("escape sequences inside strings", () => {
    expect(parse('eq("a\\nb")')).toEqual({ operator: "eq", expected: "a\nb" });
    expect(parse('eq("a\\"b")')).toEqual({ operator: "eq", expected: 'a"b' });
    expect(parse('eq("a\\\\b")')).toEqual({ operator: "eq", expected: "a\\b" });
  });

  test("booleans and null", () => {
    expect(parse("eq(true)")).toEqual({ operator: "eq", expected: true });
    expect(parse("eq(false)")).toEqual({ operator: "eq", expected: false });
    expect(parse("eq(null)")).toEqual({ operator: "eq", expected: null });
  });

  test("variadic includes / excludes bundle args into an array", () => {
    expect(parse("includes(1, 2, 3)")).toEqual({
      operator: "includes",
      expected: [1, 2, 3],
    });
    expect(parse('excludes("a", "b")')).toEqual({
      operator: "excludes",
      expected: ["a", "b"],
    });
    expect(parse("includes()")).toEqual({ operator: "includes", expected: [] });
  });

  test("non-variadic operators require exactly one argument", () => {
    expect(() => parse("eq()")).toThrow(SyntaxError);
    expect(() => parse("eq(1, 2)")).toThrow(SyntaxError);
  });

  test("whitespace is ignored", () => {
    expect(parse("  eq( 10 )  ")).toEqual({ operator: "eq", expected: 10 });
    expect(parse("eq\t(\n10\n)")).toEqual({ operator: "eq", expected: 10 });
  });
});

describe("combinators and precedence", () => {
  test("'or' produces an or-group", () => {
    expect(parse("eq(1) or eq(2)")).toEqual({
      type: "or",
      group: [
        { operator: "eq", expected: 1 },
        { operator: "eq", expected: 2 },
      ],
    });
  });

  test("'and' produces an and-group", () => {
    expect(parse("eq(1) and eq(2)")).toEqual({
      type: "and",
      group: [
        { operator: "eq", expected: 1 },
        { operator: "eq", expected: 2 },
      ],
    });
  });

  test("'and' binds tighter than 'or'", () => {
    expect(parse("eq(1) or eq(2) and eq(3)")).toEqual({
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
    });
  });

  test("parens override precedence", () => {
    expect(parse("(eq(1) or eq(2)) and eq(3)")).toEqual({
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
    });
  });

  test("the README example parses to the expected tree", () => {
    expect(parse("(eq(10) or includes(1, 2, 3)) and eq(5)")).toEqual({
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
    });
  });
});

describe("named fields", () => {
  test("a leaf may be prefixed with a field name", () => {
    expect(parse('name:eq("Alex")')).toEqual({
      operator: "eq",
      expected: "Alex",
      field: "name",
    });
  });

  test("fields work inside groups", () => {
    expect(parse('name:eq("Alex") or age:gte(18)')).toEqual({
      type: "or",
      group: [
        { operator: "eq", expected: "Alex", field: "name" },
        { operator: "gte", expected: 18, field: "age" },
      ],
    });
  });

  test("fields combine with variadic operators", () => {
    expect(parse('role:includes("admin", "owner")')).toEqual({
      operator: "includes",
      expected: ["admin", "owner"],
      field: "role",
    });
  });
});

describe("syntax errors", () => {
  test("non-string input is rejected", () => {
    expect(() => parse(123)).toThrow(TypeError);
  });

  test("unmatched paren", () => {
    expect(() => parse("eq(1")).toThrow(SyntaxError);
  });

  test("missing operator after colon", () => {
    expect(() => parse("name:")).toThrow(SyntaxError);
  });

  test("unknown character", () => {
    expect(() => parse("eq(1) & eq(2)")).toThrow(SyntaxError);
  });

  test("trailing junk after a valid expression", () => {
    expect(() => parse("eq(1) eq(2)")).toThrow(SyntaxError);
  });

  test("unterminated string", () => {
    expect(() => parse('eq("hi')).toThrow(SyntaxError);
  });

  test("bare minus", () => {
    expect(() => parse("eq(-)")).toThrow(SyntaxError);
  });
});
