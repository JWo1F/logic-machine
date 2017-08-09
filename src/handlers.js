export default {
  eq: (a, b) => b == a,
  neq: (a, b) => b != a,
  gt: (a, b) => b > a,
  gte: (a, b) => b >= a,
  lt: (a, b) => b < a,
  lte: (a, b) => b <= a,
  contain: (a, b) => String(b).match(new RegExp(escapeRegExp(a || ''))),
  notContain: (a, b) => !String(b).match(new RegExp(escapeRegExp(a || ''))),
  startWith: (a, b) => String(b).match(new RegExp('^' + escapeRegExp(a || ''))),
  endWith: (a, b) => String(b).match(new RegExp(escapeRegExp(a || '') + '$')),
  regexp: (a, b) => String(b).match(new RegExp(a)),
  includes: (a, b) => b == a,
  nincludes: (a, b) => b != a
};

function escapeRegExp(str) {
  return String(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}