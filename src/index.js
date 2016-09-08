import handlers from './handlers';

// format:
// [{ expected: "1", operator: "gt", value: "2" }]
// multiple:
// ["or", {1}, ["and", {2}, {3}], {4}]
// 1 OR (2 AND 3) OR 4

export default function logicMachine(logic) {
  const [type, ...array] = logic;
  const plain = [];

  array.forEach(item => {
    if(Array.isArray(item)) {
      plain.push(logicMachine(item));
    } else {
      const handler = handlers[item.operator];

      if(handler) plain.push(handler(item.expected, item.value));
      else plain.push(false);
    }
  });

  return type == 'and' ? plain.every(item => !!item) : plain.some(item => !!item);
}
