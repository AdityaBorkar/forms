# AGENTS.md

## Project

`@adistack/forms` — schema-driven React forms via `react-hook-form`. Factory `createFormSystem({ fieldComponents, schemaResolver })`; caller supplies `SchemaAdapter` + `FieldComponentMap`.

Bun workspace: `package/` is the library (`src/`), `examples/` is the demo (`Bun.serve` in `server.ts`, port 4000). `www/` and `.github/workflows/` are empty — no CI.

## Commands

```
bun run check:lint   # biome check --fix . (mutates; run from root)
bun run check:types  # tsc -b (composite: package/ + examples/)
bun run format       # biome format --fix .
bunx --cwd package vitest run              # all tests (config lives in package/)
bunx --cwd package vitest run src/adapters/zod/build-field-map.test.ts  # single file
bun run --cwd examples dev    # demo: bun --hot server.ts
bun run update:deps  # bun taze -rw --maturity-period 3 && bun install
```

Run `check:lint` → `check:types` after changes. Pre-commit runs `bun format` (format only). Must run vitest with `--cwd package` — tests import via `#/*`, resolved by `package/vitest.config.ts` (`vite-tsconfig-paths`); running from root breaks resolution.

## Toolchain

- **Bun** only (`bun` for install/run). `bunfig.toml`: `ignore-scripts=true`, `minimumReleaseAge=259200` (3d).
- **Biome**, not ESLint/Prettier. Test files (`**/*.test.*`) relax `noNonNullAssertion` + `noUnnecessaryConditions`.
- **TypeScript** strict + `verbatimModuleSyntax` + `noUncheckedIndexedAccess`; alias `#/*` → `./src/*` in both `package/` and `examples/`.
- **Vitest**, not Jest; default env is `node` — component tests need `// @vitest-environment jsdom` as first line.
- No build — consumed as source TS, ESM only (`module`/`types` point at `src/index.ts`, `files: ["src"]`).

## Architecture

4 exports in `package/package.json`: `@adistack/forms` → `src/index.ts`, `.../adapters/zod`, `.../adapters/valibot`, `.../ui`.

- `SmartField` / `useForm` / `useFormContext` are **factory-returned**, not direct imports. Factory-bound `SmartFieldArray` (requires `<Form>` context) is canonical; a static unbound one is also exported from core + `ui`.
- Flow: `useForm({ schema })` → `buildFieldMap` + `createResolver` (plus your `defaultValues` straight to RHF) → `<Form form>` (`FormProvider` + `{ fieldMap }` context) → `<SmartField name="a.b">` → `resolveFieldDef` → `fieldComponents[def.kind]` via `useController`. `validationMode` defaults `onBlur`, `reValidateMode` defaults `onChange`.
- `meta.component` (non-empty string) replaces the dispatch kind **at adapter time** (`adapters/shared/field-def.ts`, outer `meta` wins) — `def.kind` already carries the override.
- `resolveFieldDef`: numeric segment into an `array` steps into `elementDef`; `arr.city` resolves via `elementFields` without an index (prefer `arr.0.city`); empty names/segments throw; numeric keys on non-arrays look up literally.
- No stored `required` — `FieldDef.optional` is the source of truth (`!optional` = required).
- No auto-defaults — `defaultValues` pass straight through to RHF (no `buildDefaults`/`deriveDefault`/`mergeDefaults`/`appendDefault`; array rows use explicit `append(value)`). Field components must handle `undefined`.
- Zod adapter walks private `schema._zod.def` (fragile). Both adapters: `union` keeps the single non-`literal` branch else throws; `record`/unknown throws; never emits `kind: "unknown"`. Valibot: `optional`/`nullish`/`exact_optional` force optional but `nullable` alone does not; `picklist`/`enum` → `enum` kind.
- Missing def/component renders `null` + deduped dev-only `devWarn` (`resetDevWarnings` is tests-only). Peers: `react@>=18` + `react-hook-form@^7.86.0` required; `zod@>=4`, `valibot@>=1`, `@hookform/resolvers@>=5` optional.

## Testing

Colocated `*.test.ts(x)` next to source — never create `package/tests/`.

## Git & Release

Conventional Commits via Husky `commit-msg` (`build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|wip`). Changesets: `baseBranch: main`, `ignore: ["examples","www"]`, only `package/` publishes.

## Docs

`docs/ARCHITECTURE.md` is the implementation reference (diagram, file map, adapter internals); `docs/GLOSSARY.md` is the API reference; `docs/CONTEXT.md` is glossary-only. Check `ARCHITECTURE.md` before inferring behavior from leaf files.
