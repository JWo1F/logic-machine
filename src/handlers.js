export default {
  eq: (a, b) => String(b) == a,
  neq: (a, b) => String(b) != a,
  gt: (a, b) => String(b) > a,
  gte: (a, b) => String(b) >= a,
  lt: (a, b) => String(b) < a,
  lte: (a, b) => String(b) <= a,
  contain: (a, b) => String(b).match(new RegExp(escapeRegExp(a || ''))),
  notContain: (a, b) => !String(b).match(new RegExp(escapeRegExp(a || ''))),
  startWith: (a, b) => String(b).match(new RegExp('^' + escapeRegExp(a || ''))),
  endWith: (a, b) => String(b).match(new RegExp(escapeRegExp(a || '') + '$')),
  regexp: (a, b) => String(b).match(new RegExp(a)),
  includes: (a, b) => b.includes(String(a)),
  nincludes: (a, b) => !b.includes(String(a))
};

function escapeRegExp(str) {
  return String(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}