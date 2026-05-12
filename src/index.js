import handlers from "./handlers.js";
import parse from "./parse.js";
import stringify from "./stringify.js";

export { parse, stringify };

function logicMachine(logic, input) {
  const node = typeof logic === "string" ? parse(logic) : logic;
  const root = isItem(node) ? { type: "and", group: [node] } : node;
  return evaluateLogic(root, input);
}

logicMachine.parse = parse;
logicMachine.stringify = stringify;

export default logicMachine;

function evaluateLogic(logic, input) {
  const reducer = logic.type === "and" ? "every" : "some";
  return logic.group[reducer]((node) => evaluate(node, input));
}

function evaluate(node, input) {
  return isItem(node) ? evaluateItem(node, input) : evaluateLogic(node, input);
}

function isItem(node) {
  return !("group" in node);
}

const arrayNativeOperators = new Set(["includes", "excludes"]);

function evaluateItem(item, input) {
  const handler = handlers[item.operator];
  if (!handler) return false;
  if (item.expected === undefined) return false;

  const value = resolveValue(item, input);
  if (value === undefined) return false;

  if (Array.isArray(value) && !arrayNativeOperators.has(item.operator)) {
    const results = value.map((v) => ({
      value: v,
      result: handler(item.expected, v),
    }));
    const combine = item.getValue ?? defaultCombiner(item.operator);
    return combine(results);
  }

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

const everyOperators = new Set(["eq", "notContains"]);

function defaultCombiner(operator) {
  return everyOperators.has(operator) ? everyCombiner : someCombiner;
}

const someCombiner = (results) => results.some((r) => r.result);
const everyCombiner = (results) => results.every((r) => r.result);
