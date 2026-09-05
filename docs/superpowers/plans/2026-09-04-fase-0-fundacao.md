# Fase 0 — Fundação e Validação Técnica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the "Colônia Zero" monorepo and answer, with real evidence, the two technical risks the whole project depends on — does PGlite (Postgres in WASM) support CTEs/window functions/triggers/PL-pgSQL/EXPLAIN, and does Monaco work with a custom language driven by a Web Worker — before writing a single line of the interpreter.

**Architecture:** pnpm workspaces + Turborepo monorepo, TypeScript strict everywhere. Two throwaway "spike" packages under `spikes/` validate PGlite and Monaco+Worker in isolation; their real, captured output becomes the evidence base for three ADRs. A first real product package, `packages/lang`, gets a minimal lexer skeleton (no INDENT/DEDENT yet — that's Fase 1) with unit tests, so Fase 1 starts from working code instead of an empty folder.

**Tech Stack:** TypeScript 5.7 (strict), pnpm 9+ workspaces, Turborepo 2.x, ESLint 9 flat config + Prettier, Vitest, tsx, Vite 6, `@electric-sql/pglite`, `monaco-editor`, GitHub Actions.

## Global Constraints

- Node >=22 (installed: v24.14.0 — satisfies the floor); pnpm >=9 (installed: 11.25.0).
- TypeScript strict mode in every package (`strict: true`, `noUncheckedIndexedAccess: true`).
- Never use `eval()` or `new Function()` anywhere in the codebase (security pillar, §6.10 of the plan doc) — irrelevant for config/spike code here, but the rule starts now, not in Fase 1.
- Code, identifiers, file names, and commit messages: English (Conventional Commits). In-game domain vocabulary inside the Pyra language itself (`se`, `enquanto`, `funcao`, etc.) stays Portuguese — that vocabulary _is_ the product, per §1.3/§6.2 of the plan doc. ADRs are written in English (they're linked directly from the portfolio README for recruiters, §6.12).
- No abstraction before a third real use case (Tech Lead risk mitigation, §6.1). Don't generalize the spike code — it's meant to be read once and discarded/archived.
- Every task ends with a commit on `main` (no feature branches needed solo at this stage, per user's existing workflow).

---

### Task 1: Monorepo scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.prettierrc.json`
- Create: `eslint.config.js`
- Create: `README.md` (placeholder, real content comes in Fase 2 per §6.12 — but the file must exist and say something true, not "TODO")

**Interfaces:**

- Produces: root `pnpm` scripts (`build`, `test`, `lint`, `typecheck`, `format`, `format:check`) that every later task's package plugs into via Turborepo; `tsconfig.base.json` that every package `extends`; `pnpm-workspace.yaml` globs (`apps/*`, `packages/*`, `tools/*`, `spikes/*`) that later tasks rely on to be picked up by `pnpm install`.

- [x] **Step 1: Initialize git**

```powershell
git init
git config user.name "Carlos Eduardo"
git config user.email "carlos.eduardodms1@gmail.com"
```

- [x] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
  - 'spikes/*'
```

- [x] **Step 3: Create root `package.json`**

```json
{
  "name": "colonia-zero",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "packageManager": "pnpm@11.25.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.4.0",
    "tsx": "^4.19.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.19.0",
    "vitest": "^2.1.0"
  }
}
```

- [x] **Step 4: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    }
  }
}
```

- [x] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true
  }
}
```

- [x] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
.turbo/
*.log
.DS_Store
.env
.env.local
coverage/
```

- [x] **Step 7: Create `.editorconfig`**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [x] **Step 8: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [x] **Step 9: Create `eslint.config.js`**

```js
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['spikes/monaco-worker-lang/src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
);
```

Also add `globals` to root `devDependencies` (Step 3): `"globals": "^17.12.0"`. Without this, `eslint .` throws `no-undef` on every `console`/`process` (Node scripts) and `window`/`self` (browser spike code) — ESLint's recommended config doesn't assume any runtime globals on its own.

- [x] **Step 10: Create placeholder `README.md`**

```markdown
# Colônia Zero

Jogo interativo para aprender programação e banco de dados — do básico ao
avançado — escrevendo código numa linguagem própria (Pyra) e SQL real
contra um PostgreSQL rodando no navegador (PGlite).

Status: Fase 0 — validação técnica em andamento. Ainda não há jogo jogável.

Ver `docs/adr/` para as decisões de arquitetura tomadas até aqui.
```

- [x] **Step 11: Install dependencies**

Run: `pnpm install`
Expected: creates `pnpm-lock.yaml` and `node_modules/`, no errors.

- [x] **Step 12: Verify lint and format tooling work on an empty repo**

Run: `pnpm format:check`
Expected: `Checking formatting...` then `All matched files use Prettier code style!` (fix any flagged file with `pnpm format` and re-run).

Run: `pnpm lint`
Expected: exits 0 (no files to lint yet beyond config files, which must themselves pass).

- [x] **Step 13: Commit**

```powershell
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .editorconfig .prettierrc.json eslint.config.js README.md pnpm-lock.yaml
git commit -m "chore: scaffold pnpm + turborepo monorepo"
```

---

### Task 2: Continuous Integration

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: root scripts `format:check`, `lint`, `typecheck`, `test` from Task 1.
- Produces: a CI gate that every subsequent task (and every future PR) must pass.

- [x] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

- [x] **Step 2: Verify locally (the exact sequence CI will run)**

Run: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
Expected: all four commands exit 0. `typecheck` and `test` currently run zero tasks (no packages define them yet) — Turborepo treats that as success, not failure.

- [x] **Step 3: Commit**

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: add lint/typecheck/test pipeline"
```

Note: this workflow only actually _runs_ once the repo has a GitHub remote and is pushed — that's on you per §14 of the plan doc (create the public `colonia-zero` repo, push `main`). Nothing in Fase 0 blocks on that; do it whenever you're ready.

---

### Task 3: Spike A — PGlite capability validation

**Files:**

- Create: `spikes/pglite-validation/package.json`
- Create: `spikes/pglite-validation/validate.ts`

**Interfaces:**

- Consumes: `spikes/*` workspace glob from Task 1.
- Produces: a captured PASS/FAIL result per capability (CTE, window function, trigger+PL/pgSQL, `EXPLAIN FORMAT JSON`) — this is the evidence Task 6's ADR-0003 is written from. **This is the single highest-risk item in the whole 3-month plan** (§10, §13 Problema 7): if it fails, the architecture changes before anything else is built on top of it.

- [x] **Step 1: Create the spike package**

```json
{
  "name": "spike-pglite-validation",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx validate.ts"
  },
  "dependencies": {
    "@electric-sql/pglite": "^0.2.17"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [x] **Step 2: Write the validation script**

```ts
// spikes/pglite-validation/validate.ts
import { PGlite } from '@electric-sql/pglite';

type CheckResult = { name: string; pass: boolean; detail: string };

async function main() {
  const db = new PGlite();
  const results: CheckResult[] = [];

  await db.exec(`
    CREATE TABLE sensores (
      id SERIAL PRIMARY KEY,
      setor_id INT NOT NULL,
      umidade INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  await db.exec(`
    INSERT INTO sensores (setor_id, umidade) VALUES
      (1, 12), (1, 45), (2, 8), (2, 30), (3, 60);
  `);

  // 1. CTE
  try {
    const res = await db.query(`
      WITH secos AS (
        SELECT setor_id, umidade FROM sensores WHERE umidade < 30
      )
      SELECT * FROM secos ORDER BY umidade;
    `);
    results.push({
      name: 'CTE (WITH)',
      pass: res.rows.length === 2,
      detail: `${res.rows.length} rows returned`,
    });
  } catch (err) {
    results.push({ name: 'CTE (WITH)', pass: false, detail: String(err) });
  }

  // 2. Window function
  try {
    const res = await db.query(`
      SELECT setor_id, umidade,
             AVG(umidade) OVER (PARTITION BY setor_id) AS media_setor
      FROM sensores;
    `);
    results.push({
      name: 'Window function (OVER/PARTITION BY)',
      pass: res.rows.length === 5,
      detail: `${res.rows.length} rows returned`,
    });
  } catch (err) {
    results.push({ name: 'Window function (OVER/PARTITION BY)', pass: false, detail: String(err) });
  }

  // 3. PL/pgSQL function + trigger
  try {
    await db.exec(`
      CREATE TABLE eventos (
        id SERIAL PRIMARY KEY,
        mensagem TEXT NOT NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION registrar_evento_sensor()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO eventos (mensagem)
        VALUES ('sensor inserted: setor ' || NEW.setor_id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_sensor_insert
      AFTER INSERT ON sensores
      FOR EACH ROW
      EXECUTE FUNCTION registrar_evento_sensor();
    `);
    await db.exec(`INSERT INTO sensores (setor_id, umidade) VALUES (4, 99);`);
    const res = await db.query(`SELECT * FROM eventos;`);
    results.push({
      name: 'PL/pgSQL function + trigger',
      pass: res.rows.length === 1,
      detail: `${res.rows.length} event(s) recorded by the trigger`,
    });
  } catch (err) {
    results.push({ name: 'PL/pgSQL function + trigger', pass: false, detail: String(err) });
  }

  // 4. EXPLAIN (FORMAT JSON)
  try {
    const res = await db.query<Record<string, unknown>>(
      `EXPLAIN (FORMAT JSON) SELECT * FROM sensores WHERE umidade < 30;`,
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    const plan = row?.['QUERY PLAN'];
    const totalCost = Array.isArray(plan)
      ? (plan[0] as { Plan?: Record<string, unknown> })?.Plan?.['Total Cost']
      : undefined;
    results.push({
      name: 'EXPLAIN (FORMAT JSON)',
      pass: typeof totalCost === 'number',
      detail: `Total Cost = ${String(totalCost)}`,
    });
  } catch (err) {
    results.push({ name: 'EXPLAIN (FORMAT JSON)', pass: false, detail: String(err) });
  }

  console.log('\n=== Spike A: PGlite capability validation ===\n');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} - ${r.name} (${r.detail})`);
  }

  const allPass = results.every((r) => r.pass);
  console.log(`\nOverall result: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

main();
```

- [x] **Step 3: Run it and capture the real output**

Run: `pnpm --filter spike-pglite-validation start`
Expected: four `PASS` lines and `Overall result: PASS`. **Copy the actual console output verbatim into a scratch note** — Task 6 needs it word-for-word, whatever it says. If anything is `FAIL`, that's real information, not a bug to fix quietly — it changes the ADR-0003 decision.

- [x] **Step 4: Commit**

```powershell
git add spikes/pglite-validation
git commit -m "spike: validate PGlite CTE/window/trigger/EXPLAIN support"
```

---

### Task 4: Spike B — Monaco with a custom language driven by a Web Worker

**Files:**

- Create: `spikes/monaco-worker-lang/package.json`
- Create: `spikes/monaco-worker-lang/index.html`
- Create: `spikes/monaco-worker-lang/vite.config.ts`
- Create: `spikes/monaco-worker-lang/src/pyra-spike-language.ts`
- Create: `spikes/monaco-worker-lang/src/worker.ts`
- Create: `spikes/monaco-worker-lang/src/main.ts`

**Interfaces:**

- Consumes: `spikes/*` workspace glob from Task 1.
- Produces: `LANGUAGE_ID`, `languageConfiguration`, `monarchLanguage` (from `pyra-spike-language.ts`) and `DiagnosticMessage` (from `worker.ts`) — Task 5 imports and extends this exact package, it doesn't start a new one.

- [x] **Step 1: Create the spike package**

```json
{
  "name": "spike-monaco-worker-lang",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "monaco-editor": "^0.52.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [x] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Spike B — Monaco + Worker</title>
    <style>
      html,
      body,
      #editor {
        height: 100%;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="editor"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [x] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
  },
});
```

- [x] **Step 4: Create the Monarch tokenizer for a tiny fictitious subset of Pyra**

```ts
// spikes/monaco-worker-lang/src/pyra-spike-language.ts
import type { languages } from 'monaco-editor';

export const LANGUAGE_ID = 'pyra-spike';

export const languageConfiguration: languages.LanguageConfiguration = {
  comments: { lineComment: '#' },
  brackets: [['(', ')']],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
};

export const monarchLanguage: languages.IMonarchLanguage = {
  keywords: ['se', 'senao', 'enquanto', 'funcao', 'mover', 'coletar', 'retorna'],
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      [/\d+/, 'number'],
      [/".*?"/, 'string'],
      [/#.*$/, 'comment'],
      [/[()]/, '@brackets'],
    ],
  },
};
```

- [x] **Step 5: Create the diagnostics worker**

```ts
// spikes/monaco-worker-lang/src/worker.ts
export interface DiagnosticMessage {
  line: number;
  column: number;
  length: number;
  message: string;
}

self.onmessage = (event: MessageEvent<string>) => {
  const code = event.data;
  const diagnostics: DiagnosticMessage[] = [];

  code.split('\n').forEach((lineText, index) => {
    const match = lineText.match(/\berro\b/);
    if (match && match.index !== undefined) {
      diagnostics.push({
        line: index + 1,
        column: match.index + 1,
        length: match[0].length,
        message: "uso da palavra 'erro' (diagnóstico de teste do spike)",
      });
    }
  });

  self.postMessage(diagnostics);
};
```

- [x] **Step 6: Wire the editor to the worker**

```ts
// spikes/monaco-worker-lang/src/main.ts
import * as monaco from 'monaco-editor';
import { LANGUAGE_ID, languageConfiguration, monarchLanguage } from './pyra-spike-language';
import type { DiagnosticMessage } from './worker';

monaco.languages.register({ id: LANGUAGE_ID });
monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration);
monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monarchLanguage);

const container = document.getElementById('editor');
if (!container) throw new Error('#editor element not found');

const editor = monaco.editor.create(container, {
  value: 'funcao coletar_tudo()\n    mover(1)\n    erro_de_teste()\n',
  language: LANGUAGE_ID,
  theme: 'vs-dark',
});

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

worker.onmessage = (event: MessageEvent<DiagnosticMessage[]>) => {
  const model = editor.getModel();
  if (!model) return;
  const markers: monaco.editor.IMarkerData[] = event.data.map((d) => ({
    severity: monaco.MarkerSeverity.Warning,
    startLineNumber: d.line,
    startColumn: d.column,
    endLineNumber: d.line,
    endColumn: d.column + d.length,
    message: d.message,
  }));
  monaco.editor.setModelMarkers(model, LANGUAGE_ID, markers);
};

function requestDiagnostics() {
  worker.postMessage(editor.getValue());
}

editor.onDidChangeModelContent(() => requestDiagnostics());
requestDiagnostics();

console.log('Spike B ready: Monaco editor with custom language + worker diagnostics.');
```

- [x] **Step 7: Run it and verify manually in the browser**

Run: `pnpm --filter spike-monaco-worker-lang dev`
Open the printed local URL (e.g. `http://localhost:5173`). Verify:

1. Keywords (`funcao`, `mover`) are colored differently from identifiers.
2. The line containing `erro_de_teste()` shows a warning squiggle (the worker flags the substring `erro`).
3. Typing anywhere and pausing updates the squiggles within ~200ms.
4. DevTools console shows the ready log and no _uncaught_ exceptions. (A console warning about Monaco's built-in language workers not being configured is expected and harmless here — we're not using JSON/TS built-in language services, only our own worker.)

Record the result (worked / didn't work, and exactly what broke if anything) — Task 6 references it.

- [x] **Step 8: Commit**

```powershell
git add spikes/monaco-worker-lang
git commit -m "spike: validate Monaco custom language with worker-based diagnostics"
```

---

### Task 5: Spike C — bundle size and load time with Monaco + PGlite together

**Files:**

- Modify: `spikes/monaco-worker-lang/package.json` (add `@electric-sql/pglite` dependency)
- Modify: `spikes/monaco-worker-lang/src/main.ts` (add lazy-loaded PGlite behind a button)
- Create: `spikes/monaco-worker-lang/measure-bundle.mjs`

**Interfaces:**

- Consumes: the `spike-monaco-worker-lang` package from Task 4 (same package, extended in place — not a new one).
- Produces: raw/gzip size numbers per output chunk and an observed lazy-load timing figure — both go into ADR-0001's context section and the risk register (§10 of the plan doc: "peso do WASM na primeira carga").

- [x] **Step 1: Add PGlite to the existing spike package**

Edit `spikes/monaco-worker-lang/package.json`, add to `"dependencies"`:

```json
"@electric-sql/pglite": "^0.2.17"
```

- [x] **Step 2: Add a lazy-loaded "Núcleo" button to `main.ts`**

Append to `spikes/monaco-worker-lang/src/main.ts`:

```ts
const nucleoButton = document.createElement('button');
nucleoButton.textContent = 'Carregar Núcleo (PGlite)';
nucleoButton.style.position = 'fixed';
nucleoButton.style.top = '8px';
nucleoButton.style.right = '8px';
document.body.appendChild(nucleoButton);

nucleoButton.addEventListener('click', () => {
  const t0 = performance.now();
  void import('@electric-sql/pglite').then(async ({ PGlite }) => {
    const db = new PGlite();
    await db.query('SELECT 1;');
    const elapsed = performance.now() - t0;
    console.log(`Núcleo (PGlite) carregado sob demanda em ${elapsed.toFixed(1)}ms`);
  });
});
```

This tests the exact pattern §6.3 of the plan doc requires: PGlite loads **only when the player unlocks the Núcleo**, not on first paint.

- [x] **Step 3: Install and build**

Run: `pnpm install && pnpm --filter spike-monaco-worker-lang build`
Expected: a `spikes/monaco-worker-lang/dist/` folder with `dist/assets/*.js` chunks — critically, the PGlite code should land in its **own** chunk, separate from the main entry chunk (dynamic `import()` triggers Vite's automatic code-splitting).

- [x] **Step 4: Write the bundle-size measurement script**

```js
// spikes/monaco-worker-lang/measure-bundle.mjs
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const distAssetsDir = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(distAssetsDir);

let totalRaw = 0;
let totalGzip = 0;

console.log('\n=== Spike C: bundle size ===\n');
for (const file of files) {
  const filePath = join(distAssetsDir, file);
  const raw = statSync(filePath).size;
  const gzip = gzipSync(readFileSync(filePath)).length;
  totalRaw += raw;
  totalGzip += gzip;
  console.log(`${file}: ${(raw / 1024).toFixed(1)} KB raw / ${(gzip / 1024).toFixed(1)} KB gzip`);
}

console.log(
  `\nTotal: ${(totalRaw / 1024).toFixed(1)} KB raw / ${(totalGzip / 1024).toFixed(1)} KB gzip`,
);
```

Add to `spikes/monaco-worker-lang/package.json` scripts: `"measure": "node measure-bundle.mjs"`.

- [x] **Step 5: Run the measurement and capture load time manually**

Run: `pnpm --filter spike-monaco-worker-lang measure`
Expected: a per-chunk breakdown and a total. **Copy the numbers into a scratch note.**

Then run: `pnpm --filter spike-monaco-worker-lang preview`, open the printed URL with DevTools open on the Network tab, throttle to "Fast 4G", hard-reload, and record the "Load" time shown in the Network panel's status bar — before clicking "Carregar Núcleo". Then click the button and record the console line's elapsed-ms for the PGlite lazy load.

- [x] **Step 6: Commit**

```powershell
git add spikes/monaco-worker-lang
git commit -m "spike: measure bundle size and lazy-load timing for Monaco + PGlite"
```

---

### Task 6: Architecture Decision Records

**Files:**

- Create: `docs/adr/0001-monorepo-pnpm-turborepo.md`
- Create: `docs/adr/0002-bytecode-vm-over-tree-walking-interpreter.md`
- Create: `docs/adr/0003-pglite-as-the-client-side-nucleo.md`

**Interfaces:**

- Consumes: the real console output captured in Tasks 3 and 5.
- Produces: the three ADRs §6.1 and §6.3 of the plan doc call out as Fase 0 deliverables — these get linked directly from the README in Fase 2 (§6.12).

- [x] **Step 1: Write ADR-0001**

```markdown
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
```

- [x] **Step 2: Write ADR-0002**

```markdown
# ADR-0002: Bytecode + stack VM over a tree-walking interpreter for Pyra

## Status

Accepted

## Context

Pyra (the game's programming language) needs to: pause execution between
individual instructions to measure exact tick cost, serialize execution
state mid-program (so a save can happen while a `while` loop is running),
and support step-through debugging with a time-travel scrubber (§1.3,
§6.5). A tree-walking interpreter ties execution state to the host
language's own call stack, which makes pausing and serializing mid-call
substantially harder — you'd have to either reify the whole call stack
yourself (at which point you've mostly built a bytecode VM anyway) or give
up on the debugger/save-mid-execution features.

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
```

- [x] **Step 3: Write ADR-0003, filling in the real Spike A result from Task 3**

If all four Spike A checks passed, use this version:

```markdown
# ADR-0003: PGlite as the client-side Núcleo

## Status

Accepted

## Context

The game's core differentiator is that the world state _is_ a real
PostgreSQL database the player queries with real SQL, including CTEs,
window functions, triggers/PL-pgSQL, and query-cost-driven mechanics via
`EXPLAIN`. This only works if PGlite (Postgres compiled to WASM) actually
supports all of that inside a browser tab.

## Decision

Adopt PGlite as the client-side "Núcleo", loaded lazily (only once the
player unlocks it in-game, not on first paint — validated in Spike C).

## Evidence

Spike A (`spikes/pglite-validation`), run on <DATE>:

<PASTE THE FOUR PASS/FAIL LINES AND "Overall result: PASS" FROM TASK 3
STEP 3's ACTUAL CONSOLE OUTPUT HERE, VERBATIM>

## Consequences

- The game's SQL never leaves the browser — no server-side attack surface
  for player-submitted SQL (security pillar, §6.10).
- Query cost mechanics (ticks from `EXPLAIN (FORMAT JSON)` → `Total Cost`)
  are feasible as designed in §6.3.
- The server-side database (accounts/saves/ranking, from Fase 5 onward)
  stays entirely separate from the game's Núcleo — never the same
  instance.
```

If any Spike A check failed, use this version instead:

```markdown
# ADR-0003: PGlite as the client-side Núcleo — REJECTED, falling back to server-side Postgres

## Status

Accepted (fallback path)

## Context

Same as above. Spike A (`spikes/pglite-validation`), run on <DATE>,
showed at least one required capability unsupported:

<PASTE THE ACTUAL PASS/FAIL OUTPUT HERE, VERBATIM, INCLUDING THE ERROR
DETAIL ON THE FAILING LINE(S)>

## Decision

Fall back to Plan B from the project plan (§10): a real PostgreSQL
instance on the server, with one session/connection per active player,
instead of PGlite in the browser.

## Consequences

- The architecture diagram in §5 changes: the "Núcleo" moves from the
  client Web Worker to the backend, meaning Fase 5 (backend) effectively
  has to start much earlier than planned — before Fase 3, not after
  Fase 4.
- Player SQL now reaches a real server process. The security sandboxing
  in §6.10 (restricted role, `statement_timeout`, blocked DDL/`COPY`) is
  no longer optional hardening — it's required from day one of the
  Núcleo, not deferred.
- Higher latency per query than an in-browser WASM database; the
  tick-cost-from-`EXPLAIN` mechanic still works, but round-trip network
  latency has to be accounted for separately from query cost, or the two
  will be perceptually conflated by the player.
- **This is a scope-changing result.** Stop here and re-plan Fases 3–5
  before continuing — do not proceed to Task 7 on the assumption nothing
  changed.
```

- [x] **Step 4: Commit**

```powershell
git add docs/adr
git commit -m "docs: add ADR-0001, ADR-0002, ADR-0003"
```

---

### Task 7: `packages/lang` skeleton — lexer + tests

**Files:**

- Create: `packages/lang/package.json`
- Create: `packages/lang/tsconfig.json`
- Create: `packages/lang/src/lexer.ts`
- Create: `packages/lang/src/lexer.test.ts`
- Create: `docs/grammar.ebnf`

**Interfaces:**

- Consumes: `tsconfig.base.json` (Task 1).
- Produces: `TokenType`, `Token`, `Lexer`, `LexError` — Fase 1's parser task consumes exactly these names and shapes. **Do not rename `tokenize()` or the `Token` field names in Fase 1 without updating this file** — this is the skeleton Fase 1 extends, not a throwaway.

> Scope note: this lexer does **not** yet implement `INDENT`/`DEDENT` tracking — that's Fase 1 work per the plan doc (§6.2, "decidido na Fase 1"), because it interacts with the parser's block structure. This skeleton tokenizes flat single-line constructs: identifiers, keywords, numbers, strings, operators, punctuation, comments.

- [x] **Step 1: Create the package**

```json
{
  "name": "@colonia-zero/lang",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

```json
// packages/lang/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [x] **Step 2: Write the lexer**

```ts
// packages/lang/src/lexer.ts
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

const KEYWORDS = new Set(['se', 'senao', 'enquanto', 'funcao', 'retorna', 'verdadeiro', 'falso']);
const TWO_CHAR_OPERATORS = ['==', '!=', '<=', '>='];
const ONE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '=', '<', '>']);
const PUNCTUATION = new Set(['(', ')', ',', ':']);

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
        tokens.push({
          type: KEYWORDS.has(value) ? TokenType.Keyword : TokenType.Identifier,
          value,
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
```

- [x] **Step 3: Write 20 tests**

```ts
// packages/lang/src/lexer.test.ts
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
```

- [x] **Step 4: Run the tests**

Run: `pnpm --filter @colonia-zero/lang test`
Expected: `20 passed` (20 `it(...)` blocks above).

- [x] **Step 5: Document the lexical grammar as-built**

```ebnf
(* docs/grammar.ebnf — lexical grammar only, matches packages/lang/src/lexer.ts.
   Syntactic grammar (statements, blocks, INDENT/DEDENT) is Fase 1 scope. *)

keyword        = "se" | "senao" | "enquanto" | "funcao" | "retorna"
               | "verdadeiro" | "falso" ;
identifier     = letter , { letter | digit | "_" } ;
number         = digit , { digit } ;
string         = '"' , { any character - '"' - newline } , '"' ;
operator       = "==" | "!=" | "<=" | ">=" | "+" | "-" | "*" | "/" | "=" | "<" | ">" ;
punctuation    = "(" | ")" | "," | ":" ;
comment        = "#" , { any character - newline } ;
newline        = "\n" ;

letter         = "a".."z" | "A".."Z" | "_" ;
digit          = "0".."9" ;
```

- [x] **Step 6: Run the full repo check and commit**

Run: `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
Expected: all green, including the 20 lexer tests via Turborepo.

```powershell
git add packages/lang docs/grammar.ebnf
git commit -m "feat(lang): add lexer skeleton with 20 tests"
```

---

## Exit criteria for Fase 0

- [x] Spike A's real output is pasted into ADR-0003 (Task 6, Step 3) and the correct decision branch (adopt PGlite vs. fall back to server-side Postgres) is the one actually committed.
- [x] Spike B was verified manually in a browser per Task 4 Step 7, and the result (worked / what broke) is known.
- [x] Spike C's numbers are recorded (Task 5 Step 5).
- [x] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` is green at the repo root.
- [ ] If ADR-0003 landed on the fallback branch: **stop before starting the Fase 1 plan** and re-scope Fases 3–5 first — this is the one outcome in Fase 0 that changes the shape of the rest of the project.
