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
          return { value, result: handler ? handler(item.expected, value) : false };
        });

        const defaultComparisor = everyTypes.indexOf(item.operator) > -1 ? everyComparisor : someComparisor;
        return (item.getResult || defaultComparisor)(result);
      } else {
        if(handler) return handler(item.expected, item.value);
        else return false;
      }
    }
  });
}

function someComparisor(arr) {
  return arr.some(v => !!v.result);
}

function everyComparisor(arr) {
  return arr.every(v => !!v.result);
}