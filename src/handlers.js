export default {
  eq: (a, b) => toString(a) == b,
  neq: (a, b) => toString(a) != b,
  gt: (a, b) => toString(a) > b,
  gte: (a, b) => toString(a) >= b,
  lt: (a, b) => toString(a) < b,
  lte: (a, b) => toString(a) <= b,
  contain: (a, b) => toString(b).match(new RegExp(escapeRegExp(a || ''))),
  notContain: (a, b) => !toString(b).match(new RegExp(escapeRegExp(a || ''))),
  startWith: (a, b) => toString(b).match(new RegExp('^' + escapeRegExp(a || ''))),
  endWith: (a, b) => toString(b).match(new RegExp(escapeRegExp(a || '') + '$')),
  regexp: (a, b) => toString(b).match(new RegExp(a)),
  includes: (a, b) => b.includes(toString(a)),
  nincludes: (a, b) => !b.includes(toString(a))
};

function escapeRegExp(str) {
  return toString(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function toString(item) {
  return item || '';
}
