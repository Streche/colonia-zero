export enum TokenType {
  Identifier = 'Identifier',
  Keyword = 'Keyword',
  Number = 'Number',
  String = 'String',
  Operator = 'Operator',
  Punctuation = 'Punctuation',
  Comment = 'Comment',
  Newline = 'Newline',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORD_ALIASES: Record<string, string> = {
  se: 'se',
  if: 'se',
  senao: 'senao',
  else: 'senao',
  enquanto: 'enquanto',
  while: 'enquanto',
  funcao: 'funcao',
  def: 'funcao',
  retorna: 'retorna',
  return: 'retorna',
  verdadeiro: 'verdadeiro',
  true: 'verdadeiro',
  falso: 'falso',
  false: 'falso',
  repita: 'repita',
  repeat: 'repita',
  para: 'para',
  for: 'para',
  cada: 'cada',
  each: 'cada',
  em: 'em',
  in: 'em',
  e: 'e',
  and: 'e',
  ou: 'ou',
  or: 'ou',
  nao: 'nao',
  not: 'nao',
};
const TWO_CHAR_OPERATORS = ['==', '!=', '<=', '>='];
const ONE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '%', '=', '<', '>']);
const PUNCTUATION = new Set(['(', ')', ',', ':', '[', ']', '{', '}']);

export class LexError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(message);
    this.name = 'LexError';
  }
}

export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(private readonly source: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      const char = this.source[this.pos] as string;

      if (char === '\n') {
        tokens.push({ type: TokenType.Newline, value: '\n', line: this.line, column: this.column });
        this.pos += 1;
        this.line += 1;
        this.column = 1;
        continue;
      }

      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
        continue;
      }

      if (char === '#') {
        const startColumn = this.column;
        const start = this.pos;
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.advance();
        }
        tokens.push({
          type: TokenType.Comment,
          value: this.source.slice(start, this.pos),
          line: this.line,
          column: startColumn,
        });
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        const start = this.pos;
        const startColumn = this.column;
        while (
          this.pos < this.source.length &&
          /[a-zA-Z0-9_]/.test(this.source[this.pos] as string)
        ) {
          this.advance();
        }
        const value = this.source.slice(start, this.pos);
        const canonical = KEYWORD_ALIASES[value];
        tokens.push({
          type: canonical ? TokenType.Keyword : TokenType.Identifier,
          value: canonical ?? value,
          line: this.line,
          column: startColumn,
        });
        continue;
      }

      if (/[0-9]/.test(char)) {
        const start = this.pos;
        const startColumn = this.column;
        while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos] as string)) {
          this.advance();
        }
        tokens.push({
          type: TokenType.Number,
          value: this.source.slice(start, this.pos),
          line: this.line,
          column: startColumn,
        });
        continue;
      }

      if (char === '"') {
        const startLine = this.line;
        const startColumn = this.column;
        this.advance();
        const start = this.pos;
        while (this.pos < this.source.length && this.source[this.pos] !== '"') {
          if (this.source[this.pos] === '\n') {
            throw new LexError('unterminated string before end of line', startLine, startColumn);
          }
          this.advance();
        }
        if (this.pos >= this.source.length) {
          throw new LexError('unterminated string', startLine, startColumn);
        }
        const value = this.source.slice(start, this.pos);
        this.advance();
        tokens.push({ type: TokenType.String, value, line: startLine, column: startColumn });
        continue;
      }

      const twoChar = this.source.slice(this.pos, this.pos + 2);
      if (TWO_CHAR_OPERATORS.includes(twoChar)) {
        tokens.push({
          type: TokenType.Operator,
          value: twoChar,
          line: this.line,
          column: this.column,
        });
        this.advance();
        this.advance();
        continue;
      }

      if (ONE_CHAR_OPERATORS.has(char)) {
        tokens.push({
          type: TokenType.Operator,
          value: char,
          line: this.line,
          column: this.column,
        });
        this.advance();
        continue;
      }

      if (PUNCTUATION.has(char)) {
        tokens.push({
          type: TokenType.Punctuation,
          value: char,
          line: this.line,
          column: this.column,
        });
        this.advance();
        continue;
      }

      throw new LexError(`unexpected character '${char}'`, this.line, this.column);
    }

    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return tokens;
  }

  private advance(): void {
    this.pos += 1;
    this.column += 1;
  }
}
