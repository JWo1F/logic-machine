const toStr = (v) => String(v ?? "");

// Built-in scalar handlers. All take a single (expected, value) pair and
// return a boolean. Array iteration is not done here — that's the job of
// the every / some / none quantifier nodes in the evaluator.
const builtins = {
  eq: (expected, value) => value === expected,
  neq: (expected, value) => value !== expected,
  gt: (expected, value) => value > expected,
  gte: (expected, value) => value >= expected,
  lt: (expected, value) => value < expected,
  lte: (expected, value) => value <= expected,
  contains: (expected, value) => toStr(value).includes(toStr(expected)),
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
};

// Names users can never register: parser keywords and the quantifier node
// types. Keeping these out of the handler registry means the parser can
// rely on the IDENT meaning what it says.
export const RESERVED = new Set([
  "and",
  "or",
  "every",
  "some",
  "none",
  "true",
  "false",
  "null",
]);

export const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateExtensions(extensions) {
  if (extensions === null || typeof extensions !== "object") {
    throw new TypeError("extend() expects an object of { name: handler } pairs");
  }
  for (const [name, fn] of Object.entries(extensions)) {
    if (!IDENT_RE.test(name)) {
      throw new TypeError(`extend: '${name}' is not a valid operator name`);
    }
    if (RESERVED.has(name)) {
      throw new TypeError(`extend: '${name}' is a reserved keyword`);
    }
    if (typeof fn !== "function") {
      throw new TypeError(`extend: handler for '${name}' must be a function`);
    }
  }
}

export default builtins;
