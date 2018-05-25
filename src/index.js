import handlers from './handlers';

// format:
// [{ expected: "1", operator: "gt", value: "2" }]
// multiple:
// ["or", {1}, ["and", {2}, {3}], {4}]
// 1 OR (2 AND 3) OR 4

const everyTypes = ['nincludes'];

export default function logicMachine(logic) {
  const [type, ...array] = logic;
  const method = (type == 'and' ? 'every' : 'some');

  return array[method](item => {
    if(Array.isArray(item)) {
      return logicMachine(item);
    } else {
      const handler = handlers[item.operator];

      if(Array.isArray(item.value)) {
        const result = item.value.map(value => {
          return { value, result: checker(handler, value, item.expected) };
        });

        return (item.getResult || defaultComparisor(item.operator))(result);
      } else {
        return checker(handler, item.value, item.expected);
      }
    }
  });
}

function checker(handler, value, expected) {
  if(handler && typeof value !== 'undefined' && typeof expected !== 'undefined') {
    return handler(expected, value);
  }

  return false;
}

function defaultComparisor(operator) {
  if(operator == 'nincludes') {
    return everyComparisor;
  } else {
    return someComparisor;
  }
}

function someComparisor(arr) {
  return arr.some(v => !!v.result);
}

function everyComparisor(arr) {
  return arr.every(v => !!v.result);
}