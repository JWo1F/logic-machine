// State-machine tokenizer + recursive-descent parser for the logic-machine
// DSL.
//
// Grammar:
//   expression := and-expr ("or" and-expr)*
//   and-expr   := term ("and" term)*
//   term       := "(" expression ")" | quantifier | op-call
//   quantifier := ("every"|"some"|"none") "(" source "," expression ")"
//   source     := IDENT | array-literal
//   op-call    := [IDENT ":"] IDENT [ "(" [literal ("," literal)*] ")" ]
//   // Parentheses are optional when there are zero args: `isEven` ≡ `isEven()`.
//   literal    := NUMBER | STRING | REGEX | BOOLEAN | NULL | array-literal
//   array-literal := "[" [literal ("," literal)*] "]"
//   REGEX      := "/" body "/" flags     // body honours [..] char classes and \ escapes
//
// `and` binds tighter than `or`. Parens override. Quantifier keywords
// (every/some/none) are not handler names; they become first-class
// Quantifier nodes.
//
// The parser is purely syntactic: it does not validate that an operator
// name is registered. That's the LogicMachine class's job.

const TOK = {
  IDENT: "IDENT",
  NUMBER: "NUMBER",
  STRING: "STRING",
  REGEX: "REGEX",
  BOOLEAN: "BOOLEAN",
  NULL: "NULL",
  AND: "AND",
  OR: "OR",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  COMMA: "COMMA",
  COLON: "COLON",
  EOF: "EOF",
};

const ESCAPES = { n: "\n", t: "\t", r: "\r", '"': '"', "'": "'", "\\": "\\" };

const KEYWORDS = {
  and: { type: TOK.AND },
  or: { type: TOK.OR },
  true: { type: TOK.BOOLEAN, value: true },
  false: { type: TOK.BOOLEAN, value: false },
  null: { type: TOK.NULL, value: null },
};

const QUANTIFIERS = new Set(["every", "some", "none"]);

function tokenize(input) {
  const tokens = [];
  let i = 0;
  let state = "start";
  let buffer = "";
  let quote = null;
  let tokenStart = 0;
  let inCharClass = false;
  let regexBody = "";

  const push = (token) => tokens.push({ ...token, pos: tokenStart });
  const flushIdent = () => {
    const keyword = KEYWORDS[buffer];
    if (keyword) push({ ...keyword });
    else push({ type: TOK.IDENT, value: buffer });
    buffer = "";
  };
  const flushNumber = () => {
    const n = Number(buffer);
    if (Number.isNaN(n)) throw new SyntaxError(`Invalid number '${buffer}' at ${tokenStart}`);
    push({ type: TOK.NUMBER, value: n });
    buffer = "";
  };
  const flushRegex = () => {
    let value;
    try {
      value = new RegExp(regexBody, buffer);
    } catch (err) {
      throw new SyntaxError(`Invalid regex at ${tokenStart}: ${err.message}`);
    }
    push({ type: TOK.REGEX, value });
    buffer = "";
    regexBody = "";
  };

  while (i <= input.length) {
    const c = i < input.length ? input[i] : "";

    switch (state) {
      case "start": {
        if (c === "") {
          push({ type: TOK.EOF });
          return tokens;
        }
        if (/\s/.test(c)) { i++; break; }
        tokenStart = i;
        if (c === "(") { push({ type: TOK.LPAREN }); i++; break; }
        if (c === ")") { push({ type: TOK.RPAREN }); i++; break; }
        if (c === "[") { push({ type: TOK.LBRACKET }); i++; break; }
        if (c === "]") { push({ type: TOK.RBRACKET }); i++; break; }
        if (c === ",") { push({ type: TOK.COMMA }); i++; break; }
        if (c === ":") { push({ type: TOK.COLON }); i++; break; }
        if (c === '"' || c === "'") { state = "string"; quote = c; i++; break; }
        if (c === "/") { state = "regex-body"; inCharClass = false; regexBody = ""; i++; break; }
        if (c === "-" || /[0-9]/.test(c)) { state = "number"; buffer = c; i++; break; }
        if (/[a-zA-Z_]/.test(c)) { state = "ident"; buffer = c; i++; break; }
        throw new SyntaxError(`Unexpected character '${c}' at ${i}`);
      }

      case "ident": {
        if (/[a-zA-Z0-9_]/.test(c)) { buffer += c; i++; break; }
        flushIdent();
        state = "start";
        break;
      }

      case "number": {
        if (/[0-9.]/.test(c)) { buffer += c; i++; break; }
        if (buffer === "-") throw new SyntaxError(`Bare '-' at ${tokenStart}`);
        flushNumber();
        state = "start";
        break;
      }

      case "string": {
        if (c === "") throw new SyntaxError(`Unterminated string starting at ${tokenStart}`);
        if (c === "\\") { state = "string-escape"; i++; break; }
        if (c === quote) {
          push({ type: TOK.STRING, value: buffer });
          buffer = "";
          quote = null;
          state = "start";
          i++;
          break;
        }
        buffer += c;
        i++;
        break;
      }

      case "string-escape": {
        if (c === "") throw new SyntaxError(`Unterminated escape at ${i}`);
        buffer += ESCAPES[c] ?? c;
        i++;
        state = "string";
        break;
      }

      case "regex-body": {
        if (c === "") throw new SyntaxError(`Unterminated regex starting at ${tokenStart}`);
        if (c === "\\") { state = "regex-escape"; i++; break; }
        if (c === "[" && !inCharClass) { inCharClass = true; regexBody += c; i++; break; }
        if (c === "]" && inCharClass) { inCharClass = false; regexBody += c; i++; break; }
        if (c === "/" && !inCharClass) { state = "regex-flags"; buffer = ""; i++; break; }
        regexBody += c;
        i++;
        break;
      }

      case "regex-escape": {
        if (c === "") throw new SyntaxError(`Unterminated regex escape at ${tokenStart}`);
        regexBody += "\\" + c;
        i++;
        state = "regex-body";
        break;
      }

      case "regex-flags": {
        if (c && /[a-z]/i.test(c)) { buffer += c; i++; break; }
        flushRegex();
        state = "start";
        break;
      }
    }
  }

  push({ type: TOK.EOF });
  return tokens;
}

export default function parse(input) {
  if (typeof input !== "string") {
    throw new TypeError("parse() expects a string");
  }
  const tokens = tokenize(input);
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];
  const expect = (type) => {
    const t = peek();
    if (t.type !== type) {
      throw new SyntaxError(`Expected ${type} but got ${t.type} at ${t.pos ?? "EOF"}`);
    }
    return consume();
  };

  function parseOr() {
    const first = parseAnd();
    if (peek().type !== TOK.OR) return first;
    const group = [first];
    while (peek().type === TOK.OR) {
      consume();
      group.push(parseAnd());
    }
    return { type: "or", group };
  }

  function parseAnd() {
    const first = parseTerm();
    if (peek().type !== TOK.AND) return first;
    const group = [first];
    while (peek().type === TOK.AND) {
      consume();
      group.push(parseTerm());
    }
    return { type: "and", group };
  }

  function parseTerm() {
    if (peek().type === TOK.LPAREN) {
      consume();
      const expr = parseOr();
      expect(TOK.RPAREN);
      return expr;
    }
    return parseLeafOrQuantifier();
  }

  function parseLeafOrQuantifier() {
    const first = expect(TOK.IDENT);
    if (peek().type === TOK.COLON) {
      // field-prefixed op-call: field:op[(args)]
      consume();
      const op = expect(TOK.IDENT);
      if (QUANTIFIERS.has(op.value)) {
        throw new SyntaxError(
          `Quantifier '${op.value}' cannot be field-prefixed at ${op.pos}`,
        );
      }
      return buildItem(op.value, parseOptionalArgs(), first.value);
    }
    if (QUANTIFIERS.has(first.value)) {
      // Quantifiers always require their (source, predicate) form.
      return parseQuantifier(first.value);
    }
    return buildItem(first.value, parseOptionalArgs());
  }

  function parseOptionalArgs() {
    return peek().type === TOK.LPAREN ? parseArgs() : [];
  }

  function parseQuantifier(kind) {
    expect(TOK.LPAREN);
    const over = parseSource();
    expect(TOK.COMMA);
    const match = parseOr();
    expect(TOK.RPAREN);
    return { type: kind, over, match };
  }

  function parseSource() {
    const t = peek();
    if (t.type === TOK.IDENT) {
      consume();
      return t.value;
    }
    if (t.type === TOK.LBRACKET) return parseArrayLiteral();
    throw new SyntaxError(
      `Expected field name or array literal at ${t.pos ?? "EOF"}`,
    );
  }

  function parseArgs() {
    expect(TOK.LPAREN);
    const args = [];
    if (peek().type !== TOK.RPAREN) {
      args.push(parseLiteral());
      while (peek().type === TOK.COMMA) {
        consume();
        args.push(parseLiteral());
      }
    }
    expect(TOK.RPAREN);
    return args;
  }

  function parseLiteral() {
    const t = peek();
    if (t.type === TOK.LBRACKET) return parseArrayLiteral();
    if (
      t.type === TOK.NUMBER ||
      t.type === TOK.STRING ||
      t.type === TOK.REGEX ||
      t.type === TOK.BOOLEAN ||
      t.type === TOK.NULL
    ) {
      consume();
      return t.value;
    }
    throw new SyntaxError(`Expected literal but got ${t.type} at ${t.pos ?? "EOF"}`);
  }

  function parseArrayLiteral() {
    expect(TOK.LBRACKET);
    const items = [];
    if (peek().type !== TOK.RBRACKET) {
      items.push(parseLiteral());
      while (peek().type === TOK.COMMA) {
        consume();
        items.push(parseLiteral());
      }
    }
    expect(TOK.RBRACKET);
    return items;
  }

  const result = parseOr();
  expect(TOK.EOF);
  return result;
}

function buildItem(operator, args, field) {
  const item = { operator };
  if (args.length === 1) item.expected = args[0];
  else if (args.length > 1) item.expected = args;
  if (field !== undefined) item.field = field;
  return item;
}
