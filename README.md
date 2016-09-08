Logic machine
=============

A logic machine for JS

example
=======

```js
var logic = require('logic-machine');

var src = [
  'or', // one is true
  { expected: 7, operator: 'gt', value: 5 }, // false
  { expected: 3, operator: 'eq', value: 5 }, // false
  [
    'and', // all is true
    { expected: 6, operator: 'lt', value: 5 }, // true
    { expected: 5, operator: 'lte', value: 5 }, // true
    [
      'or', // one is true
      { expected: 5, operator: 'lt', value: 5 }, // false
      { expected: 5, operator: 'lte', value: 5 }, // true
    ] // true
  ] // true
];

console.log(logic(src)); // true
```

install
=======

With [npm](https://www.npmjs.com/package/logic-machine) do:

```
npm install logic-machine
```

test
====

With [npm](https://www.npmjs.com/package/logic-machine) do:

```
npm test
```
