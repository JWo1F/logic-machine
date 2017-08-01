export default {
  eq: (a, b) => String(a) == b,
  neq: (a, b) => String(a) != b,
  gt: (a, b) => String(a) > b,
  gte: (a, b) => String(a) >= b,
  lt: (a, b) => String(a) < b,
  lte: (a, b) => String(a) <= b,
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