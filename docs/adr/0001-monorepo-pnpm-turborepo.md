# ADR-0001: Monorepo with pnpm workspaces + Turborepo

## Status

Accepted

## Context

The project has hard package boundaries by design (`lang` must not import
`sim`; `sim` must not import `ui` — see the project plan, §6.1). We need a
tool that gives per-package builds/tests, caches them, and makes crossing a
boundary a visible dependency, without adding infrastructure a two-person
team doesn't need yet.

## Decision

pnpm workspaces for package management, Turborepo for task orchestration
and caching. TypeScript strict mode in every package, sharing one
`tsconfig.base.json`. ESLint flat config + Prettier at the repo root, not
per-package. No `dependency-cruiser` or similar boundary-enforcement tool
yet — added only once a real cross-package import violation happens once
(YAGNI, per the Tech Lead persona's own stated risk mitigation).

## Consequences

- Adding a package means adding a folder under `packages/`, `apps/`,
  `tools/`, or `spikes/` and a `package.json` — no central registration.
- `turbo run test` only re-runs tests for packages whose inputs changed.
- Package boundaries are convention, not yet enforced by tooling. This is
  an accepted, temporary risk (see plan doc §6.1 risk: "acoplamento
  silencioso") to be revisited before Fase 4.
- Spike B/C (see ADR-0003 and `spikes/monaco-worker-lang`) surfaced a
  concrete tooling finding worth carrying into Fase 2: importing the full
  `monaco-editor` package registers all ~90 bundled language modes and
  pulls the editor core into a single 3.2 MB / 827 KB-gzip chunk that
  loads eagerly on first paint. The real product (`apps/web`) must import
  only `monaco-editor`'s core editor API plus our own Pyra language
  contribution — not the umbrella package — or the <3s first-interaction
  target (plan doc §6.5 DoD) is at risk before any game code is even
  written.
