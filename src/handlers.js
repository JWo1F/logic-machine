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
  includes: (expected, value) => value === expected,
  excludes: (expected, value) => value !== expected,
};

export default handlers;
