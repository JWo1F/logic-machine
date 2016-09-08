import handlers from './handlers';

// format:
// [{ expected: "1", operator: "gt", value: "2" }]
// multiple:
// ["or", {1}, ["and", {2}, {3}], {4}]
// 1 OR (2 AND 3) OR 4

export default function logicMachine(logic) {
  const [type, ...array] = logic;
  const method = (type == 'and' ? 'every' : 'some');

  return array[method](item => {
    if(Array.isArray(item)) {
      return logicMachine(item);
    } else {
      const handler = handlers[item.operator];

      if(handler) return handler(item.expected, item.value);
      else return false;
    }
  });
}
