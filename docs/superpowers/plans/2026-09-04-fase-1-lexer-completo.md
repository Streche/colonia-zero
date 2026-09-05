# Fase 1, Etapa 1 — Lexer Completo (INDENT/DEDENT + Aliases Bilíngues) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Fase 0 lexer skeleton (`packages/lang/src/lexer.ts`) into the complete Pyra lexer: bilingual PT/EN keyword aliases, the full punctuation/operator set needed for lists and dicts, and Python-style significant-whitespace `INDENT`/`DEDENT` tracking. This is Sub-plan 1 of Fase 1 — the parser, semantic analyzer, bytecode compiler, VM, deterministic simulation, and CLI each get their own plan afterward, executed in that order, because each one consumes exact types the previous one defines.

**Architecture:** Same single-file `Lexer` class from Fase 0, extended in place. Bilingual aliases resolve at the lexer boundary (a token's `value` is always the canonical Portuguese keyword, whichever spelling the player typed), so everything downstream — parser, compiler, VM — only ever sees one vocabulary. `INDENT`/`DEDENT` are emitted as their own token types by a small indentation-stack algorithm that runs once at the start of every logical line.

**Tech Stack:** TypeScript (strict), Vitest — same as Fase 0, no new dependencies.

## Global Constraints

- Every step in this plan modifies `packages/lang/src/lexer.ts`, `packages/lang/src/lexer.test.ts`, and (Task 3) `docs/grammar.ebnf` — no new files, no new packages.
- Canonical keyword vocabulary is Portuguese; English is an alias resolved at tokenization time, never a separate AST vocabulary (per ADR-0002's sibling decision in the project plan, §6.2).
- No tabs in leading whitespace — ever. This is a hard lexer error, not a style warning, exactly like the "significant indentation" pillar the project plan commits to in §6.2.
- Run `pnpm --filter @colonia-zero/lang test` after every step; run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root) before the final commit of each task.

---

### Task 1: Bilingual keyword aliases + new keywords, punctuation, and operators

**Files:**

- Modify: `packages/lang/src/lexer.ts`
- Modify: `packages/lang/src/lexer.test.ts`

**Interfaces:**

- Consumes: nothing new — extends the existing `TokenType`, `Token`, `Lexer`, `LexError` from Fase 0 (`packages/lang/src/lexer.ts`, see [[project-colonia-zero]] memory for where that skeleton came from).
- Produces: a `KEYWORD_ALIASES: Record<string, string>` map replacing the old `KEYWORDS: Set<string>` — Task 2 and Task 3 both read from this same map, and the parser (next plan) relies on every `Keyword` token's `value` already being canonical PT.

- [x] **Step 1: Write the failing tests for the new keywords and their EN aliases**

Add to `packages/lang/src/lexer.test.ts`, right after the existing `'recognizes every keyword in the bootstrap set'` test:

```ts
it('recognizes the new block/collection keywords added for A2-A6', () => {
  for (const kw of ['repita', 'para', 'cada', 'em', 'e', 'ou', 'nao']) {
    expect(types(kw)).toEqual([TokenType.Keyword, TokenType.EOF]);
  }
});

it('resolves English keyword aliases to their canonical Portuguese value', () => {
  const pairs: Array<[string, string]> = [
    ['if', 'se'],
    ['else', 'senao'],
    ['while', 'enquanto'],
    ['def', 'funcao'],
    ['return', 'retorna'],
    ['true', 'verdadeiro'],
    ['false', 'falso'],
    ['repeat', 'repita'],
    ['for', 'para'],
    ['each', 'cada'],
    ['in', 'em'],
    ['and', 'e'],
    ['or', 'ou'],
    ['not', 'nao'],
  ];
  for (const [alias, canonical] of pairs) {
    const tokens = new Lexer(alias).tokenize();
    expect(tokens[0]).toMatchObject({ type: TokenType.Keyword, value: canonical });
  }
});

it('produces the same canonical token whether the source uses PT or EN spelling', () => {
  const pt = new Lexer('se').tokenize();
  const en = new Lexer('if').tokenize();
  expect(pt[0]?.value).toBe(en[0]?.value);
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: the three new tests FAIL (current lexer has no `repita`/`para`/`cada`/`em`/`e`/`ou`/`nao` keywords and no alias resolution — `if`, `while`, etc. currently tokenize as `Identifier`, not `Keyword`).

- [x] **Step 3: Replace the keyword set with an alias map**

In `packages/lang/src/lexer.ts`, replace:

```ts
const KEYWORDS = new Set(['se', 'senao', 'enquanto', 'funcao', 'retorna', 'verdadeiro', 'falso']);
const TWO_CHAR_OPERATORS = ['==', '!=', '<=', '>='];
const ONE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '=', '<', '>']);
const PUNCTUATION = new Set(['(', ')', ',', ':']);
```

with:

```ts
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
```

- [x] **Step 4: Update the identifier-scanning branch to resolve aliases**

In `packages/lang/src/lexer.ts`, inside `tokenize()`, replace:

```ts
const value = this.source.slice(start, this.pos);
tokens.push({
  type: KEYWORDS.has(value) ? TokenType.Keyword : TokenType.Identifier,
  value,
  line: this.line,
  column: startColumn,
});
continue;
```

with:

```ts
const value = this.source.slice(start, this.pos);
const canonical = KEYWORD_ALIASES[value];
tokens.push({
  type: canonical ? TokenType.Keyword : TokenType.Identifier,
  value: canonical ?? value,
  line: this.line,
  column: startColumn,
});
continue;
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: all tests pass, including the 3 new ones (23 total: the original 20 from Fase 0 plus 3 new — the two-char-operator and punctuation tests already cover `%`, `[`, `]`, `{`, `}` only once Step 6 below adds their own tests).

- [x] **Step 6: Write the failing tests for the new punctuation and the modulo operator**

Add to `packages/lang/src/lexer.test.ts`:

```ts
it('tokenizes the new list/dict punctuation', () => {
  expect(types('[]{}')).toEqual([
    TokenType.Punctuation,
    TokenType.Punctuation,
    TokenType.Punctuation,
    TokenType.Punctuation,
    TokenType.EOF,
  ]);
});

it('tokenizes the modulo operator', () => {
  expect(types('%')).toEqual([TokenType.Operator, TokenType.EOF]);
});
```

- [x] **Step 7: Run the tests to verify they fail, then verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: FAIL first (Step 6 alone, before this step existed the punctuation/operator sets didn't include these characters — but Step 3 already added them to the sets, so this should actually already PASS since Step 3's edit and this test's edit are both in this task). Since Step 3 ran before this test was written, running now should show PASS directly. If it fails, re-check Step 3 was applied correctly before continuing.

- [x] **Step 8: Full task verification and commit**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root)
Expected: all green.

```bash
git add packages/lang/src/lexer.ts packages/lang/src/lexer.test.ts
git commit -m "feat(lang): add bilingual keyword aliases and list/dict punctuation to lexer"
```

---

### Task 2: INDENT/DEDENT significant whitespace

**Files:**

- Modify: `packages/lang/src/lexer.ts`
- Modify: `packages/lang/src/lexer.test.ts`

**Interfaces:**

- Consumes: `KEYWORD_ALIASES`, `PUNCTUATION` etc. from Task 1 (same file, no new exports needed from Task 1 specifically — this task adds to the same class).
- Produces: `TokenType.Indent` and `TokenType.Dedent` — the parser (next plan) treats these as block-boundary markers, exactly the way it treats `{`/`}` in a C-like grammar. **Do not rename these two enum members** — the parser plan is written against these exact names.

> **Known behavior change:** leading whitespace is no longer purely cosmetic once this task lands. One Fase 0 test (`'tracks column numbers within a line'`) asserted on `'  ab'` (leading spaces) and happens to have been exercising indentation-sensitive input by accident. Step 5 below fixes that test to use inline spacing instead, which is what it actually meant to test.

- [x] **Step 1: Write the failing tests for basic indent/dedent**

Add to `packages/lang/src/lexer.test.ts`:

```ts
it('does not emit Indent/Dedent for a flat program with no leading whitespace', () => {
  expect(types('a\nb\nc')).toEqual([
    TokenType.Identifier,
    TokenType.Newline,
    TokenType.Identifier,
    TokenType.Newline,
    TokenType.Identifier,
    TokenType.EOF,
  ]);
});

it('emits Indent then Dedent around a single indented block', () => {
  const source = 'funcao f():\n    retorna 1\n';
  expect(types(source)).toEqual([
    TokenType.Keyword, // funcao
    TokenType.Identifier, // f
    TokenType.Punctuation, // (
    TokenType.Punctuation, // )
    TokenType.Punctuation, // :
    TokenType.Newline,
    TokenType.Indent,
    TokenType.Keyword, // retorna
    TokenType.Number, // 1
    TokenType.Newline,
    TokenType.Dedent,
    TokenType.EOF,
  ]);
});

it('emits nested Indent/Dedent pairs in the right order', () => {
  const source = 'se a:\n    se b:\n        retorna 1\n';
  const kinds = types(source).filter((t) => t === TokenType.Indent || t === TokenType.Dedent);
  expect(kinds).toEqual([TokenType.Indent, TokenType.Indent, TokenType.Dedent, TokenType.Dedent]);
});

it('dedents to an intermediate level, not all the way to zero', () => {
  const source = 'se a:\n    se b:\n        c\n    d\n';
  const tokens = new Lexer(source).tokenize();
  const dIndex = tokens.findIndex((t) => t.value === 'd');
  // exactly one Dedent should sit immediately before the "d" identifier
  expect(tokens[dIndex - 1]).toMatchObject({ type: TokenType.Dedent });
  expect(tokens[dIndex - 2]).not.toMatchObject({ type: TokenType.Dedent });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: FAIL — `TokenType.Indent`/`TokenType.Dedent` don't exist yet (TypeScript compile error via Vitest), and no indentation logic exists.

- [x] **Step 3: Add the Indent/Dedent token types and the indentation-tracking state**

In `packages/lang/src/lexer.ts`, replace:

```ts
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
```

with:

```ts
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
```

And replace the `Lexer` class's field declarations:

```ts
export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(private readonly source: string) {}
```

with:

```ts
export class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private atLineStart = true;
  private readonly indentStack: number[] = [0];

  constructor(private readonly source: string) {}
```

- [x] **Step 4: Wire the indentation check into `tokenize()` and emit trailing dedents at EOF**

In `packages/lang/src/lexer.ts`, replace the top of the `tokenize()` loop:

```ts
    while (this.pos < this.source.length) {
      const char = this.source[this.pos] as string;

      if (char === '\n') {
        tokens.push({ type: TokenType.Newline, value: '\n', line: this.line, column: this.column });
        this.pos += 1;
        this.line += 1;
        this.column = 1;
        continue;
      }
```

with:

```ts
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
```

Then replace the end of `tokenize()`:

```ts
      throw new LexError(`unexpected character '${char}'`, this.line, this.column);
    }

    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return tokens;
  }

  private advance(): void {
```

with:

```ts
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
    if (next === undefined || next === '\n' || next === '#') {
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
        tokens.push({ type: TokenType.Dedent, value: '', line: this.line, column: lineStartColumn });
      }
      if (this.indentStack[this.indentStack.length - 1] !== width) {
        throw new LexError('indentação inconsistente', this.line, lineStartColumn);
      }
    }
    return false;
  }

  private advance(): void {
```

- [x] **Step 5: Fix the one Fase 0 test that accidentally relied on leading whitespace being cosmetic**

In `packages/lang/src/lexer.test.ts`, replace:

```ts
it('tracks column numbers within a line', () => {
  const tokens = new Lexer('  ab').tokenize();
  expect(tokens[0]).toMatchObject({ value: 'ab', column: 3 });
});
```

with:

```ts
it('tracks column numbers within a line', () => {
  const tokens = new Lexer('a  bb').tokenize();
  expect(tokens[1]).toMatchObject({ value: 'bb', column: 4 });
});
```

- [x] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: all pass (27 tests: 20 from Fase 0 minus the 1 rewritten plus 4 new indent/dedent tests, plus the 6 from Task 1 = 20 - 1 + 1 + 4 + 6 = 30 — run it and confirm the actual count rather than trusting this arithmetic).

- [x] **Step 7: Write the failing tests for blank lines, comments, and error cases inside indentation**

Add to `packages/lang/src/lexer.test.ts`:

```ts
it('does not let a blank line inside a block disturb the indent stack', () => {
  const source = 'funcao f():\n    a\n\n    b\n';
  const tokens = new Lexer(source).tokenize();
  const dedents = tokens.filter((t) => t.type === TokenType.Dedent);
  expect(dedents).toHaveLength(1); // only the one at the very end
});

it('does not let a comment-only line inside a block disturb the indent stack', () => {
  const source = 'funcao f():\n    a\n    # nota\n    b\n';
  const tokens = new Lexer(source).tokenize();
  const indents = tokens.filter((t) => t.type === TokenType.Indent);
  expect(indents).toHaveLength(1); // entering the function body once, not re-entering after the comment
});

it('throws LexError when leading whitespace uses a tab', () => {
  expect(() => new Lexer('funcao f():\n\tretorna 1\n').tokenize()).toThrow(/espaços/);
});

it('throws LexError on a dedent that matches no enclosing indentation level', () => {
  const source = 'se a:\n    se b:\n        c\n  d\n'; // dedents to width 2, but stack only has 0/4/8
  expect(() => new Lexer(source).tokenize()).toThrow(/inconsistente/);
});

it('emits one Dedent per level still open when the source ends without dedenting', () => {
  const source = 'se a:\n    se b:\n        c';
  const tokens = new Lexer(source).tokenize();
  const dedents = tokens.filter((t) => t.type === TokenType.Dedent);
  expect(dedents).toHaveLength(2);
});
```

- [x] **Step 8: Run the tests to verify they fail, then implement is already done — verify they pass**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: these 5 should already PASS given Step 4's implementation (this step is a verification checkpoint, not new implementation — if any of these fail, the `consumeIndentation` logic has a bug relative to the design in Step 4 and needs fixing before moving on, not the tests).

- [x] **Step 9: Full task verification and commit**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root)
Expected: all green.

```bash
git add packages/lang/src/lexer.ts packages/lang/src/lexer.test.ts
git commit -m "feat(lang): add INDENT/DEDENT significant-whitespace tracking to lexer"
```

---

### Task 3: Update the lexical grammar doc and do a full-suite sanity pass

**Files:**

- Modify: `docs/grammar.ebnf`

**Interfaces:**

- Consumes: the final keyword/punctuation/operator sets from Tasks 1-2.
- Produces: the lexical-grammar reference the parser plan's own EBNF (syntactic grammar) will point back to.

- [x] **Step 1: Rewrite the lexical grammar**

Replace the full contents of `docs/grammar.ebnf` with:

```ebnf
(* docs/grammar.ebnf — lexical grammar only, matches packages/lang/src/lexer.ts.
   Syntactic grammar (statements, blocks, expressions) is documented once the
   parser exists — see the Fase 1 parser plan. *)

keyword        = "se" | "if"
               | "senao" | "else"
               | "enquanto" | "while"
               | "funcao" | "def"
               | "retorna" | "return"
               | "verdadeiro" | "true"
               | "falso" | "false"
               | "repita" | "repeat"
               | "para" | "for"
               | "cada" | "each"
               | "em" | "in"
               | "e" | "and"
               | "ou" | "or"
               | "nao" | "not" ;
               (* every EN alias lexes to the same canonical PT keyword value;
                  there is exactly one AST vocabulary downstream of the lexer *)

identifier     = letter , { letter | digit | "_" } ;
number         = digit , { digit } ;
string         = '"' , { any character - '"' - newline } , '"' ;
operator       = "==" | "!=" | "<=" | ">=" | "+" | "-" | "*" | "/" | "%" | "=" | "<" | ">" ;
punctuation    = "(" | ")" | "," | ":" | "[" | "]" | "{" | "}" ;
comment        = "#" , { any character - newline } ;
newline        = "\n" ;
indent         = (* structural token: leading whitespace width on a new
                    logical line is greater than the enclosing block's width.
                    Tabs in leading whitespace are a lex error. *) ;
dedent         = (* structural token: leading whitespace width on a new
                    logical line drops back to an enclosing block's width.
                    One Dedent per level closed; a width matching no
                    enclosing level is a lex error ("indentação inconsistente"). *) ;

letter         = "a".."z" | "A".."Z" | "_" ;
digit          = "0".."9" ;
```

- [x] **Step 2: Full repo verification**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (repo root)
Expected: all green. Note the final test count printed by Vitest for `@colonia-zero/lang` in your report back — this plan's step counts above are best-effort arithmetic, not a hard assertion.

- [x] **Step 3: Commit and push**

```bash
git add docs/grammar.ebnf
git commit -m "docs(lang): update lexical grammar for bilingual aliases and indentation"
git push
```

---

## Exit criteria for this sub-plan

- [x] `pnpm --filter @colonia-zero/lang test` is green with every new test from Tasks 1-2 included.
- [x] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` is green at the repo root.
- [x] `docs/grammar.ebnf` reflects the exact keyword/punctuation/operator sets in `lexer.ts` — if they ever drift apart, whoever writes the parser plan is working from a stale spec.
- [x] Three commits pushed to `main`: keyword aliases + punctuation, INDENT/DEDENT, grammar doc.

**Next sub-plan in Fase 1:** the parser (recursive descent, AST for sequences/variables/conditionals/loops/functions/lists/dicts — the A0-A6 grammar surface that then freezes per ADR-0002). It consumes exactly the `Token`/`TokenType` shape this plan produces, including `Indent`/`Dedent` as block delimiters.
