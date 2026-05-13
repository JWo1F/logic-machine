// Pure tree-walking evaluator. Handles three node shapes:
//   - Logic group: { type: "and"|"or", group: Node[] }
//   - Quantifier:  { type: "every"|"some"|"none", over, match }
//   - Item:        { operator, expected, value?, field? }
//
// `handlers` is the resolved handler map (built-ins + global extensions +
// per-instance extensions, with later layers winning).
// `strict` controls behavior when an Item references an unknown operator:
// throw a ReferenceError when true, return false when false.

const QUANTIFIER_TYPES = new Set(["every", "some", "none"]);
const LOGIC_TYPES = new Set(["and", "or"]);

export default function evaluate(node, input, handlers, strict) {
  if (node === null || typeof node !== "object") {
    throw new TypeError("evaluate: node must be an object");
  }
  if (LOGIC_TYPES.has(node.type)) return evaluateLogic(node, input, handlers, strict);
  if (QUANTIFIER_TYPES.has(node.type)) return evaluateQuantifier(node, input, handlers, strict);
  return evaluateItem(node, input, handlers, strict);
}

function evaluateLogic(node, input, handlers, strict) {
  const reducer = node.type === "and" ? "every" : "some";
  return node.group[reducer]((child) => evaluate(child, input, handlers, strict));
}

function evaluateQuantifier(node, input, handlers, strict) {
  const source = resolveSource(node.over, input);
  if (!Array.isArray(source)) return false;

  let result;
  switch (node.type) {
    case "every":
      result = source.every((el) => evaluate(node.match, el, handlers, strict));
      break;
    case "some":
      result = source.some((el) => evaluate(node.match, el, handlers, strict));
      break;
    case "none":
      result = !source.some((el) => evaluate(node.match, el, handlers, strict));
      break;
  }
  return result;
}

function resolveSource(over, input) {
  if (Array.isArray(over)) return over;
  if (typeof over === "string") {
    if (input == null) return undefined;
    return input[over];
  }
  // `over` omitted: iterate the input itself if it's an array.
  if (over === undefined) return input;
  return undefined;
}

function evaluateItem(item, input, handlers, strict) {
  const handler = handlers[item.operator];
  if (!handler) {
    if (strict) {
      throw new ReferenceError(`Unknown operator '${item.operator}'`);
    }
    return false;
  }
  if (item.expected === undefined) return false;

  const value = resolveValue(item, input);
  if (value === undefined) return false;

  return handler(item.expected, value);
}

function resolveValue(item, input) {
  if (item.value !== undefined) return item.value;
  if (item.field !== undefined) {
    if (input == null) return undefined;
    return input[item.field];
  }
  return input;
}
