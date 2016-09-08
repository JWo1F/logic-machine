var logic = require('../bundle.js');
var test = require('tap').test;

test('simple logic OR', function(t) {
  var src = [
    'or',
    { expected: 7, operator: 'gt', value: 5 },
    { expected: 5, operator: 'eq', value: 5 },
    { expected: 5, operator: 'lt', value: 5 },
    { expected: 5, operator: 'lte', value: 5 }
  ];

  t.equal(logic(src), true);

  t.end();
});

test('simple logic AND', function(t) {
  var src = [
    'and',
    { expected: 7, operator: 'gt', value: 5 },
    { expected: 5, operator: 'eq', value: 5 },
    { expected: 5, operator: 'lt', value: 5 },
    { expected: 5, operator: 'lte', value: 5 }
  ];

  t.equal(logic(src), false);

  t.end();
});

test('check all handlers', function(t) {
  var src = [
    { expected: 1, operator: 'eq', value: 1 },
    { expected: 2, operator: 'neq', value: 1 },
    { expected: 6, operator: 'gt', value: 5 },
    { expected: 5, operator: 'gte', value: 5 },
    { expected: 1, operator: 'lt', value: 2 },
    { expected: 1, operator: 'lte', value: 1 },
    { expected: 'hello', operator: 'contain', value: 'hello world' },
    { expected: 'foo', operator: 'notContain', value: 'bar' },
    { expected: 'Hello', operator: 'startWith', value: 'Hello world' },
    { expected: 'world', operator: 'endWith', value: 'Hello world' },
    { expected: '...', operator: 'regexp', value: 'abc' },
    { expected: 'a', operator: 'includes', value: ['a', 'b', 'c'] },
    { expected: 'a', operator: 'nincludes', value: ['b', 'c'] },
    { expected: 1, operator: 'eq', value: [1] },
    { expected: 2, operator: 'neq', value: [1] },
    { expected: 6, operator: 'gt', value: [5] },
    { expected: 5, operator: 'gte', value: [5] },
    { expected: 1, operator: 'lt', value: [2] },
    { expected: 1, operator: 'lte', value: [1] },
    { expected: 'hello', operator: 'contain', value: ['hello world'] },
    { expected: 'foo', operator: 'notContain', value: ['bar'] },
    { expected: 'Hello', operator: 'startWith', value: ['Hello world'] },
    { expected: 'world', operator: 'endWith', value: ['Hello world'] },
    { expected: '...', operator: 'regexp', value: ['abc'] }
  ];

  src.forEach((item, i) => {
    var res = logic(['and', item]);

    t.equal(res, true, '#' + i + ': ' + item.operator, {
      res, item
    });
  });

  t.end();
});
