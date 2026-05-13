import { afterEach, describe, expect, test } from "@jest/globals";
import LogicMachine from "./index.js";

afterEach(() => LogicMachine._resetGlobals());

describe("construction", () => {
  test("from a DSL string parses but does not validate", () => {
    // 'mystery' is not a registered op; construction succeeds anyway.
    const lm = new LogicMachine("mystery(1)");
    expect(lm.tree).toEqual({ operator: "mystery", expected: 1 });
  });

  test("from a JSON tree stores it as-is", () => {
    const tree = { operator: "eq", expected: 1 };
    expect(new LogicMachine(tree).tree).toBe(tree);
  });

  test("with no source has no rule loaded", () => {
    expect(new LogicMachine().tree).toBeNull();
  });

  test("rejects garbage", () => {
    expect(() => new LogicMachine(42)).toThrow(TypeError);
  });
});

describe("compute", () => {
  test("evaluates a string rule against the input", () => {
    expect(new LogicMachine("eq(10)").compute(10)).toBe(true);
    expect(new LogicMachine("eq(10)").compute(5)).toBe(false);
  });

  test("works against an object input via fields", () => {
    const lm = new LogicMachine('name:eq("Alex") and age:gte(18)');
    expect(lm.compute({ name: "Alex", age: 20 })).toBe(true);
    expect(lm.compute({ name: "Alex", age: 12 })).toBe(false);
  });

  test("handles every/some/none quantifiers", () => {
    expect(
      new LogicMachine("every(scores, gte(60))").compute({ scores: [80, 92, 67] }),
    ).toBe(true);
    expect(
      new LogicMachine('some(tags, eq("urgent"))').compute({ tags: ["normal", "urgent"] }),
    ).toBe(true);
    expect(
      new LogicMachine("none(errors, neq(null))").compute({ errors: [null, null] }),
    ).toBe(true);
  });

  test("compute on an empty instance throws", () => {
    expect(() => new LogicMachine().compute(1)).toThrow(/no rule loaded/);
  });

  test("strict mode (default) throws on unknown operator", () => {
    const lm = new LogicMachine("mystery(1)");
    expect(() => lm.compute(1)).toThrow(ReferenceError);
  });

  test("strict: false returns false on unknown operator", () => {
    const lm = new LogicMachine("mystery(1)");
    expect(lm.compute(1, { strict: false })).toBe(false);
  });

  test("non-strict mode still evaluates the surrounding rule", () => {
    const lm = new LogicMachine("mystery(1) or eq(10)");
    expect(lm.compute(10, { strict: false })).toBe(true);
  });
});

describe("instance.extend()", () => {
  test("adds a handler visible to compute and chains", () => {
    const lm = new LogicMachine("isEven(0)").extend({
      isEven: (_, v) => Number(v) % 2 === 0,
    });
    expect(lm.compute(4)).toBe(true);
    expect(lm.compute(5)).toBe(false);
  });

  test("instance handlers shadow globals on this instance only", () => {
    LogicMachine.extend({ shared: () => true });
    const lm = new LogicMachine();
    lm.extend({ shared: () => false });
    expect(lm.parse("shared(0)").compute(1)).toBe(false);
    expect(new LogicMachine("shared(0)").compute(1)).toBe(true);
  });

  test("rejects DSL keywords", () => {
    const lm = new LogicMachine();
    expect(() => lm.extend({ and: () => true })).toThrow(TypeError);
    expect(() => lm.extend({ every: () => true })).toThrow(TypeError);
  });

  test("rejects non-identifier names", () => {
    const lm = new LogicMachine();
    expect(() => lm.extend({ "no spaces": () => true })).toThrow(TypeError);
  });

  test("rejects non-function values", () => {
    const lm = new LogicMachine();
    expect(() => lm.extend({ foo: "not a fn" })).toThrow(TypeError);
  });
});

describe("instance.parse()", () => {
  test("stores the parsed tree and returns this", () => {
    const lm = new LogicMachine();
    const ret = lm.parse("eq(10)");
    expect(ret).toBe(lm);
    expect(lm.tree).toEqual({ operator: "eq", expected: 10 });
  });

  test("validates against built-ins + instance handlers", () => {
    const lm = new LogicMachine();
    lm.extend({ mine: () => true });
    expect(() => lm.parse("mine(0) and eq(1)")).not.toThrow();
    expect(() => lm.parse("unknown(0)")).toThrow(ReferenceError);
  });
});

describe("instance.stringify()", () => {
  test("defaults to the loaded tree", () => {
    expect(new LogicMachine("eq(10)").stringify()).toBe("eq(10)");
  });

  test("accepts an explicit tree", () => {
    expect(new LogicMachine().stringify({ operator: "eq", expected: 1 })).toBe("eq(1)");
  });

  test("accepts instance handlers as known operators", () => {
    const lm = new LogicMachine();
    lm.extend({ mine: () => true });
    expect(lm.stringify({ operator: "mine", expected: 0 })).toBe("mine(0)");
  });

  test("rejects unknown operators", () => {
    const lm = new LogicMachine();
    expect(() => lm.stringify({ operator: "unknown", expected: 0 })).toThrow(ReferenceError);
  });

  test("throws when there is no rule loaded and no argument is given", () => {
    expect(() => new LogicMachine().stringify()).toThrow(/no rule loaded/);
  });
});

describe("static API", () => {
  test("LogicMachine.parse validates strictly against globals", () => {
    expect(LogicMachine.parse("eq(10)")).toEqual({ operator: "eq", expected: 10 });
    expect(() => LogicMachine.parse("mystery(1)")).toThrow(ReferenceError);
  });

  test("LogicMachine.extend mutates the global registry", () => {
    LogicMachine.extend({ isThree: (_, v) => v === 3 });
    expect(LogicMachine.parse("isThree(0)")).toEqual({ operator: "isThree", expected: 0 });
    expect(new LogicMachine("isThree(0)").compute(3)).toBe(true);
  });

  test("LogicMachine.stringify rejects unknown operators", () => {
    expect(() => LogicMachine.stringify({ operator: "mystery", expected: 1 })).toThrow(
      ReferenceError,
    );
  });

  test("LogicMachine.extend with a DSL keyword throws", () => {
    expect(() => LogicMachine.extend({ or: () => true })).toThrow(TypeError);
    expect(() => LogicMachine.extend({ some: () => true })).toThrow(TypeError);
  });
});

describe("end-to-end realistic rules", () => {
  test("access control", () => {
    const lm = new LogicMachine(
      'role:eq("owner") or (role:eq("editor") and status:eq("active"))',
    );
    expect(lm.compute({ role: "editor", status: "active" })).toBe(true);
    expect(lm.compute({ role: "editor", status: "suspended" })).toBe(false);
    expect(lm.compute({ role: "owner", status: "suspended" })).toBe(true);
  });

  test("array predicates with quantifiers", () => {
    const lm = new LogicMachine(
      "every(items, qty:gt(0)) and some(items, price:gte(100))",
    );
    expect(
      lm.compute({ items: [{ qty: 1, price: 50 }, { qty: 2, price: 200 }] }),
    ).toBe(true);
    expect(
      lm.compute({ items: [{ qty: 1, price: 50 }, { qty: 0, price: 200 }] }),
    ).toBe(false);
  });

  test("custom op + field + quantifier composes", () => {
    const lm = new LogicMachine().extend({
      isEven: (_, v) => Number(v) % 2 === 0,
    });
    lm.parse("every(scores, isEven())");
    expect(lm.compute({ scores: [2, 4, 6] })).toBe(true);
    expect(lm.compute({ scores: [2, 3, 6] })).toBe(false);
  });

  test("nullary operators are called with no arg in the DSL", () => {
    const lm = new LogicMachine()
      .extend({ isEven: (_, v) => Number(v) % 2 === 0 })
      .parse("isEven()");
    expect(lm.compute(8)).toBe(true);
    expect(lm.compute(7)).toBe(false);
    expect(lm.stringify()).toBe("isEven()");
  });
});
