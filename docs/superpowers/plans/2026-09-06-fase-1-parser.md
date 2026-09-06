# Fase 1, Etapa 2 — Parser (AST para A0-A6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the recursive-descent parser that turns the token stream from `packages/lang/src/lexer.ts` into an AST covering the full A0-A6 grammar surface (sequences, variables/operators, conditionals, loops — `enquanto`/`repita`/`para cada` — functions, lists, dicts). This is Sub-plan 2 of Fase 1. It consumes exactly the `Token`/`TokenType` shape the lexer plan produced, including `Indent`/`Dedent` as block delimiters.

**Architecture:** A new `packages/lang/src/ast.ts` defines the AST as discriminated unions (`Expression`, `Statement`, `Program`) keyed by a `kind` field, so later stages (semantic analyzer, compiler) get exhaustiveness checking for free. A new `packages/lang/src/parser.ts` defines `Parser` (constructor takes the already-tokenized `Token[]`, so lexing and parsing stay decoupled and independently testable) and `ParseError`. Comments are filtered out of the token stream once, in the constructor, rather than special-cased at every grammar rule that could have a trailing comment.

**Tech Stack:** TypeScript (strict), Vitest — same as before, no new dependencies. (Property-based round-trip testing of the parser, which needs an AST-to-source printer plus the `fast-check` dependency, is its own next sub-plan — see the note at the end of this file.)

## Global Constraints

- New files only: `packages/lang/src/ast.ts`, `packages/lang/src/parser.ts`, `packages/lang/src/parser.test.ts`. `packages/lang/src/index.ts` gets new exports, `docs/grammar.ebnf` gets a new syntactic-grammar section. Nothing in `lexer.ts` changes.
- Every parser error message is in Portuguese, with line/column and a description of what was actually found (`describeToken`), matching the pedagogical-error-message pillar (project plan §6.2) — no mixed-language messages like the ones already flagged for the lexer.
- `funcao`/`def`, `se`/`if`, etc. are already resolved to one canonical PT value by the lexer (Sub-plan 1) — the parser only ever compares against the canonical PT spelling (`'se'`, `'senao'`, `'enquanto'`, `'repita'`, `'para'`, `'cada'`, `'em'`, `'funcao'`, `'retorna'`, `'e'`, `'ou'`, `'nao'`, `'verdadeiro'`, `'falso'`). It never needs to know the English aliases exist.
- Run `pnpm --filter @colonia-zero/lang test` after every step; run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root) before the final commit of each task.

---

### Task 1: AST types, parser infrastructure, and the full expression grammar

**Files:**

- Create: `packages/lang/src/ast.ts`
- Create: `packages/lang/src/parser.ts`
- Create: `packages/lang/src/parser.test.ts`

**Interfaces:**

- Consumes: `Token`, `TokenType`, `Lexer` from `packages/lang/src/lexer.ts` (Sub-plan 1).
- Produces: `Expression`, `Statement`, `Program` (from `ast.ts`), and `Parser`, `ParseError` (from `parser.ts`) — Task 2 (statement grammar) and the semantic-analyzer plan after it both import these exact names and the `kind`-discriminated shape.

- [x] **Step 1: Define the AST types**

Create `packages/lang/src/ast.ts`:

```ts
export type Expression =
  | { kind: 'NumberLiteral'; value: number; line: number; column: number }
  | { kind: 'StringLiteral'; value: string; line: number; column: number }
  | { kind: 'BooleanLiteral'; value: boolean; line: number; column: number }
  | { kind: 'Identifier'; name: string; line: number; column: number }
  | { kind: 'ListLiteral'; elements: Expression[]; line: number; column: number }
  | {
      kind: 'DictLiteral';
      entries: Array<{ key: Expression; value: Expression }>;
      line: number;
      column: number;
    }
  | { kind: 'UnaryExpression'; operator: string; operand: Expression; line: number; column: number }
  | {
      kind: 'BinaryExpression';
      operator: string;
      left: Expression;
      right: Expression;
      line: number;
      column: number;
    }
  | { kind: 'CallExpression'; callee: Expression; args: Expression[]; line: number; column: number }
  | {
      kind: 'IndexExpression';
      object: Expression;
      index: Expression;
      line: number;
      column: number;
    };

export type Statement =
  | { kind: 'ExpressionStatement'; expression: Expression; line: number; column: number }
  | { kind: 'Assignment'; target: string; value: Expression; line: number; column: number }
  | {
      kind: 'IfStatement';
      condition: Expression;
      thenBranch: Statement[];
      elseBranch: Statement[] | null;
      line: number;
      column: number;
    }
  | {
      kind: 'WhileStatement';
      condition: Expression;
      body: Statement[];
      line: number;
      column: number;
    }
  | { kind: 'RepeatStatement'; count: Expression; body: Statement[]; line: number; column: number }
  | {
      kind: 'ForEachStatement';
      itemName: string;
      iterable: Expression;
      body: Statement[];
      line: number;
      column: number;
    }
  | {
      kind: 'FunctionDeclaration';
      name: string;
      params: string[];
      body: Statement[];
      line: number;
      column: number;
    }
  | { kind: 'ReturnStatement'; value: Expression | null; line: number; column: number };

export interface Program {
  kind: 'Program';
  statements: Statement[];
}
```

- [x] **Step 2: Write the failing tests for literals, identifiers, and parenthesized expressions**

Create `packages/lang/src/parser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Lexer } from './lexer';
import { Parser, ParseError } from './parser';
import type { Expression } from './ast';

function parseExpr(source: string): Expression {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parseExpression();
}

describe('Parser (expressions)', () => {
  it('parses a number literal', () => {
    expect(parseExpr('42')).toMatchObject({ kind: 'NumberLiteral', value: 42 });
  });

  it('parses a string literal', () => {
    expect(parseExpr('"fibra"')).toMatchObject({ kind: 'StringLiteral', value: 'fibra' });
  });

  it('parses boolean literals', () => {
    expect(parseExpr('verdadeiro')).toMatchObject({ kind: 'BooleanLiteral', value: true });
    expect(parseExpr('falso')).toMatchObject({ kind: 'BooleanLiteral', value: false });
  });

  it('parses an identifier', () => {
    expect(parseExpr('umidade')).toMatchObject({ kind: 'Identifier', name: 'umidade' });
  });

  it('parses a parenthesized expression', () => {
    expect(parseExpr('(1)')).toMatchObject({ kind: 'NumberLiteral', value: 1 });
  });
});
```

- [x] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: FAIL — `parser.ts` doesn't exist yet, so this is a module-resolution failure, not an assertion failure. That's fine; it's still a red state to build from.

- [x] **Step 4: Implement the Parser skeleton and full expression grammar**

Create `packages/lang/src/parser.ts`:

```ts
import { Token, TokenType } from './lexer';
import type { Expression, Program, Statement } from './ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

function describeToken(token: Token): string {
  switch (token.type) {
    case TokenType.EOF:
      return 'fim do arquivo';
    case TokenType.Newline:
      return 'quebra de linha';
    case TokenType.Indent:
      return 'início de um bloco indentado';
    case TokenType.Dedent:
      return 'fim de um bloco indentado';
    default:
      return `'${token.value}'`;
  }
}

export class Parser {
  private readonly tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter((t) => t.type !== TokenType.Comment);
  }

  parseProgram(): Program {
    const statements: Statement[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
      this.skipNewlines();
    }
    return { kind: 'Program', statements };
  }

  parseExpression(): Expression {
    return this.parseLogicOr();
  }

  private parseStatement(): Statement {
    throw new ParseError(
      'parseStatement not implemented yet',
      this.peek().line,
      this.peek().column,
    );
  }

  private skipNewlines(): void {
    while (this.check(TokenType.Newline)) this.advance();
  }

  // Invariant: `tokens` always ends with an EOF token (guaranteed by
  // Lexer.tokenize()) and `pos` never advances past the last index, so this
  // index access is always in bounds.
  private peek(): Token {
    return this.tokens[this.pos] as Token;
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.pos + 1];
  }

  private advance(): Token {
    const token = this.tokens[this.pos] as Token;
    if (this.pos < this.tokens.length - 1) this.pos += 1;
    return token;
  }

  private check(type: TokenType, value?: string): boolean {
    const token = this.peek();
    if (token.type !== type) return false;
    return value === undefined || token.value === value;
  }

  private expect(type: TokenType, message: string, value?: string): Token {
    if (!this.check(type, value)) {
      const token = this.peek();
      throw new ParseError(
        `${message} (encontrado ${describeToken(token)})`,
        token.line,
        token.column,
      );
    }
    return this.advance();
  }

  private parseLogicOr(): Expression {
    let left = this.parseLogicAnd();
    while (this.check(TokenType.Keyword, 'ou')) {
      const opToken = this.advance();
      const right = this.parseLogicAnd();
      left = {
        kind: 'BinaryExpression',
        operator: 'ou',
        left,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return left;
  }

  private parseLogicAnd(): Expression {
    let left = this.parseLogicNot();
    while (this.check(TokenType.Keyword, 'e')) {
      const opToken = this.advance();
      const right = this.parseLogicNot();
      left = {
        kind: 'BinaryExpression',
        operator: 'e',
        left,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return left;
  }

  private parseLogicNot(): Expression {
    if (this.check(TokenType.Keyword, 'nao')) {
      const opToken = this.advance();
      const operand = this.parseLogicNot();
      return {
        kind: 'UnaryExpression',
        operator: 'nao',
        operand,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return this.parseEquality();
  }

  private parseEquality(): Expression {
    let left = this.parseComparison();
    while (this.check(TokenType.Operator, '==') || this.check(TokenType.Operator, '!=')) {
      const opToken = this.advance();
      const right = this.parseComparison();
      left = {
        kind: 'BinaryExpression',
        operator: opToken.value,
        left,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return left;
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive();
    while (
      this.check(TokenType.Operator, '<') ||
      this.check(TokenType.Operator, '>') ||
      this.check(TokenType.Operator, '<=') ||
      this.check(TokenType.Operator, '>=')
    ) {
      const opToken = this.advance();
      const right = this.parseAdditive();
      left = {
        kind: 'BinaryExpression',
        operator: opToken.value,
        left,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();
    while (this.check(TokenType.Operator, '+') || this.check(TokenType.Operator, '-')) {
      const opToken = this.advance();
      const right = this.parseMultiplicative();
      left = {
        kind: 'BinaryExpression',
        operator: opToken.value,
        left,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();
    while (
      this.check(TokenType.Operator, '*') ||
      this.check(TokenType.Operator, '/') ||
      this.check(TokenType.Operator, '%')
    ) {
      const opToken = this.advance();
      const right = this.parseUnary();
      left = {
        kind: 'BinaryExpression',
        operator: opToken.value,
        left,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return left;
  }

  private parseUnary(): Expression {
    if (this.check(TokenType.Operator, '-')) {
      const opToken = this.advance();
      const operand = this.parseUnary();
      return {
        kind: 'UnaryExpression',
        operator: '-',
        operand,
        line: opToken.line,
        column: opToken.column,
      };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();
    for (;;) {
      if (this.check(TokenType.Punctuation, '(')) {
        const opToken = this.advance();
        const args: Expression[] = [];
        if (!this.check(TokenType.Punctuation, ')')) {
          args.push(this.parseExpression());
          while (this.check(TokenType.Punctuation, ',')) {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect(TokenType.Punctuation, "esperava ')' depois dos argumentos", ')');
        expr = {
          kind: 'CallExpression',
          callee: expr,
          args,
          line: opToken.line,
          column: opToken.column,
        };
      } else if (this.check(TokenType.Punctuation, '[')) {
        const opToken = this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.Punctuation, "esperava ']' depois do índice", ']');
        expr = {
          kind: 'IndexExpression',
          object: expr,
          index,
          line: opToken.line,
          column: opToken.column,
        };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    if (token.type === TokenType.Number) {
      this.advance();
      return {
        kind: 'NumberLiteral',
        value: Number(token.value),
        line: token.line,
        column: token.column,
      };
    }
    if (token.type === TokenType.String) {
      this.advance();
      return { kind: 'StringLiteral', value: token.value, line: token.line, column: token.column };
    }
    if (this.check(TokenType.Keyword, 'verdadeiro')) {
      this.advance();
      return { kind: 'BooleanLiteral', value: true, line: token.line, column: token.column };
    }
    if (this.check(TokenType.Keyword, 'falso')) {
      this.advance();
      return { kind: 'BooleanLiteral', value: false, line: token.line, column: token.column };
    }
    if (token.type === TokenType.Identifier) {
      this.advance();
      return { kind: 'Identifier', name: token.value, line: token.line, column: token.column };
    }
    if (this.check(TokenType.Punctuation, '(')) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.Punctuation, "esperava ')'", ')');
      return expr;
    }
    if (this.check(TokenType.Punctuation, '[')) {
      return this.parseListLiteral();
    }
    if (this.check(TokenType.Punctuation, '{')) {
      return this.parseDictLiteral();
    }

    throw new ParseError(
      `esperava uma expressão, encontrado ${describeToken(token)}`,
      token.line,
      token.column,
    );
  }

  private parseListLiteral(): Expression {
    const token = this.expect(TokenType.Punctuation, "esperava '['", '[');
    const elements: Expression[] = [];
    if (!this.check(TokenType.Punctuation, ']')) {
      elements.push(this.parseExpression());
      while (this.check(TokenType.Punctuation, ',')) {
        this.advance();
        elements.push(this.parseExpression());
      }
    }
    this.expect(TokenType.Punctuation, "esperava ']'", ']');
    return { kind: 'ListLiteral', elements, line: token.line, column: token.column };
  }

  private parseDictLiteral(): Expression {
    const token = this.expect(TokenType.Punctuation, "esperava '{'", '{');
    const entries: Array<{ key: Expression; value: Expression }> = [];
    if (!this.check(TokenType.Punctuation, '}')) {
      entries.push(this.parseDictEntry());
      while (this.check(TokenType.Punctuation, ',')) {
        this.advance();
        entries.push(this.parseDictEntry());
      }
    }
    this.expect(TokenType.Punctuation, "esperava '}'", '}');
    return { kind: 'DictLiteral', entries, line: token.line, column: token.column };
  }

  private parseDictEntry(): { key: Expression; value: Expression } {
    const key = this.parseExpression();
    this.expect(TokenType.Punctuation, "esperava ':' entre chave e valor", ':');
    const value = this.parseExpression();
    return { key, value };
  }
}
```

`peekNext()` is unused so far — Task 2's assignment-vs-expression-statement lookahead is what needs it. Leaving it in now (rather than adding it mid-Task-2) keeps the "infrastructure" helpers together in one place.

- [x] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: the 5 tests from Step 2 pass (plus all 38 pre-existing lexer tests, still untouched).

- [x] **Step 6: Write the failing tests for operator precedence, calls, indexing, and collection literals**

Add to `packages/lang/src/parser.test.ts`:

```ts
it('gives + and - lower precedence than * and /', () => {
  const expr = parseExpr('1 + 2 * 3');
  expect(expr).toMatchObject({
    kind: 'BinaryExpression',
    operator: '+',
    left: { kind: 'NumberLiteral', value: 1 },
    right: { kind: 'BinaryExpression', operator: '*' },
  });
});

it('is left-associative for the same precedence level', () => {
  const expr = parseExpr('1 - 2 - 3');
  expect(expr).toMatchObject({
    kind: 'BinaryExpression',
    operator: '-',
    left: { kind: 'BinaryExpression', operator: '-' },
    right: { kind: 'NumberLiteral', value: 3 },
  });
});

it('parses comparison and equality with equality binding loosest', () => {
  const expr = parseExpr('a < b == c < d');
  expect(expr).toMatchObject({
    kind: 'BinaryExpression',
    operator: '==',
    left: { kind: 'BinaryExpression', operator: '<' },
    right: { kind: 'BinaryExpression', operator: '<' },
  });
});

it('gives "nao" higher precedence than "e" and "ou"', () => {
  const expr = parseExpr('nao a e b');
  expect(expr).toMatchObject({
    kind: 'BinaryExpression',
    operator: 'e',
    left: { kind: 'UnaryExpression', operator: 'nao' },
    right: { kind: 'Identifier', name: 'b' },
  });
});

it('gives "e" higher precedence than "ou"', () => {
  const expr = parseExpr('a ou b e c');
  expect(expr).toMatchObject({
    kind: 'BinaryExpression',
    operator: 'ou',
    left: { kind: 'Identifier', name: 'a' },
    right: { kind: 'BinaryExpression', operator: 'e' },
  });
});

it('parses unary minus and lets it apply after a binary operator', () => {
  const expr = parseExpr('a - -b');
  expect(expr).toMatchObject({
    kind: 'BinaryExpression',
    operator: '-',
    right: { kind: 'UnaryExpression', operator: '-', operand: { kind: 'Identifier', name: 'b' } },
  });
});

it('parses a function call with no arguments', () => {
  expect(parseExpr('coletar()')).toMatchObject({
    kind: 'CallExpression',
    callee: { kind: 'Identifier', name: 'coletar' },
    args: [],
  });
});

it('parses a function call with arguments', () => {
  const expr = parseExpr('mover(NORTE, 2)');
  expect(expr).toMatchObject({
    kind: 'CallExpression',
    callee: { kind: 'Identifier', name: 'mover' },
    args: [
      { kind: 'Identifier', name: 'NORTE' },
      { kind: 'NumberLiteral', value: 2 },
    ],
  });
});

it('parses indexing', () => {
  const expr = parseExpr('linha["setor_id"]');
  expect(expr).toMatchObject({
    kind: 'IndexExpression',
    object: { kind: 'Identifier', name: 'linha' },
    index: { kind: 'StringLiteral', value: 'setor_id' },
  });
});

it('parses an empty list literal', () => {
  expect(parseExpr('[]')).toMatchObject({ kind: 'ListLiteral', elements: [] });
});

it('parses a list literal with elements', () => {
  const expr = parseExpr('[1, 2, 3]');
  expect(expr).toMatchObject({
    kind: 'ListLiteral',
    elements: [
      { kind: 'NumberLiteral', value: 1 },
      { kind: 'NumberLiteral', value: 2 },
      { kind: 'NumberLiteral', value: 3 },
    ],
  });
});

it('parses an empty dict literal', () => {
  expect(parseExpr('{}')).toMatchObject({ kind: 'DictLiteral', entries: [] });
});

it('parses a dict literal with entries', () => {
  const expr = parseExpr('{"fibra": 10}');
  expect(expr).toMatchObject({
    kind: 'DictLiteral',
    entries: [
      {
        key: { kind: 'StringLiteral', value: 'fibra' },
        value: { kind: 'NumberLiteral', value: 10 },
      },
    ],
  });
});

it('throws ParseError on an incomplete expression', () => {
  expect(() => parseExpr('1 +')).toThrow(ParseError);
});

it('throws a friendly Portuguese message when a closing token is missing', () => {
  expect(() => parseExpr('(1')).toThrow(/esperava/);
});
```

- [x] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: all pass (19 new parser tests + 5 from Step 2 = 24, plus the 38 lexer tests, 62 total — confirm the real number rather than trusting this arithmetic).

- [x] **Step 8: Full task verification and commit**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root)
Expected: all green. (`parseStatement`'s placeholder throw is dead code reachable only from `parseProgram`, which nothing calls yet in tests — this is fine, it gets replaced in Task 2, not deleted-and-recreated.)

```bash
git add packages/lang/src/ast.ts packages/lang/src/parser.ts packages/lang/src/parser.test.ts
git commit -m "feat(lang): add AST types and full expression parser"
```

---

### Task 2: Statement grammar (blocks, control flow, functions)

**Files:**

- Modify: `packages/lang/src/parser.ts`
- Modify: `packages/lang/src/parser.test.ts`

**Interfaces:**

- Consumes: the `Expression`-parsing methods and shared helpers (`peek`, `peekNext`, `advance`, `check`, `expect`, `describeToken`) from Task 1.
- Produces: a working `parseProgram()` — the semantic-analyzer plan (next after this one) consumes `Program`/`Statement` exactly as shaped in `ast.ts`.

- [ ] **Step 1: Write the failing tests for the simplest statements**

Add to `packages/lang/src/parser.test.ts`, in a second `describe` block:

```ts
import type { Program } from './ast';

function parseProgram(source: string): Program {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parseProgram();
}

describe('Parser (statements)', () => {
  it('parses an empty program', () => {
    expect(parseProgram('')).toEqual({ kind: 'Program', statements: [] });
  });

  it('parses a bare expression statement', () => {
    const program = parseProgram('mover(NORTE)\n');
    expect(program.statements).toHaveLength(1);
    expect(program.statements[0]).toMatchObject({ kind: 'ExpressionStatement' });
  });

  it('parses an assignment', () => {
    const program = parseProgram('x = 5\n');
    expect(program.statements[0]).toMatchObject({
      kind: 'Assignment',
      target: 'x',
      value: { kind: 'NumberLiteral', value: 5 },
    });
  });

  it('parses multiple top-level statements separated by newlines', () => {
    const program = parseProgram('a = 1\nb = 2\n');
    expect(program.statements).toHaveLength(2);
  });

  it('parses a program with no trailing newline on the last line', () => {
    const program = parseProgram('x = 1');
    expect(program.statements).toHaveLength(1);
  });
});
```

(The `import type { Program }` line goes at the top of the file with the other imports — add it there, not inline.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: FAIL — `parseStatement()` still throws its Task 1 placeholder for every input.

- [ ] **Step 3: Implement `parseStatement`, assignment, and expression-statement**

In `packages/lang/src/parser.ts`, replace:

```ts
  private parseStatement(): Statement {
    throw new ParseError('parseStatement not implemented yet', this.peek().line, this.peek().column);
  }
```

with:

```ts
  private parseStatement(): Statement {
    if (this.check(TokenType.Keyword, 'se')) return this.parseIfStatement();
    if (this.check(TokenType.Keyword, 'enquanto')) return this.parseWhileStatement();
    if (this.check(TokenType.Keyword, 'repita')) return this.parseRepeatStatement();
    if (this.check(TokenType.Keyword, 'para')) return this.parseForEachStatement();
    if (this.check(TokenType.Keyword, 'funcao')) return this.parseFunctionDeclaration();
    if (this.check(TokenType.Keyword, 'retorna')) return this.parseReturnStatement();

    const next = this.peekNext();
    if (this.check(TokenType.Identifier) && next?.type === TokenType.Operator && next.value === '=') {
      return this.parseAssignment();
    }

    const token = this.peek();
    const expression = this.parseExpression();
    this.expectStatementEnd();
    return { kind: 'ExpressionStatement', expression, line: token.line, column: token.column };
  }

  private expectStatementEnd(): void {
    if (this.check(TokenType.Newline)) {
      this.advance();
      return;
    }
    if (this.check(TokenType.Dedent) || this.check(TokenType.EOF)) {
      return;
    }
    const token = this.peek();
    throw new ParseError(
      `esperava fim de linha, encontrado ${describeToken(token)}`,
      token.line,
      token.column,
    );
  }

  private parseAssignment(): Statement {
    const nameToken = this.expect(TokenType.Identifier, 'esperava um nome de variável');
    this.expect(TokenType.Operator, "esperava '='", '=');
    const value = this.parseExpression();
    this.expectStatementEnd();
    return {
      kind: 'Assignment',
      target: nameToken.value,
      value,
      line: nameToken.line,
      column: nameToken.column,
    };
  }

  private parseBlock(): Statement[] {
    this.expect(TokenType.Newline, 'esperava quebra de linha antes do bloco');
    this.expect(TokenType.Indent, 'esperava um bloco indentado');
    const statements: Statement[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.Dedent) && !this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
      this.skipNewlines();
    }
    this.expect(TokenType.Dedent, 'esperava o fim do bloco indentado');
    return statements;
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: the 5 tests from Step 1 pass. Everything requiring `se`/`enquanto`/`repita`/`para`/`funcao`/`retorna` still fails (not written yet).

- [ ] **Step 5: Write the failing tests for control flow and function declarations**

Add to the `describe('Parser (statements)', ...)` block:

```ts
it('parses an if statement with no else', () => {
  const program = parseProgram('se solo_seco:\n    irrigar()\n');
  expect(program.statements[0]).toMatchObject({
    kind: 'IfStatement',
    condition: { kind: 'Identifier', name: 'solo_seco' },
    elseBranch: null,
  });
  const ifStmt = program.statements[0] as { thenBranch: unknown[] };
  expect(ifStmt.thenBranch).toHaveLength(1);
});

it('parses an if/else statement', () => {
  const program = parseProgram('se a:\n    b()\nsenao:\n    c()\n');
  const ifStmt = program.statements[0] as { elseBranch: unknown[] | null };
  expect(ifStmt.elseBranch).not.toBeNull();
  expect(ifStmt.elseBranch).toHaveLength(1);
});

it('parses a while statement', () => {
  const program = parseProgram('enquanto ativo:\n    trabalhar()\n');
  expect(program.statements[0]).toMatchObject({
    kind: 'WhileStatement',
    condition: { kind: 'Identifier', name: 'ativo' },
  });
});

it('parses a repeat statement', () => {
  const program = parseProgram('repita 5:\n    coletar()\n');
  expect(program.statements[0]).toMatchObject({
    kind: 'RepeatStatement',
    count: { kind: 'NumberLiteral', value: 5 },
  });
});

it('parses a for-each statement', () => {
  const program = parseProgram('para cada item em lista:\n    usar(item)\n');
  expect(program.statements[0]).toMatchObject({
    kind: 'ForEachStatement',
    itemName: 'item',
    iterable: { kind: 'Identifier', name: 'lista' },
  });
});

it('parses a function declaration with parameters', () => {
  const program = parseProgram('funcao soma(a, b):\n    retorna a + b\n');
  expect(program.statements[0]).toMatchObject({
    kind: 'FunctionDeclaration',
    name: 'soma',
    params: ['a', 'b'],
  });
});

it('parses a function declaration with no parameters', () => {
  const program = parseProgram('funcao f():\n    retorna 1\n');
  expect(program.statements[0]).toMatchObject({
    kind: 'FunctionDeclaration',
    name: 'f',
    params: [],
  });
});

it('parses a return statement with a value', () => {
  const program = parseProgram('funcao f():\n    retorna 1\n');
  const fn = program.statements[0] as { body: unknown[] };
  expect(fn.body[0]).toMatchObject({
    kind: 'ReturnStatement',
    value: { kind: 'NumberLiteral', value: 1 },
  });
});

it('parses a bare return statement with no value', () => {
  const program = parseProgram('funcao f():\n    retorna\n');
  const fn = program.statements[0] as { body: unknown[] };
  expect(fn.body[0]).toMatchObject({ kind: 'ReturnStatement', value: null });
});

it('parses nested blocks', () => {
  const program = parseProgram('se a:\n    se b:\n        c()\n');
  const outer = program.statements[0] as { thenBranch: unknown[] };
  expect(outer.thenBranch[0]).toMatchObject({ kind: 'IfStatement' });
});

it('ignores comments and blank lines inside a block', () => {
  const program = parseProgram('funcao f():\n    a()\n    # nota\n\n    b()\n');
  const fn = program.statements[0] as { body: unknown[] };
  expect(fn.body).toHaveLength(2);
});

it('parses bilingual keyword spelling identically to Portuguese', () => {
  const pt = parseProgram('se a:\n    b()\n');
  const en = parseProgram('if a:\n    b()\n');
  expect(en).toEqual(pt);
});

it('throws ParseError when a block header is missing its colon', () => {
  expect(() => parseProgram('se a\n    b()\n')).toThrow(ParseError);
});

it('throws ParseError when a block is not indented', () => {
  expect(() => parseProgram('se a:\nb()\n')).toThrow(ParseError);
});

it('throws a friendly Portuguese message for a missing function name', () => {
  expect(() => parseProgram('funcao ():\n    retorna 1\n')).toThrow(/esperava/);
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: FAIL — none of `parseIfStatement`/`parseWhileStatement`/`parseRepeatStatement`/`parseForEachStatement`/`parseFunctionDeclaration`/`parseReturnStatement` exist yet, so this is a compile error via Vitest, same situation as Task 1 Step 3.

- [ ] **Step 7: Implement the remaining statement grammar**

In `packages/lang/src/parser.ts`, add these methods (anywhere inside the class, e.g. right after `parseBlock`):

```ts
  private parseIfStatement(): Statement {
    const token = this.expect(TokenType.Keyword, "esperava 'se'", 'se');
    const condition = this.parseExpression();
    this.expect(TokenType.Punctuation, "esperava ':' depois da condição", ':');
    const thenBranch = this.parseBlock();
    let elseBranch: Statement[] | null = null;
    if (this.check(TokenType.Keyword, 'senao')) {
      this.advance();
      this.expect(TokenType.Punctuation, "esperava ':' depois de 'senao'", ':');
      elseBranch = this.parseBlock();
    }
    return {
      kind: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
      line: token.line,
      column: token.column,
    };
  }

  private parseWhileStatement(): Statement {
    const token = this.expect(TokenType.Keyword, "esperava 'enquanto'", 'enquanto');
    const condition = this.parseExpression();
    this.expect(TokenType.Punctuation, "esperava ':' depois da condição", ':');
    const body = this.parseBlock();
    return { kind: 'WhileStatement', condition, body, line: token.line, column: token.column };
  }

  private parseRepeatStatement(): Statement {
    const token = this.expect(TokenType.Keyword, "esperava 'repita'", 'repita');
    const count = this.parseExpression();
    this.expect(TokenType.Punctuation, "esperava ':' depois da contagem", ':');
    const body = this.parseBlock();
    return { kind: 'RepeatStatement', count, body, line: token.line, column: token.column };
  }

  private parseForEachStatement(): Statement {
    const token = this.expect(TokenType.Keyword, "esperava 'para'", 'para');
    this.expect(TokenType.Keyword, "esperava 'cada' depois de 'para'", 'cada');
    const nameToken = this.expect(TokenType.Identifier, 'esperava o nome da variável do laço');
    this.expect(TokenType.Keyword, "esperava 'em'", 'em');
    const iterable = this.parseExpression();
    this.expect(TokenType.Punctuation, "esperava ':' depois da lista", ':');
    const body = this.parseBlock();
    return {
      kind: 'ForEachStatement',
      itemName: nameToken.value,
      iterable,
      body,
      line: token.line,
      column: token.column,
    };
  }

  private parseFunctionDeclaration(): Statement {
    const token = this.expect(TokenType.Keyword, "esperava 'funcao'", 'funcao');
    const nameToken = this.expect(TokenType.Identifier, 'esperava o nome da função');
    this.expect(TokenType.Punctuation, "esperava '(' depois do nome da função", '(');
    const params: string[] = [];
    if (!this.check(TokenType.Punctuation, ')')) {
      params.push(this.expect(TokenType.Identifier, 'esperava o nome de um parâmetro').value);
      while (this.check(TokenType.Punctuation, ',')) {
        this.advance();
        params.push(this.expect(TokenType.Identifier, 'esperava o nome de um parâmetro').value);
      }
    }
    this.expect(TokenType.Punctuation, "esperava ')' depois dos parâmetros", ')');
    this.expect(TokenType.Punctuation, "esperava ':' depois de '()'", ':');
    const body = this.parseBlock();
    return {
      kind: 'FunctionDeclaration',
      name: nameToken.value,
      params,
      body,
      line: token.line,
      column: token.column,
    };
  }

  private parseReturnStatement(): Statement {
    const token = this.expect(TokenType.Keyword, "esperava 'retorna'", 'retorna');
    let value: Expression | null = null;
    if (!this.check(TokenType.Newline) && !this.check(TokenType.Dedent) && !this.check(TokenType.EOF)) {
      value = this.parseExpression();
    }
    this.expectStatementEnd();
    return { kind: 'ReturnStatement', value, line: token.line, column: token.column };
  }
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: all pass.

- [ ] **Step 9: Export the new symbols from the package barrel**

Replace the full contents of `packages/lang/src/index.ts` with:

```ts
export { Lexer, LexError, TokenType } from './lexer';
export type { Token } from './lexer';
export { Parser, ParseError } from './parser';
export type { Expression, Statement, Program } from './ast';
```

- [ ] **Step 10: Full task verification and commit**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root)
Expected: all green.

```bash
git add packages/lang/src/parser.ts packages/lang/src/parser.test.ts packages/lang/src/index.ts
git commit -m "feat(lang): add statement parser for control flow and function declarations"
```

---

### Task 3: Syntactic grammar doc and final verification

**Files:**

- Modify: `docs/grammar.ebnf`

**Interfaces:**

- Consumes: the final grammar implemented in Tasks 1-2.
- Produces: the syntactic-grammar reference the semantic-analyzer plan (next in Fase 1) and the property-based-testing plan after it both point back to.

- [ ] **Step 1: Add the syntactic grammar**

Append to `docs/grammar.ebnf` (after the existing lexical-grammar content, keep everything already there):

```ebnf

(* --- Syntactic grammar (packages/lang/src/parser.ts) --- *)

program        = { statement } ;
block          = INDENT , { statement } , DEDENT ;

statement      = ifStatement | whileStatement | repeatStatement | forEachStatement
               | functionDeclaration | returnStatement | assignment
               | expressionStatement ;

ifStatement    = "se" , expression , ":" , NEWLINE , block ,
                 [ "senao" , ":" , NEWLINE , block ] ;
whileStatement = "enquanto" , expression , ":" , NEWLINE , block ;
repeatStatement= "repita" , expression , ":" , NEWLINE , block ;
forEachStatement = "para" , "cada" , identifier , "em" , expression , ":" , NEWLINE , block ;
functionDeclaration = "funcao" , identifier , "(" , [ paramList ] , ")" , ":" , NEWLINE , block ;
paramList      = identifier , { "," , identifier } ;
returnStatement= "retorna" , [ expression ] , statementEnd ;
assignment     = identifier , "=" , expression , statementEnd ;
expressionStatement = expression , statementEnd ;
statementEnd   = NEWLINE | DEDENT | EOF ;
               (* the last statement in a source with no trailing newline is
                  followed directly by DEDENT or EOF, not NEWLINE *)

(* precedence, loosest to tightest *)
expression     = logicOr ;
logicOr        = logicAnd , { "ou" , logicAnd } ;
logicAnd       = logicNot , { "e" , logicNot } ;
logicNot       = [ "nao" ] , equality ;
equality       = comparison , { ( "==" | "!=" ) , comparison } ;
comparison     = additive , { ( "<" | ">" | "<=" | ">=" ) , additive } ;
additive       = multiplicative , { ( "+" | "-" ) , multiplicative } ;
multiplicative = unary , { ( "*" | "/" | "%" ) , unary } ;
unary          = [ "-" ] , postfix ;
postfix        = primary , { callSuffix | indexSuffix } ;
callSuffix     = "(" , [ argList ] , ")" ;
indexSuffix    = "[" , expression , "]" ;
argList        = expression , { "," , expression } ;
primary        = number | string | "verdadeiro" | "falso" | identifier
               | "(" , expression , ")" | listLiteral | dictLiteral ;
listLiteral    = "[" , [ expression , { "," , expression } ] , "]" ;
dictLiteral    = "{" , [ dictEntry , { "," , dictEntry } ] , "}" ;
dictEntry      = expression , ":" , expression ;

(* Comments are lexically real (see lexical grammar above) but syntactically
   invisible: the parser filters every Comment token out of the stream
   before applying any of the rules above, rather than special-casing a
   possible trailing comment at every rule that ends a line. *)
```

- [ ] **Step 2: Full repo verification**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root)
Expected: all green.

- [ ] **Step 3: Commit and push**

```bash
git add docs/grammar.ebnf
git commit -m "docs(lang): add syntactic grammar for the A0-A6 parser"
git push
```

---

## Exit criteria for this sub-plan

- [ ] `pnpm --filter @colonia-zero/lang test` is green with every new test from Tasks 1-2 included.
- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` is green at the repo root.
- [ ] `docs/grammar.ebnf` documents the full syntactic grammar, matching `parser.ts` exactly.
- [ ] Three commits pushed to `main`: expression parser, statement parser, grammar doc.

**Next sub-plan in Fase 1:** an AST-to-source printer plus `fast-check`-based property testing (`any AST → print → reparse → same AST`), the parser risk mitigation called out in the project plan §6.2 ("Bug sutil no parser destrói saves"). It needs today's frozen `Expression`/`Statement`/`Program` shape to generate from, which is why it comes after this plan rather than inside it. After that: the semantic analyzer (scope resolution, feature gating by unlocked tier, Levenshtein-based "did you mean" suggestions for typos in identifiers/function names — deliberately deferred out of this parser plan since it needs to know what identifiers exist, which is a semantic question, not a syntactic one).
