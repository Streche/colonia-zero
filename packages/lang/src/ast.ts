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
