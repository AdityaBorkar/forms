# AGENTS.md

## Project

`@adistack/forms` — schema-driven React forms on `react-hook-form`. Factory `createFormSystem({ fieldComponents, schemaResolver, onMissingField? })`; caller supplies `SchemaAdapter` + `FieldComponentMap`.

Bun workspace: `package/` is the library (`src/`, no build — ESM source TS), `examples/` is the demo (`Bun.serve` in `server.ts`, port 4000), `www/` is Fumadocs mdx (changes trigger a docs-repo refresh via `release.yml`).

## Commands

```
bun run check:lint   # root: biome check . (read-only)
bun run check:types  # root: tsc -b (composite: package/ + examples/)
bun run fix:format   # biome format --fix . (pre-commit runs this)
bun run fix:lint     # biome check --fix . (mutates)
cd package && bunx vitest run                                    # all tests
cd package && bunx vitest run src/adapters/zod/create-field-map.test.ts  # single file
cd examples && bun run dev  # demo: bun --hot server.ts
```

Run `check:lint` → `check:types` after changes. Do not confuse with `package/` scripts of the same name: there `check:lint` is `biome check --fix .` (mutates) and `check:types` is `tsc --noEmit`. Vitest must run from `package/` — `#/*` resolves via `package/vitest.config.ts` (`vite-tsconfig-paths`); running from root breaks it. `bunx --cwd package …` does not work; `cd` first.

## Toolchain

- **Bun** only. `bunfig.toml`: `ignore-scripts=true`, `minimumReleaseAge=259200` (3d).
- **Biome**, not ESLint/Prettier. `**/*.test.*` relax `noNonNullAssertion` + `noUnnecessaryConditions`.
- **TypeScript** strict + `verbatimModuleSyntax` + `noUncheckedIndexedAccess`; `#/*` → `./src/*` in both `package/` and `examples/` (different bases).
- **Vitest**, not Jest; default env is `node` — component tests need `// @vitest-environment jsdom` as first line.

## Architecture

4 exports in `package/package.json`: `@adistack/forms` → `src/index.ts`, `.../adapters/zod`, `.../adapters/valibot`, `.../ui` (types only).

- `SmartField` / `useForm` / `useFormContext` / `SmartFieldArray` are **factory-returned**, not direct imports. `SmartFieldArray` requires `<Form>` context.
- Flow: `useForm({ schema })` → `createFieldMap` + `createResolver` (WeakMap-cached per schema object; `defaultValues` pass straight to RHF) → `<Form form>` (`FormProvider` + `{ fieldMap }` context) → `<SmartField name="a.b">` → `resolveFieldDef` → `fieldComponents[def.kind]` via `useController`. `validationMode` defaults `onBlur`, `reValidateMode` defaults `onChange` (type-checked only, no runtime check). `TValues` infers via Standard Schema `~standard.types.output`.
- `resolveFieldDef` (`core/resolve-field-def.ts`): arrays need an explicit index (`tasks.0.title`; bare `tasks.title` throws); empty names/segments throw; numeric keys on non-arrays look up literally.
- No stored `required` — `FieldDef.optional` is the source of truth (`!optional` = required). No auto-defaults — field components must handle `undefined`; array rows use explicit `append(value)`.
- Missing def/component policy is `onMissingField` (default `"throw"`): dev throws, prod always `devWarn` + `null`; `"warn"` opts into `devWarn` + `null` in dev too. Peers: `react@>=18` + `react-hook-form@^7.86.0` required; `zod@>=4`, `valibot@>=1`, `@hookform/resolvers@>=5` optional.
- Zod adapter walks private `schema._zod.def` (fragile). Both adapters: `union` keeps the single non-`literal` branch else throws; `record`/unknown throws; never emits `kind: "unknown"`.

## Testing

Colocated `*.test.ts(x)` next to source — never create `package/tests/`.

## Git & Release

Conventional Commits via Husky `commit-msg` (`build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|wip`). Changesets: only `package/` publishes (`ignore: ["examples","www"]`, `baseBranch: "main"`). PRs to `beta`/`latest` need a changeset unless docs-only (`www/`, `docs/`, `examples/`, `.github/`, `*.md`/`*.mdx`, `bun.lockb`); push to `beta` publishes `--tag beta` (enters prerelease mode), push to `latest` publishes `--tag latest`.

## Docs

`docs/GLOSSARY.md` is the API reference, `docs/CONTEXT.md` the vocabulary, `docs/ARCHITECTURE.md` the design. Dispatch is strictly by adapter base kind (`fieldComponents[def.kind]`); `meta` is passthrough only — trust `package/src` over prose if any stale override mention remains.
