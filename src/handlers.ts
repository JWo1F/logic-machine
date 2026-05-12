export default {
  eq: (a: any, b: any) => b == a,
  neq: (a: any, b: any) => b != a,
  gt: (a: any, b: any) => b > a,
  gte: (a: any, b: any) => b >= a,
  lt: (a: any, b: any) => b < a,
  lte: (a: any, b: any) => b <= a,
  contain: (a: any, b: any) =>
    !!String(b).match(new RegExp(escapeRegExp(a || ""))),
  notContain: (a: any, b: any) =>
    !String(b).match(new RegExp(escapeRegExp(a || ""))),
  startWith: (a: any, b: any) =>
    !!String(b).match(new RegExp("^" + escapeRegExp(a || ""))),
  endWith: (a: any, b: any) =>
    !!String(b).match(new RegExp(escapeRegExp(a || "") + "$")),
  regexp: (a: any, b: any) => !!String(b).match(new RegExp(a)),
  include: (a: any, b: any) => b == a,
  exclude: (a: any, b: any) => b != a,
};

function escapeRegExp(str: String) {
  return String(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
