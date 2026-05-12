const toStr = (v) => String(v ?? "");

const handlers = {
  eq: (expected, value) => value === expected,
  neq: (expected, value) => value !== expected,
  gt: (expected, value) => value > expected,
  gte: (expected, value) => value >= expected,
  lt: (expected, value) => value < expected,
  lte: (expected, value) => value <= expected,
  contains: (expected, value) => toStr(value).includes(toStr(expected)),
  notContains: (expected, value) => !toStr(value).includes(toStr(expected)),
  startsWith: (expected, value) => toStr(value).startsWith(toStr(expected)),
  endsWith: (expected, value) => toStr(value).endsWith(toStr(expected)),
  regexp: (expected, value) => {
    try {
      const re = expected instanceof RegExp ? expected : new RegExp(toStr(expected));
      return re.test(toStr(value));
    } catch {
      return false;
    }
  },
  includes: (expected, value) => Array.isArray(expected) && expected.includes(value),
  excludes: (expected, value) => Array.isArray(expected) && !expected.includes(value),
};

const RESERVED = new Set(["and", "or", "true", "false", "null"]);
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function extend(extensions) {
  if (extensions === null || typeof extensions !== "object") {
    throw new TypeError("extend() expects an object of { name: handler } pairs");
  }
  for (const [name, fn] of Object.entries(extensions)) {
    if (!IDENT_RE.test(name)) {
      throw new TypeError(`extend: '${name}' is not a valid operator name`);
    }
    if (RESERVED.has(name)) {
      throw new TypeError(`extend: '${name}' is a reserved DSL keyword`);
    }
    if (typeof fn !== "function") {
      throw new TypeError(`extend: handler for '${name}' must be a function`);
    }
    handlers[name] = fn;
  }
}

export default handlers;
