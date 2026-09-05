import { describe, expect, it } from 'vitest';
import { Lexer, LexError, TokenType } from './lexer';

function types(source: string) {
  return new Lexer(source).tokenize().map((t) => t.type);
}

function values(source: string) {
  return new Lexer(source).tokenize().map((t) => t.value);
}

describe('Lexer', () => {
  it('tokenizes an empty source as just EOF', () => {
    expect(types('')).toEqual([TokenType.EOF]);
  });

  it('tokenizes a single identifier', () => {
    const tokens = new Lexer('mover').tokenize();
    expect(tokens[0]).toMatchObject({ type: TokenType.Identifier, value: 'mover' });
  });

  it('recognizes every keyword in the bootstrap set', () => {
    for (const kw of ['se', 'senao', 'enquanto', 'funcao', 'retorna', 'verdadeiro', 'falso']) {
      expect(types(kw)).toEqual([TokenType.Keyword, TokenType.EOF]);
    }
  });

  it('does not confuse an identifier that merely starts with a keyword', () => {
    expect(types('senao_definido')).toEqual([TokenType.Identifier, TokenType.EOF]);
  });

  it('tokenizes an integer literal', () => {
    const tokens = new Lexer('42').tokenize();
    expect(tokens[0]).toMatchObject({ type: TokenType.Number, value: '42' });
  });

  it('tokenizes a string literal without the surrounding quotes', () => {
    const tokens = new Lexer('"fibra"').tokenize();
    expect(tokens[0]).toMatchObject({ type: TokenType.String, value: 'fibra' });
  });

  it('tokenizes each single-character operator', () => {
    for (const op of ['+', '-', '*', '/', '=', '<', '>']) {
      expect(types(op)).toEqual([TokenType.Operator, TokenType.EOF]);
    }
  });

  it('tokenizes each two-character operator without splitting it', () => {
    for (const op of ['==', '!=', '<=', '>=']) {
      const tokens = new Lexer(op).tokenize();
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: TokenType.Operator, value: op });
    }
  });

  it('tokenizes punctuation', () => {
    expect(types('(,):')).toEqual([
      TokenType.Punctuation,
      TokenType.Punctuation,
      TokenType.Punctuation,
      TokenType.Punctuation,
      TokenType.EOF,
    ]);
  });

  it('tokenizes a line comment up to (not including) the newline', () => {
    const tokens = new Lexer('# comentario\nmover').tokenize();
    expect(tokens[0]).toMatchObject({ type: TokenType.Comment, value: '# comentario' });
  });

  it('emits a Newline token for each line break', () => {
    expect(types('a\nb\nc')).toEqual([
      TokenType.Identifier,
      TokenType.Newline,
      TokenType.Identifier,
      TokenType.Newline,
      TokenType.Identifier,
      TokenType.EOF,
    ]);
  });

  it('always ends with exactly one EOF token', () => {
    const tokens = new Lexer('a b c').tokenize();
    expect(tokens.at(-1)).toMatchObject({ type: TokenType.EOF });
    expect(tokens.filter((t) => t.type === TokenType.EOF)).toHaveLength(1);
  });

  it('skips spaces and tabs between tokens', () => {
    expect(types('a\t  b')).toEqual([TokenType.Identifier, TokenType.Identifier, TokenType.EOF]);
  });

  it('tokenizes a full function call expression', () => {
    expect(values('mover(NORTE)')).toEqual(['mover', '(', 'NORTE', ')', '']);
  });

  it('tokenizes a full function definition line', () => {
    expect(types('funcao soma(a, b):')).toEqual([
      TokenType.Keyword,
      TokenType.Identifier,
      TokenType.Punctuation,
      TokenType.Identifier,
      TokenType.Punctuation,
      TokenType.Identifier,
      TokenType.Punctuation,
      TokenType.Punctuation,
      TokenType.EOF,
    ]);
  });

  it('tracks line numbers across multiple lines', () => {
    const tokens = new Lexer('a\nb').tokenize();
    const bToken = tokens.find((t) => t.value === 'b');
    expect(bToken?.line).toBe(2);
  });

  it('tracks column numbers within a line', () => {
    const tokens = new Lexer('  ab').tokenize();
    expect(tokens[0]).toMatchObject({ value: 'ab', column: 3 });
  });

  it('throws LexError with position info on an unterminated string', () => {
    expect(() => new Lexer('"fibra').tokenize()).toThrow(LexError);
    try {
      new Lexer('"fibra').tokenize();
    } catch (err) {
      expect(err).toBeInstanceOf(LexError);
      expect((err as LexError).line).toBe(1);
      expect((err as LexError).column).toBe(1);
    }
  });

  it('throws LexError on a string left open at end of line', () => {
    expect(() => new Lexer('"fibra\nmover').tokenize()).toThrow(/unterminated string/);
  });

  it('throws LexError on an unexpected character', () => {
    expect(() => new Lexer('@').tokenize()).toThrow(LexError);
  });
});
