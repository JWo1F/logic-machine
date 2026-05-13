import { describe, expect, test } from "@jest/globals";
import parse from "./parse.js";

describe("leaves and literals", () => {
  test("scalar op call with one argument", () => {
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
  });

  test("booleans and null", () => {
    expect(parse("eq(true)")).toEqual({ operator: "eq", expected: true });
    expect(parse("eq(null)")).toEqual({ operator: "eq", expected: null });
  });

  test("whitespace is ignored", () => {
    expect(parse("  eq( 10 )  ")).toEqual({ operator: "eq", expected: 10 });
  });

  test("non-quantifier operators take exactly one argument", () => {
    expect(() => parse("eq()")).toThrow(SyntaxError);
    expect(() => parse("eq(1, 2)")).toThrow(SyntaxError);
  });
});

describe("array literals", () => {
  test("flat array literal", () => {
    expect(parse("includes([1, 2, 3])")).toEqual({
      operator: "includes",
      expected: [1, 2, 3],
    });
  });

  test("empty array literal", () => {
    expect(parse("includes([])")).toEqual({ operator: "includes", expected: [] });
  });

  test("mixed-type array", () => {
    expect(parse('includes([1, "two", true, null])')).toEqual({
      operator: "includes",
      expected: [1, "two", true, null],
    });
  });

  test("nested array literal", () => {
    expect(parse("includes([[1, 2], [3, 4]])")).toEqual({
      operator: "includes",
      expected: [
        [1, 2],
        [3, 4],
      ],
    });
  });

  test("variadic includes(1, 2, 3) is no longer accepted", () => {
    expect(() => parse("includes(1, 2, 3)")).toThrow(SyntaxError);
  });
});

describe("regex literals", () => {
  test("bare /pattern/ produces a RegExp", () => {
    const { expected } = parse("regexp(/^abc$/)");
    expect(expected).toBeInstanceOf(RegExp);
    expect(expected.source).toBe("^abc$");
  });

  test("flags after the closing slash", () => {
    const { expected } = parse("regexp(/^[A-Z]+$/gim)");
    expect(expected.flags).toBe("gim");
  });

  test("character class with forward slash inside", () => {
    const { expected } = parse("regexp(/[a/b]/)");
    expect(expected.test("/")).toBe(true);
  });

  test("invalid regex pattern throws", () => {
    expect(() => parse("regexp(/(/)")).toThrow(SyntaxError);
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
});

describe("named fields", () => {
  test("field-prefixed op call", () => {
    expect(parse('name:eq("Alex")')).toEqual({
      operator: "eq",
      expected: "Alex",
      field: "name",
    });
  });

  test("fields combine with grouping", () => {
    expect(parse('name:eq("Alex") and age:gte(18)')).toEqual({
      type: "and",
      group: [
        { operator: "eq", expected: "Alex", field: "name" },
        { operator: "gte", expected: 18, field: "age" },
      ],
    });
  });

  test("a quantifier cannot be field-prefixed", () => {
    expect(() => parse("xs:every(scores, gte(0))")).toThrow(SyntaxError);
  });
});

describe("quantifiers", () => {
  test("every(field, predicate)", () => {
    expect(parse("every(scores, gte(60))")).toEqual({
      type: "every",
      over: "scores",
      match: { operator: "gte", expected: 60 },
    });
  });

  test("some(field, predicate)", () => {
    expect(parse("some(tags, eq('urgent'))")).toEqual({
      type: "some",
      over: "tags",
      match: { operator: "eq", expected: "urgent" },
    });
  });

  test("none(field, predicate)", () => {
    expect(parse("none(errors, neq(null))")).toEqual({
      type: "none",
      over: "errors",
      match: { operator: "neq", expected: null },
    });
  });

  test("array literal as source", () => {
    expect(parse("every([1, 2, 3], gt(0))")).toEqual({
      type: "every",
      over: [1, 2, 3],
      match: { operator: "gt", expected: 0 },
    });
  });

  test("predicate may be a full sub-expression", () => {
    expect(parse('every(items, qty:gt(0) and price:lt(100))')).toEqual({
      type: "every",
      over: "items",
      match: {
        type: "and",
        group: [
          { operator: "gt", expected: 0, field: "qty" },
          { operator: "lt", expected: 100, field: "price" },
        ],
      },
    });
  });

  test("quantifiers nest", () => {
    expect(parse('every(rows, some(cells, eq("x")))')).toEqual({
      type: "every",
      over: "rows",
      match: {
        type: "some",
        over: "cells",
        match: { operator: "eq", expected: "x" },
      },
    });
  });

  test("missing comma is rejected", () => {
    expect(() => parse("every(scores gte(60))")).toThrow(SyntaxError);
  });

  test("missing source is rejected", () => {
    expect(() => parse("every(gte(60))")).toThrow(SyntaxError);
  });
});

describe("syntax errors", () => {
  test("non-string input is rejected", () => {
    expect(() => parse(123)).toThrow(TypeError);
  });

  test("unmatched paren", () => {
    expect(() => parse("eq(1")).toThrow(SyntaxError);
  });

  test("unmatched bracket", () => {
    expect(() => parse("includes([1, 2")).toThrow(SyntaxError);
  });

  test("trailing junk after a valid expression", () => {
    expect(() => parse("eq(1) eq(2)")).toThrow(SyntaxError);
  });

  test("unterminated string", () => {
    expect(() => parse('eq("hi')).toThrow(SyntaxError);
  });

  test("missing operator after colon", () => {
    expect(() => parse("name:")).toThrow(SyntaxError);
  });
});
