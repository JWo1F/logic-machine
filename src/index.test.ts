import { describe, expect, test } from "@jest/globals";
import logic, { Logic } from "../src/index";

test("simple logic OR", () => {
  const src: Logic = {
    type: "or",
    group: [
      { expected: 7, operator: "gt", value: 5 },
      { expected: 5, operator: "eq", value: 5 },
      { expected: 5, operator: "lt", value: 5 },
      { expected: 5, operator: "lte", value: 5 },
    ],
  };

  expect(logic(src)).toBe(true);
});

test("simple logic AND", () => {
  const src: Logic = {
    type: "and",
    group: [
      { expected: 7, operator: "gt", value: 5 },
      { expected: 5, operator: "eq", value: 5 },
      { expected: 5, operator: "lt", value: 5 },
      { expected: 5, operator: "lte", value: 5 },
    ],
  };

  expect(logic(src)).toBe(false);
});

test("check all handlers", () => {
  const src: Logic = {
    group: [
      { expected: 1, operator: "eq", value: 1 },
      { expected: 2, operator: "neq", value: 1 },
      { expected: 5, operator: "gt", value: 6 },
      { expected: 5, operator: "gte", value: 5 },
      { expected: 2, operator: "lt", value: 1 },
      { expected: 1, operator: "lte", value: 1 },
      { expected: "hello", operator: "contain", value: "hello world" },
      { expected: "foo", operator: "notContain", value: "bar" },
      { expected: "Hello", operator: "startWith", value: "Hello world" },
      { expected: "world", operator: "endWith", value: "Hello world" },
      { expected: "...", operator: "regexp", value: "abc" },
      { expected: "a", operator: "include", value: ["a", "b", "c"] },
      { expected: "a", operator: "exclude", value: ["b", "c"] },
      { expected: 1, operator: "eq", value: [1] },
      { expected: 2, operator: "neq", value: [1] },
      { expected: 5, operator: "gt", value: [6] },
      { expected: 5, operator: "gte", value: [5] },
      { expected: 2, operator: "lt", value: [1] },
      { expected: 1, operator: "lte", value: [1] },
      { expected: "hello", operator: "contain", value: ["hello world"] },
      { expected: "foo", operator: "notContain", value: ["bar"] },
      { expected: "Hello", operator: "startWith", value: ["Hello world"] },
      { expected: "world", operator: "endWith", value: ["Hello world"] },
      { expected: "...", operator: "regexp", value: ["abc"] },
    ],
  };

  src.group.forEach((item, i) => {
    const res = logic({ type: "and", group: [item] });

    expect(res).toBe(true);
  });
});

describe("check arrays", () => {
  test("every 1", () => {
    const res = logic({
      type: "and",
      group: [{ expected: 1, operator: "eq", value: [1, 2, 3] }],
    });
    expect(res).toBe(false);
  });

  test("every 2", () => {
    const res = logic({
      type: "and",
      group: [{ expected: 1, operator: "eq", value: [1] }],
    });
    expect(res).toBe(true);
  });

  test("every 3", () => {
    const res = logic({
      type: "and",
      group: [{ expected: 1, operator: "eq", value: [1, 1, 1] }],
    });
    expect(res).toBe(true);
  });

  test("custom result 1", () => {
    const res = logic({
      type: "and",
      group: [
        {
          expected: 1,
          operator: "eq",
          value: [1, 1, 3],
          getValue: (arr) => arr.every((v) => v.result),
        },
      ],
    });
    expect(res).toBe(false);
  });

  test("custom result 2", () => {
    const res = logic({
      type: "and",
      group: [
        {
          expected: 1,
          operator: "eq",
          value: [2, 1, 3],
          getValue: (arr) => arr.every((v) => v.result),
        },
      ],
    });
    expect(res).toBe(false);
  });
});

describe("check NaN", () => {
  test("includes is NaN", () => {
    const res = logic({
      type: "or",
      group: [{ expected: NaN, operator: "include", value: "lalala" }],
    });

    expect(res).toBe(false);
  });

  test("excludes is NaN", () => {
    const res = logic({
      type: "or",
      group: [{ expected: NaN, operator: "exclude", value: "lalala" }],
    });

    expect(res).toBe(true);
  });
});

describe("check includes", () => {
  test("includes true", () => {
    const res = logic({
      type: "or",
      group: [
        { expected: "abc", operator: "include", value: ["xxx", "abc", "yyy"] },
      ],
    });

    expect(res).toBe(true);
  });

  test("includes false", () => {
    const res = logic({
      type: "or",
      group: [
        { expected: "abc", operator: "include", value: ["xx", "xabcx", "yy"] },
      ],
    });

    expect(res).toBe(false);
  });

  test("excludes true", () => {
    const res = logic({
      type: "or",
      group: [
        { expected: "abc", operator: "exclude", value: ["xx", "xabcx", "yy"] },
      ],
    });

    expect(res).toBe(true);
  });

  test("excludes false", () => {
    const res = logic({
      type: "or",
      group: [
        { expected: "abc", operator: "exclude", value: ["xxx", "abc", "yyy"] },
      ],
    });

    expect(res).toBe(false);
  });
});

describe("check undefined", () => {
  test("neq undefined", () => {
    const res = logic({
      type: "or",
      group: [{ expected: "abc", operator: "neq", value: undefined }],
    });

    expect(res).toBe(false);
  });
});
