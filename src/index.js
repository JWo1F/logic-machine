import handlers from "./handlers.js";

export default function logicMachine(logic) {
  const reducer = logic.type === "and" ? "every" : "some";
  return logic.group[reducer]((node) => evaluate(node));
}

function evaluate(node) {
  return "group" in node ? logicMachine(node) : evaluateItem(node);
}

function evaluateItem(item) {
  const handler = handlers[item.operator];
  if (!handler) return false;
  if (item.expected === undefined) return false;
  if (item.value === undefined) return false;

  if (Array.isArray(item.value)) {
    const results = item.value.map((value) => ({
      value,
      result: handler(item.expected, value),
    }));
    const combine = item.getValue ?? defaultCombiner(item.operator);
    return combine(results);
  }

  return handler(item.expected, item.value);
}

const everyOperators = new Set(["eq", "excludes", "notContains"]);

function defaultCombiner(operator) {
  return everyOperators.has(operator) ? everyCombiner : someCombiner;
}

const someCombiner = (results) => results.some((r) => r.result);
const everyCombiner = (results) => results.every((r) => r.result);
