// JSON-form logic node -> DSL string.
//
// Precedence map mirrors the parser: AND binds tighter than OR.
// We only emit parens around a nested group when the outer
// combinator's precedence is strictly higher than the inner's.

const PRECEDENCE = { or: 1, and: 2 };
const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const variadicOperators = new Set(["includes", "excludes"]);

export default function stringify(node) {
  return format(node, 0);
}

function format(node, outerPrecedence) {
  if (node && typeof node === "object" && Array.isArray(node.group)) {
    const inner = PRECEDENCE[node.type];
    if (inner === undefined) {
      throw new TypeError(`Unknown logic type '${node.type}'`);
    }
    if (node.group.length === 1) {
      return format(node.group[0], outerPrecedence);
    }
    const sep = ` ${node.type} `;
    const body = node.group.map((child) => format(child, inner)).join(sep);
    return outerPrecedence > inner ? `(${body})` : body;
  }
  if (node && typeof node === "object" && typeof node.operator === "string") {
    return formatItem(node);
  }
  throw new TypeError("Cannot stringify: node must be a Logic or Item");
}

function formatItem(item) {
  if (item.value !== undefined) {
    throw new TypeError(
      "Cannot stringify an Item with a literal 'value' — the DSL has no syntax for it",
    );
  }
  const call = `${item.operator}(${formatArgs(item)})`;
  if (item.field === undefined) return call;
  if (!FIELD_RE.test(item.field)) {
    throw new TypeError(`Field '${item.field}' is not a valid identifier`);
  }
  return `${item.field}:${call}`;
}

function formatArgs(item) {
  if (variadicOperators.has(item.operator)) {
    if (!Array.isArray(item.expected)) {
      throw new TypeError(
        `Operator '${item.operator}' requires an array 'expected' to stringify`,
      );
    }
    return item.expected.map(formatLiteral).join(", ");
  }
  return formatLiteral(item.expected);
}

function formatLiteral(v) {
  if (v === null) return "null";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      throw new TypeError(`Cannot stringify non-finite number ${v}`);
    }
    return String(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (v instanceof RegExp) return String(v); // /source/flags — JS engine handles `/` escaping
  throw new TypeError(`Cannot stringify literal of type ${typeof v}`);
}
