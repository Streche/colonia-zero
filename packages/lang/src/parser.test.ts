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
});
