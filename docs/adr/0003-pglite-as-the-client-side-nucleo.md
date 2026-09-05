# ADR-0003: PGlite as the client-side Núcleo

## Status

Accepted

## Context

The game's core differentiator is that the world state _is_ a real
PostgreSQL database the player queries with real SQL, including CTEs,
window functions, triggers/PL-pgSQL, and query-cost-driven mechanics via
`EXPLAIN`. This only works if PGlite (Postgres compiled to WASM) actually
supports all of that inside a browser tab. This was the single highest
technical risk in the project plan (§10, §13 Problema 7) — untested
before this ADR.

## Decision

Adopt PGlite as the client-side "Núcleo", loaded lazily: only once the
player unlocks it in-game, not on first paint.

## Evidence

Spike A (`spikes/pglite-validation/validate.ts`), run on 2026-09-04:

```
=== Spike A: PGlite capability validation ===

PASS - CTE (WITH) (2 rows returned)
PASS - Window function (OVER/PARTITION BY) (5 rows returned)
PASS - PL/pgSQL function + trigger (1 event(s) recorded by the trigger)
PASS - EXPLAIN (FORMAT JSON) (Total Cost = 10000000031.25)

Overall result: PASS
```

All four capabilities the query-cost and automation mechanics depend on
are present. Note for Fase 3 (§6.3, "aplicar curva log"): the raw
`Total Cost` on an un-analyzed table with a handful of rows already reads
in the billions — PostgreSQL's planner cost units are not human-scaled,
so the tick-cost formula needs a normalizing curve regardless of table
size, not just at the high end.

Spike C (`spikes/monaco-worker-lang`, built with `@electric-sql/pglite`
added) confirmed the lazy-loading pattern works end to end: PGlite's
runtime is `postgres-*.wasm` (7.9 MB raw / 2.7 MB gzip) plus
`postgres-*.data` (5.3 MB raw) — large, but per `pnpm build` output these
land in their own chunks and, per manual verification in-browser, are
only fetched when the "Carregar Núcleo" action actually runs the dynamic
`import('@electric-sql/pglite')` — not on initial page load.

## Consequences

- The game's SQL never leaves the browser — no server-side attack surface
  for player-submitted SQL (security pillar, §6.10).
- Query cost mechanics (ticks from `EXPLAIN (FORMAT JSON)` → `Total Cost`)
  are feasible as designed in §6.3, with the caveat above about needing a
  log curve from the start, not as a later tuning pass.
- The ~10 MB combined PGlite payload must stay behind the lazy-load
  boundary validated here; loading it eagerly would blow the <3s
  first-interaction target (plan doc §6.5 DoD) on any real-world
  connection.
- The server-side database (accounts/saves/ranking, from Fase 5 onward)
  stays entirely separate from the game's Núcleo — never the same
  instance.
