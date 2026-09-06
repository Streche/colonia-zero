import { describe, expect, it } from 'vitest';
import { Lexer } from './lexer';
import { Parser, ParseError } from './parser';
import type { Expression, Program } from './ast';

function parseExpr(source: string): Expression {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parseExpression();
}

function parseProgram(source: string): Program {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parseProgram();
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
});
