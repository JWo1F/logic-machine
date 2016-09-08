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

operators
=========

Logic machine has some operators:

* **eq**: *value* equals *expected*
* **neq**: *value* not equals *expected*
* **neq**: *value* not equals *expected*
* **gt**: *value* greaters than *expected*
* **gte**: *value* greaters than or equals *expected*
* **lt**: *value* lowers than *expected*
* **lte**: *value* lowers than or equals *expected*
* **contain**: *value* string contains *expected* string
* **notContain**: *value* string not contains *expected* string
* **startWith**: *value* string starts with *expected* string
* **endWith**: *value* string ends with *expected* string
* **regexp**: *value* string matches *expected* (as a regular expression)
* **includes**: *value* (as an array) includes *expected* (as a string)
* **nincludes**: *value* (as an array) not includes *expected* (as a string)

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
