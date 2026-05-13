// State-machine tokenizer + recursive-descent parser for the logic-machine DSL.
//
// Grammar:
//   expression := or-expr
//   or-expr    := and-expr ("or" and-expr)*
//   and-expr   := term ("and" term)*
//   term       := "(" expression ")" | leaf
//   leaf       := [IDENT ":"] op-call
//   op-call    := IDENT "(" [literal ("," literal)*] ")"
//   literal    := NUMBER | STRING | REGEX | BOOLEAN | NULL
//   REGEX      := "/" body "/" flags     // body honours [..] char classes and \ escapes
//
// AND binds tighter than OR. Parens override.
// A leaf may be prefixed with `field:` to read the field off the runtime
// input object (e.g. `name:eq("Alex")` against `{ name: ... }`).

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

function tokenize(input) {
  const tokens = [];
  let i = 0;
  let state = "start";
  let buffer = "";
  let quote = null;
  let tokenStart = 0;
  // Regex sub-state: tracks whether we're currently inside a character
  // class so that `/` is treated as a literal there, and stores the
  // body so we can finalise it together with the flags.
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
        // Preserve the backslash and the next character verbatim so the
        // RegExp constructor sees the same source the user wrote.
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
    return parseLeaf();
  }

  function parseLeaf() {
    const first = expect(TOK.IDENT);
    if (peek().type === TOK.COLON) {
      consume();
      const op = expect(TOK.IDENT);
      const args = parseArgs();
      return buildItem(op.value, args, first.value);
    }
    const args = parseArgs();
    return buildItem(first.value, args);
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

  const result = parseOr();
  expect(TOK.EOF);
  return result;
}

const variadicOperators = new Set(["includes", "excludes"]);

function buildItem(operator, args, field) {
  const expected = variadicOperators.has(operator) ? args : argsToScalar(operator, args);
  return field === undefined ? { operator, expected } : { operator, expected, field };
}

function argsToScalar(operator, args) {
  if (args.length !== 1) {
    throw new SyntaxError(
      `Operator '${operator}' expects exactly one argument, got ${args.length}`,
    );
  }
  return args[0];
}
