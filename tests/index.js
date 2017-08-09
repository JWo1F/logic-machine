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
    { expected: 5, operator: 'gt', value: 6 },
    { expected: 5, operator: 'gte', value: 5 },
    { expected: 2, operator: 'lt', value: 1 },
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
    { expected: 5, operator: 'gt', value: [6] },
    { expected: 5, operator: 'gte', value: [5] },
    { expected: 2, operator: 'lt', value: [1] },
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


test('check arrays', function(t) {
  t.equal(logic(['and', { expected: 1, operator: 'eq', value: [1,2,3] }]), true, 'some');
  t.equal(logic(['and', { expected: 1, operator: 'eq', value: [1,1,3], getResult: arr => arr.every(v => !!v.result) }]), false, 'custom result 1');
  t.equal(logic(['and', { expected: 1, operator: 'eq', value: [2,1,3], getResult: arr => !!arr[1].result }]), true, 'custom result 2');

  t.end();
});

test('check NaN', function(t) {
  t.equal(logic(['or', { expected: NaN, operator: 'includes', value: 'lalala' }]), false, 'includes is NaN');
  t.equal(logic(['or', { expected: NaN, operator: 'nincludes', value: 'lalala' }]), true, 'nincludes is NaN');

  t.end();
});

test('check includes', function(t) {
  t.equal(logic(['or', { expected: 'abc', operator: 'includes', value: ['xxx', 'abc', 'yyy'] }]), true, 'includes true');
  t.equal(logic(['or', { expected: 'abc', operator: 'includes', value: ['xx', 'xabcx', 'yy'] }]), false, 'includes false');

  t.equal(logic(['or', { expected: 'abc', operator: 'nincludes', value: ['xx', 'xabcx', 'yy'] }]), true, 'nincludes true');
  t.equal(logic(['or', { expected: 'abc', operator: 'nincludes', value: ['xxx', 'abc', 'yyy'] }]), false, 'nincludes false');
  
  t.end();
})