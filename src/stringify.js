// JSON-form node -> DSL string.
//
// The stringifier walks the tree, emits the DSL form, and (when handed a
// handler set) validates that every operator name it sees is registered.
// Pass `handlers = null` to skip validation.

const PRECEDENCE = { or: 1, and: 2 };
const LOGIC_TYPES = new Set(["and", "or"]);
const QUANTIFIER_TYPES = new Set(["every", "some", "none"]);
const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export default function stringify(node, handlers = null) {
  return format(node, 0, handlers);
}

function format(node, outerPrecedence, handlers) {
  if (node === null || typeof node !== "object") {
    throw new TypeError("stringify: node must be an object");
  }
  if (LOGIC_TYPES.has(node.type)) return formatLogic(node, outerPrecedence, handlers);
  if (QUANTIFIER_TYPES.has(node.type)) return formatQuantifier(node, handlers);
  if (typeof node.operator === "string") return formatItem(node, handlers);
  throw new TypeError("stringify: node must be a Logic, Quantifier, or Item");
}

function formatLogic(node, outerPrecedence, handlers) {
  const inner = PRECEDENCE[node.type];
  if (!Array.isArray(node.group)) {
    throw new TypeError(`Logic node of type '${node.type}' requires a 'group' array`);
  }
  if (node.group.length === 1) {
    return format(node.group[0], outerPrecedence, handlers);
  }
  const sep = ` ${node.type} `;
  const body = node.group.map((child) => format(child, inner, handlers)).join(sep);
  return outerPrecedence > inner ? `(${body})` : body;
}

function formatQuantifier(node, handlers) {
  const source = formatSource(node.over);
  const match = format(node.match, 0, handlers);
  return `${node.type}(${source}, ${match})`;
}

function formatSource(over) {
  if (typeof over === "string") {
    if (!FIELD_RE.test(over)) {
      throw new TypeError(`Field '${over}' is not a valid identifier`);
    }
    return over;
  }
  if (Array.isArray(over)) return formatArrayLiteral(over);
  throw new TypeError("Quantifier 'over' must be a field name or an array");
}

function formatItem(item, handlers) {
  if (handlers && !Object.prototype.hasOwnProperty.call(handlers, item.operator)) {
    throw new ReferenceError(`Unknown operator '${item.operator}'`);
  }
  if (item.value !== undefined) {
    throw new TypeError(
      "Cannot stringify an Item with a literal 'value' — the DSL has no syntax for it",
    );
  }
  // Nullary calls render bare: `isEven` instead of `isEven()`.
  const call =
    item.expected === undefined
      ? item.operator
      : `${item.operator}(${formatItemArgs(item.expected)})`;
  if (item.field === undefined) return call;
  if (!FIELD_RE.test(item.field)) {
    throw new TypeError(`Field '${item.field}' is not a valid identifier`);
  }
  return `${item.field}:${call}`;
}

function formatItemArgs(expected) {
  if (expected === undefined) return "";
  // Arrays of 2+ elements emit as multi-arg `a, b, c`. Length 0 and 1
  // stay as array literals so they round-trip distinct from a nullary
  // call or a scalar value.
  if (Array.isArray(expected) && expected.length >= 2) {
    return expected.map(formatLiteral).join(", ");
  }
  return formatLiteral(expected);
}

function formatLiteral(v) {
  if (v === null) return "null";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new TypeError(`Cannot stringify non-finite number ${v}`);
    return String(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (v instanceof RegExp) return String(v);
  if (Array.isArray(v)) return formatArrayLiteral(v);
  throw new TypeError(`Cannot stringify literal of type ${typeof v}`);
}

function formatArrayLiteral(arr) {
  return `[${arr.map(formatLiteral).join(", ")}]`;
}
