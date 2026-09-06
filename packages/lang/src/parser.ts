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
