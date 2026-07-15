# AGENTS.md

## Project

`@adistack/forms` — schema-driven React form library. Pass a schema + adapter, get auto-rendered form fields via `react-hook-form`. Uses a `createFormSystem()` factory pattern: callers bring their own `SchemaAdapter` and `FieldComponentMap`.

## Repo Structure

**Bun workspace.** Root `package.json` declares `workspaces: ["./package", "./examples"]`. The actual library lives in `package/` — that's where `src/`, `tsconfig.json`, and the library `package.json` are.

```
package/           ← library source and tests (the thing that gets published)
examples/          ← Bun+React demo app using TanStack Router (workspace member)
docs/              ← architecture docs (CONTEXT.md, GLOSSARY.md, TODO.md, adr/)
```

Root-level commands (lint, typecheck, deps) operate across the whole workspace.

## Runtime & Toolchain

- **Bun** is the package manager and runtime (not Node). Use `bun` for install/run/script commands.
- **Biome** for linting and formatting (not ESLint/Prettier). Config in root `biome.json`.
  - Linter domains set to `"all"`: `react`, `tailwind`, `types` — enables every rule in those domains.
  - `useSortedClasses` (nursery) enforces Tailwind class order — write sorted or let Biome fix.
  - Import sorting with custom groups (Bun/Node, packages, alias `@/*`, relative paths).
  - Linting is disabled for `examples/src/components/ui/**` (shadcn-style generated components).
- **TypeScript** strict with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`. Path alias: `@/*` → `./src/*`. Root tsconfig uses `composite: true` with project references (`package/`, `examples/`) — `package/tsconfig.json` extends it.
- **Vitest** for tests (not Jest). No vitest.config — environment is set per-file via `@vitest-environment` doc pragmas (component tests use `jsdom`).
- No build step — library is consumed as source TypeScript.
- `"type": "module"` — all `.ts` files are ESM.

## Commands

```
bun run check:lint    # biome check --fix .
bun run check:types   # tsc -b (build mode — needed for composite project references)
bun test              # run all tests
bun test package/src/adapters/zod/build-field-map.test.ts  # run a single test file
bun run update:deps   # taze -rw --maturity-period 3 && bun install
```

Run `check:lint` then `check:types` after changes. CI is commented out (`ci.yml`); Husky hooks are the local enforcement. The `pre-commit` hook runs `bun biome format --fix .` (formatting only — `check:lint` also lints). The active `publish.yml` runs on push to `beta`/`stable` branches — it versions via changesets, publishes to npm, and creates GitHub releases.

## Testing

- Tests are **colocated** next to source (`*.test.tsx`, `*.test.ts`). The `package/tests/` directory is empty — don't put tests there.
- Component tests require `// @vitest-environment jsdom` as the first line.
- Test files have relaxed Biome rules: `noNonNullAssertion` and `noUnnecessaryConditions` are off (see `biome.json` overrides).

## Git Conventions

- **Commit messages** must follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by `commitlint` via Husky `commit-msg` hook. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `wip`.
- **Husky** `pre-commit` hook runs `bun biome format --fix .`.

## Architecture

Two entrypoints declared in `package/package.json` exports:

- `@adistack/forms` → `package/src/core/index.ts` — exports `createFormSystem`, `resolveFieldDef` (from `./field-map`), `SmartFieldArray` (from `@/ui/`), and types. `SmartField` is **not** a direct import — it's returned by `createFormSystem()`. `useForm`/`useFormContext` are also factory-returned (the `createUseForm`/`createUseFormContext` factories in `core/` are internal).
- `@adistack/forms/adapters/zod` → `package/src/adapters/zod/index.ts` — Zod v4 adapter: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver`. (`deriveDefault` is a private helper in `build-defaults.ts`, not exported.)

`package/src/ui/` contains `SmartField` and `SmartFieldArray` — they live separately from `package/src/core/` but `SmartFieldArray` is re-exported through the core entrypoint. `SmartField` is created by `createSmartField()` inside `createFormSystem()`.

### Core flow

1. `createFormSystem({ fieldComponents, schemaResolver })` wires everything together — creates a React context, returns `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`.
2. `createUseForm(adapter)` returns a `useForm` hook that builds `SchemaTree`, defaults, and resolver from the schema via the adapter, then delegates to `react-hook-form`.
3. `<Form>` wraps `FormProvider` + the context that provides `fieldMap` to nested fields.
4. `<SmartField>` reads `SchemaTree` from context, dispatches to the caller-provided `FieldComponentMap`.

### Zod adapter internals

- `build-field-map.ts` — introspects Zod v4 schemas via `schema._zod.def` (private/fragile API). If Zod's internal shape changes, this will break.
  - Optional unwrapping: recurses into `innerType` with `optional = true`, overlays `meta` from outer.
  - Union handling: picks the first non-literal option (e.g. `z.string().optional()` → union of `string | literal(undefined)`).
  - Unsupported types (`record`, `literal`, etc.) throw an error.
  - `required` is derived as `!optional` — a field is "required" when it cannot be omitted (i.e., not optional).
- `build-defaults.ts` — derives default values from the schema. `deriveDefault` is a private helper.
- `create-resolver.ts` — wraps `@hookform/resolvers/zod`.
- `@hookform/resolvers` and `zod` are **optional peer dependencies** — consumers who don't use the Zod adapter don't need them. `react-hook-form` (≥7.80) is a **required** peer.

## Versioning & Publishing

- **Changesets** for version management. `examples/` is ignored (see `.changeset/config.json`); only `package/` gets published. Changeset `baseBranch` is `main` — that's the working branch; releases are cut from `beta`/`stable`.
- `bunfig.toml` sets `ignore-scripts=true` (lifecycle scripts skipped on install) and `minimumReleaseAge` of 3 days.
- Publish branches: `beta` (prerelease) and `stable` (latest). `publish.yml` enters/exits changeset prerelease mode automatically and creates GitHub releases.

## Gotchas

- `docs/CONTEXT.md` matches actual code (see ADR 0001 in `docs/adr/`). The `fieldMap` naming collision (`FieldComponentMap` option vs `SchemaTree` context value) is documented in CONTEXT.md's Design Tradeoffs section.
- Cast chain across core: `use-form.ts` casts the RHF return `as unknown as UseFormReturn` and casts the resolver `as Resolver<TValues>`; `form.tsx` casts `onSubmit`/`onInvalid` `as never` and spreads `form as unknown as UseFormReturn` into `FormProvider`; `use-form-context.ts` casts `rhf as object`. The adapter's `createResolver` returns `Resolver` (not `Resolver<any>`) and keeps the `schema as never` cast inside. Root cause is `SchemaAdapter<TSchema = unknown>` in `types.ts` — the `unknown` default loses type info at the adapter boundary.
