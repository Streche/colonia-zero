export enum TokenType {
  Identifier = 'Identifier',
  Keyword = 'Keyword',
  Number = 'Number',
  String = 'String',
  Operator = 'Operator',
  Punctuation = 'Punctuation',
  Comment = 'Comment',
  Newline = 'Newline',
  Indent = 'Indent',
  Dedent = 'Dedent',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// A Map, not a plain object: a plain object's bracket lookup falls through
// to inherited Object.prototype members (e.g. `obj['constructor']` resolves
// to the Object constructor, not undefined), which would misclassify
// perfectly ordinary identifiers like `constructor` or `toString` as
// keywords with a non-string token value.
const KEYWORD_ALIASES = new Map<string, string>([
  ['se', 'se'],
  ['if', 'se'],
  ['senao', 'senao'],
  ['else', 'senao'],
  ['enquanto', 'enquanto'],
  ['while', 'enquanto'],
  ['funcao', 'funcao'],
  ['def', 'funcao'],
  ['retorna', 'retorna'],
  ['return', 'retorna'],
  ['verdadeiro', 'verdadeiro'],
  ['true', 'verdadeiro'],
  ['falso', 'falso'],
  ['false', 'falso'],
  ['repita', 'repita'],
  ['repeat', 'repita'],
  ['para', 'para'],
  ['for', 'para'],
  ['cada', 'cada'],
  ['each', 'cada'],
  ['em', 'em'],
  ['in', 'em'],
  ['e', 'e'],
  ['and', 'e'],
  ['ou', 'ou'],
  ['or', 'ou'],
  ['nao', 'nao'],
  ['not', 'nao'],
]);
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
  private atLineStart = true;
  private readonly indentStack: number[] = [0];

  constructor(private readonly source: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      if (this.atLineStart) {
        this.atLineStart = false;
        if (this.consumeIndentation(tokens)) {
          continue; // blank or comment-only line: indent stack untouched
        }
      }

      const char = this.source[this.pos] as string;

      if (char === '\n') {
        tokens.push({ type: TokenType.Newline, value: '\n', line: this.line, column: this.column });
        this.pos += 1;
        this.line += 1;
        this.column = 1;
        this.atLineStart = true;
        continue;
      }

      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
        continue;
      }

      if (char === '#') {
        const startColumn = this.column;
        const start = this.pos;
        while (
          this.pos < this.source.length &&
          this.source[this.pos] !== '\n' &&
          this.source[this.pos] !== '\r'
        ) {
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
        const canonical = KEYWORD_ALIASES.get(value);
        tokens.push({
          type: canonical === undefined ? TokenType.Identifier : TokenType.Keyword,
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

    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      tokens.push({ type: TokenType.Dedent, value: '', line: this.line, column: this.column });
    }
    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return tokens;
  }

  // Measures leading whitespace on a new logical line and emits Indent/Dedent
  // as needed. Returns true for a blank or comment-only line, which must not
  // change the indent stack.
  private consumeIndentation(tokens: Token[]): boolean {
    const lineStartColumn = this.column;
    let width = 0;
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === ' ') {
        width += 1;
        this.advance();
      } else if (char === '\t') {
        throw new LexError(
          'tabs não são permitidos para indentação, use espaços',
          this.line,
          this.column,
        );
      } else {
        break;
      }
    }

    const next = this.source[this.pos];
    if (next === undefined || next === '\n' || next === '\r' || next === '#') {
      return true;
    }

    const top = this.indentStack[this.indentStack.length - 1] as number;
    if (width > top) {
      this.indentStack.push(width);
      tokens.push({ type: TokenType.Indent, value: '', line: this.line, column: lineStartColumn });
    } else if (width < top) {
      while (
        this.indentStack.length > 1 &&
        (this.indentStack[this.indentStack.length - 1] as number) > width
      ) {
        this.indentStack.pop();
        tokens.push({
          type: TokenType.Dedent,
          value: '',
          line: this.line,
          column: lineStartColumn,
        });
      }
      if (this.indentStack[this.indentStack.length - 1] !== width) {
        throw new LexError('indentação inconsistente', this.line, lineStartColumn);
      }
    }
    return false;
  }

  private advance(): void {
    this.pos += 1;
    this.column += 1;
  }
}
