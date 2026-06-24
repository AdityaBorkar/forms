# AGENTS.md

## Project

`@adityab/forms` — schema-driven React form library. Pass a schema + adapter, get auto-rendered form fields via `react-hook-form`. Uses a `createFormFormat()` factory pattern: callers bring their own `SchemaAdapter` and `FieldComponentMap`.

## Repo Structure

**Bun workspace.** Root `package.json` declares `workspaces: ["./examples", "./www"]`. The actual library lives in `package/` — that's where `src/`, `tsconfig.json`, and the library `package.json` are.

```
package/           ← library source and tests (the thing that gets published)
examples/          ← Bun+React demo app (workspace member)
www/               ← Bun+React site app (workspace member)
docs/              ← architecture docs (CONTEXT.md, GLOSSARY.md, TODO.md)
```

Root-level commands (lint, typecheck, deps) operate across the whole workspace.

## Runtime & Toolchain

- **Bun** is the package manager and runtime (not Node). Use `bun` for install/run/script commands.
- **Biome** for linting and formatting (not ESLint/Prettier). Config in root `biome.jsonc`.
  - Linter domains set to `"all"`: `react`, `tailwind`, `types` — enables every rule in those domains.
  - `useSortedClasses` (nursery) enforces Tailwind class order — write sorted or let Biome fix.
  - Import sorting with custom groups (Bun/Node, packages, alias `@/*`, relative paths).
- **TypeScript** strict with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `allowImportingTsExtensions`. Path alias: `@/*` → `./src/*`. `noUnusedLocals` and `noUnusedParameters` are explicitly off. Config at `package/tsconfig.json`.
- **Vitest** for tests (not Jest). No vitest.config — environment is set per-file via `@vitest-environment` doc pragmas (component tests use `jsdom`).
- No build step — library is consumed as source TypeScript.
- `"type": "module"` — all `.ts` files are ESM.

## Commands

```
bun run check:lint    # biome check --fix .
bun run check:types   # tsc --noEmit
bun test              # run all tests
bun test package/src/adapters/zod/build-field-map.test.ts  # run a single test file
bun run update:deps   # taze -rw --maturity-period 3 && bun install
```

Run `check:lint` then `check:types` after changes. No CI workflows exist yet — the Husky hooks are the only enforcement.

## Testing

- Tests are **colocated** next to source (`*.test.tsx`, `*.test.ts`). The `package/tests/` directory is empty — don't put tests there.
- Component tests require `// @vitest-environment jsdom` as the first line.
- Test files have relaxed Biome rules: `noNonNullAssertion` and `noUnnecessaryConditions` are off (see `biome.jsonc` overrides).

## Git Conventions

- **Commit messages** must follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by `commitlint` via Husky `commit-msg` hook. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `wip`.
- **Husky** `pre-commit` hook runs `bun biome check --fix .`.

## Architecture

Two entrypoints declared in `package/package.json` exports:

- `@adityab/forms/core` → `package/src/core/index.ts` — framework-agnostic core: `createFormFormat`, types, `useForm`/`useFormContext` factories. Re-exports `SmartField`/`SmartFieldArray` from `package/src/ui/`.
- `@adityab/forms/adapters/zod` → `package/src/adapters/zod/index.ts` — Zod v4 adapter: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver`.

`package/src/ui/` contains `SmartField` and `SmartFieldArray` — they live separately from `package/src/core/` but are re-exported through the core entrypoint.

### Core flow

1. `createFormFormat({ fieldMap, schemaResolver })` wires everything together — creates a React context, returns `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`.
2. `createUseForm(adapter)` returns a `useForm` hook that builds `FieldMap`, defaults, and resolver from the schema via the adapter, then delegates to `react-hook-form`. Uses `resolver as never` cast to bridge resolver typing — be aware if editing resolver integration.
3. `<Form>` wraps `FormProvider` + the context that provides `fieldMap` to nested fields.
4. `<SmartField>` reads `FieldMap` from context, dispatches to the caller-provided `FieldComponentMap`.

### Zod adapter internals

- `build-field-map.ts` — introspects Zod v4 schemas via `schema._zod.def` (private/fragile API). If Zod's internal shape changes, this will break.
  - `meta.component` on a Zod field overrides the resolved `kind` — this is how callers force a field to render as e.g. `textarea` or `password` instead of the default `string`.
  - `required` is derived as `!optional && min != null` — a field is only "required" when it's non-optional AND has a min constraint.
- `build-defaults.ts` — derives default values from the schema.
- `create-resolver.ts` — wraps `@hookform/resolvers/zod`.
- `@hookform/resolvers` and `zod` are **optional peer dependencies** — consumers who don't use the Zod adapter don't need them.

## Gotchas

- `docs/CONTEXT.md` uses **planned** names (`createFormSystem`, `SchemaTree`, `FieldComponentProps`) that differ from the actual code (`createFormFormat`, `FieldMap`, `FieldRenderProps`). If you read CONTEXT.md, cross-reference with the actual source.
- Cast chain: `use-form.ts` uses `resolver as never`, `form.tsx` and `use-form-context.ts` also have `as unknown as` / `as object` casts. Root cause is `SchemaAdapter<TSchema = unknown>` — the `unknown` default loses type info at the boundary.
