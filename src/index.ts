import handlers from "./handlers";

// format:
// [{ expected: "1", operator: "gt", value: "2" }]
// multiple:
// { type: "or", group: [1, { type: "and", group: [2, 3] }, 4] }
// 1 OR (2 AND 3) OR 4

const everyTypes = ["exclude", "eq"];

interface Result {
  value: any;
  result: boolean;
}

export interface Item {
  operator: keyof typeof handlers;
  expected: any;
  value: any;
  getValue?: (results: Result[]) => any;
}

export interface Logic {
  type?: "or" | "and";
  group: (Logic | Item)[];
}

export default function logicMachine(logic: Logic): boolean {
  const each = logic.type === "and" ? logic.group.every : logic.group.some;

  return each.call(logic.group, (item) => {
    if ("group" in item) {
      return logicMachine(item);
    } else {
      const handler = handlers[item.operator];

      if (Array.isArray(item.value)) {
        const result = item.value.map((value) => {
          return { value, result: checker(handler, value, item.expected) };
        });

        return (item.getValue || defaultComparisor(item.operator))(result);
      } else {
        return checker(handler, item.value, item.expected);
      }
    }
  });
}

function checker(
  handler: (a: any, b: any) => boolean,
  value: any,
  expected: any,
) {
  if (
    handler &&
    typeof value !== "undefined" &&
    typeof expected !== "undefined"
  ) {
    console.log(handler, expected, value);
    return handler(expected, value);
  }

  return false;
}

function defaultComparisor(operator: keyof typeof handlers) {
  if (everyTypes.includes(operator)) {
    return everyComparisor;
  } else {
    return someComparisor;
  }
}

function someComparisor(arr: any[]) {
  return arr.some((v) => !!v.result);
}

function everyComparisor(arr: any[]) {
  return arr.every((v) => !!v.result);
}
