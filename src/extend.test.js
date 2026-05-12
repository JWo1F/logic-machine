import { afterEach, describe, expect, test } from "@jest/globals";
import logic, { extend, parse, stringify } from "./index.js";
import handlers from "./handlers.js";

// extend() mutates the shared handler registry. Snapshot the built-ins
// and restore after each test so cases don't leak into each other.
const builtinKeys = Object.keys(handlers);
const builtinValues = { ...handlers };

afterEach(() => {
  for (const key of Object.keys(handlers)) {
    if (!builtinKeys.includes(key)) delete handlers[key];
    else handlers[key] = builtinValues[key];
  }
});

describe("extend()", () => {
  test("registers a new scalar operator", () => {
    extend({ isEven: (_, value) => Number(value) % 2 === 0 });
    expect(logic({ operator: "isEven", expected: null, value: 4 })).toBe(true);
    expect(logic({ operator: "isEven", expected: null, value: 5 })).toBe(false);
  });

  test("a registered operator works in the string DSL", () => {
    extend({ myEq: (expected, value) => expected === value });
    expect(logic("myEq(10)", 10)).toBe(true);
    expect(logic("myEq(10)", 5)).toBe(false);
  });

  test("the example from the API reference", () => {
    extend({ myfn: (expected) => expected == 2 });
    expect(logic({ operator: "myfn", expected: 2, value: "anything" })).toBe(true);
    expect(logic({ operator: "myfn", expected: 3, value: "anything" })).toBe(false);
  });

  test("multiple registrations in a single call", () => {
    extend({
      odd: (_, value) => Number(value) % 2 === 1,
      positive: (_, value) => Number(value) > 0,
    });
    expect(logic("odd(0) and positive(0)", 3)).toBe(true);
    expect(logic("odd(0) and positive(0)", -3)).toBe(false);
  });

  test("a custom operator can be used through parse/stringify roundtrip", () => {
    extend({ approxEq: (expected, value) => Math.abs(expected - value) < 0.01 });
    const src = "approxEq(3.14)";
    expect(stringify(parse(src))).toBe(src);
    expect(logic(src, 3.149)).toBe(true);
    expect(logic(src, 3.5)).toBe(false);
  });

  test("named fields work with custom operators", () => {
    extend({ longerThan: (expected, value) => String(value).length > expected });
    expect(logic('name:longerThan(3)', { name: "Alex" })).toBe(true);
    expect(logic('name:longerThan(3)', { name: "Al" })).toBe(false);
  });

  test("can override a built-in operator", () => {
    extend({ eq: () => true });
    expect(logic("eq(10)", 1)).toBe(true);
    expect(logic("eq(99)", 1)).toBe(true);
  });

  test("extend is also reachable as logic.extend", () => {
    logic.extend({ alwaysTrue: () => true });
    expect(logic("alwaysTrue(0)", "whatever")).toBe(true);
  });
});

describe("extend() validation", () => {
  test("rejects DSL keywords", () => {
    expect(() => extend({ and: () => true })).toThrow(TypeError);
    expect(() => extend({ or: () => true })).toThrow(TypeError);
    expect(() => extend({ null: () => true })).toThrow(TypeError);
    expect(() => extend({ true: () => true })).toThrow(TypeError);
  });

  test("rejects non-identifier names", () => {
    expect(() => extend({ "not valid": () => true })).toThrow(TypeError);
    expect(() => extend({ "1startsWithDigit": () => true })).toThrow(TypeError);
    expect(() => extend({ "": () => true })).toThrow(TypeError);
  });

  test("rejects non-function handlers", () => {
    expect(() => extend({ foo: "not a function" })).toThrow(TypeError);
    expect(() => extend({ foo: null })).toThrow(TypeError);
    expect(() => extend({ foo: 42 })).toThrow(TypeError);
  });

  test("rejects non-object argument", () => {
    expect(() => extend(null)).toThrow(TypeError);
    expect(() => extend("eq")).toThrow(TypeError);
    expect(() => extend(undefined)).toThrow(TypeError);
  });

  test("a failed registration in a batch leaves earlier ones registered (no transaction)", () => {
    // Documenting current behavior: extend processes entries left-to-right
    // and throws on the first invalid one; entries before that point are
    // already in the registry.
    expect(() =>
      extend({ ok: (_, v) => v === 1, and: () => true }),
    ).toThrow(TypeError);
    expect(typeof handlers.ok).toBe("function");
  });
});
