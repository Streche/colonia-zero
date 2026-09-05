# ADR-0002: Bytecode + stack VM over a tree-walking interpreter for Pyra

## Status

Accepted

## Context

Pyra (the game's programming language) needs to: pause execution between
individual instructions to measure exact tick cost, serialize execution
state mid-program (so a save can happen while a `while` loop is running),
and support step-through debugging with a time-travel scrubber (§1.3,
§6.5 of the project plan). A tree-walking interpreter ties execution state
to the host language's own call stack, which makes pausing and
serializing mid-call substantially harder — you'd have to either reify
the whole call stack yourself (at which point you've mostly built a
bytecode VM anyway) or give up on the debugger/save-mid-execution
features.

## Decision

Compile Pyra source to bytecode; execute on a stack-based virtual machine
that runs a bounded number of instructions per game tick. Indentation is
significant (Python-style), so the lexer emits `INDENT`/`DEDENT` tokens —
this is locked in now because changing it later means rewriting the
parser.

## Consequences

- More upfront work than a tree-walking interpreter.
- Buys, for free: exact per-instruction tick costing, save/resume
  mid-execution, and step debugging without special-casing the host
  language's call stack.
- The grammar freezes at the end of Fase 1 (plan doc §6.2 risk
  mitigation) — new capabilities after that ship as native functions, not
  new syntax.
