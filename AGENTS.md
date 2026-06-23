# AGENTS.md

## Project

`@adityab/forms` — schema-driven React form library. Pass a schema + adapter, get auto-rendered form fields via `react-hook-form`. Uses a `createFormFormat()` factory pattern: callers bring their own `SchemaAdapter` and `FieldComponentMap`.

## Runtime & Toolchain

- **Bun** is the package manager and runtime (not Node). Use `bun` for install/run/script commands.
- **Biome** for linting and formatting (not ESLint/Prettier). Config in `biome.jsonc` — has substantial rules including import sorting, sorted Tailwind classes, and an a11y override for components.
- **TypeScript** strict with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `allowImportingTsExtensions`. Path alias: `@/*` → `./src/*`. Note: `noUnusedLocals` and `noUnusedParameters` are explicitly off.
- **Vitest** for tests (not Jest). No vitest.config — environment is set per-file via `@vitest-environment` doc pragmas (component tests use `jsdom`).
- No build step — library is consumed as source TypeScript.

## Commands

```
bun run check:lint    # biome check --fix .
bun run check:types   # tsc --noEmit
bun test              # run all tests
bun test src/adapters/zod/build-field-map.test.ts  # run a single test file
bun run update:deps   # taze -w --maturity-period 3 && bun install
```

Run `check:lint` then `check:types` after changes. CI enforces the same order.

## Testing

- Tests are **colocated** next to source (`*.test.tsx`, `*.test.ts`). The `tests/` directory at root is unused/empty — don't put tests there.
- Component tests require `// @vitest-environment jsdom` as the first line.
- Test files have relaxed Biome rules: `noNonNullAssertion` and `noUnnecessaryConditions` are off (see `biome.jsonc` overrides).

## Git Conventions

- **Commit messages** must follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by `commitlint` via Husky `commit-msg` hook. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `wip`.
- **Husky** `pre-commit` hook runs `bun biome check --fix .`.
- **Branches**: CI runs on `dev`. Publishing: push to `beta` → `npm publish --tag beta`, push to `stable` → `npm publish --tag latest`.

## Architecture

Two entrypoints declared in `package.json` exports:

- `@adityab/forms/core` → `src/core/index.ts` — framework-agnostic core: `createFormFormat`, `SmartField`, `SmartFieldArray`, types, `useForm`/`useFormContext` factories.
- `@adityab/forms/adapters/zod` → `src/adapters/zod/index.ts` — Zod v4 adapter: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver`.

### Core flow

1. `createFormFormat({ fieldMap, schemaResolver })` wires everything together — creates a React context, returns `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`.
2. `createUseForm(adapter)` returns a `useForm` hook that builds `FieldMap`, defaults, and resolver from the schema via the adapter, then delegates to `react-hook-form`.
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

- The Zod adapter relies on `_zod.def` internals, not Zod's public API. Treat it as fragile.
- `biome.jsonc` enables `useSortedClasses` (Tailwind class sorting) — write Tailwind classes in sorted order or let Biome fix them.
- `src/components/**` has `noLabelWithoutControl` disabled in Biome (a11y override), but that directory doesn't exist yet — the override is forward-looking.
- `package.json` declares `"type": "module"` — all `.ts` files are ESM.
