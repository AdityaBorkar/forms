# AGENTS.md

## Project

`@adistack/forms` — schema-driven React forms via `react-hook-form`. Factory `createFormSystem({ fieldComponents, schemaResolver })` — caller supplies `SchemaAdapter` + `FieldComponentMap`.

## Structure

Bun workspace. Root `package.json` → `workspaces: ["./package","./examples"]`. Library is `package/` (`src/`, `tsconfig.json`, library `package.json`); `examples/` is Bun+TanStack Router demo. `docs/` → `CONTEXT.md`, `GLOSSARY.md`, `TODO.md`, `adr/`. Root scripts cover workspace.

## Commands

```
bun run check:lint   # biome check --fix .
bun run check:types  # tsc -b (composite project references)
bun test             # all tests (vitest)
bun test package/src/adapters/zod/build-field-map.test.ts  # single file
bun run update:deps  # taze -rw --maturity-period 3 && bun install
```

Run `check:lint` → `check:types` after changes. `ci.yml` is commented out; `publish.yml` is active (push to `beta`/`stable` → lint+types, changesets versioning, `npm publish`, GitHub release). Husky `pre-commit` only runs `bun biome format --fix .` (format, not lint).

## Toolchain

- **Bun** only — use `bun` for install/run (not `npm`/`node`).
- **Biome** (not ESLint/Prettier): `biome.json` domains `react`/`tailwind`/`types` = `all`, nursery `useSortedClasses` enforces Tailwind order (`clsx`/`cva`/`tw`), import groups `Bun/Node → packages → @/* → relative`. Lint disabled for `examples/src/components/ui/**` (generated shadcn).
- **TypeScript** strict `verbatimModuleSyntax` + `noUncheckedIndexedAccess`, `composite:true` with refs `package/`+`examples/`, alias `@/*` → `./src/*` (relative to `package/`). Package overrides `lib: [ES2022,DOM]` and `types: [react]`.
- **Vitest** (not Jest): `vitest.config.ts` defaults `environment: "node"` + `vite-tsconfig-paths`. Component tests must set `// @vitest-environment jsdom` as first line.
- No build — consumed as source TS, ESM only (`"type":"module"`).
- `bunfig.toml`: `ignore-scripts=true`, `minimumReleaseAge=259200` (3d), `saveTextLockfile=false`.

## Architecture

3 exports in `package/package.json`:

- `@adistack/forms` → `package/src/index.ts`: `createFormSystem`, `resolveFieldDef`, `SmartFieldArray`, types. `SmartField`/`useForm`/`useFormContext` are **factory-returned** (not direct imports); `core/createUseForm` + `core/createUseFormContext` are internal.
- `@adistack/forms/adapters/zod` → `package/src/adapters/zod/index.ts`: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver`.
- `@adistack/forms/ui` → `package/src/ui/index.ts`: re-exports `SmartFieldArray` + prop types.

Flow: `createFormSystem` creates context + validates inputs → `useForm({ schema })` calls adapter for `SchemaTree`+defaults+resolver, delegates to `react-hook-form` (`validationMode` defaults `onBlur`, `reValidateMode: onChange`) → `<Form form={form}>` wraps `FormProvider` + context `{ fieldMap }` → `<SmartField name="address.city">` reads context, `resolveFieldDef` walks `elementFields` (skips numeric segments), dispatches `fieldComponents[def.kind]` via `register`+`getFieldState`.

Zod adapter: introspects `schema._zod.def` (private/fragile — breaks if Zod internals change). `optional` recurses `innerType` with `optional=true` overlaying outer `meta`; `union` picks first non-`literal`; `record`/`literal`/unknown throws; `required = !optional`. `build-defaults.ts` derives defaults (private `deriveDefault` not exported). `zod@>=4` + `@hookform/resolvers@>=5` are optional peers (`peerDependenciesMeta`); `react@>=18` + `react-hook-form@^7.80` required.

## Testing

- Colocated `*.test.ts`/`*.test.tsx` next to source — never create `package/tests/`.
- `biome.json` overrides relax `noNonNullAssertion` + `noUnnecessaryConditions` in `**/*.test.*`.

## Git & Release

- Conventional Commits enforced by `commitlint` via Husky `commit-msg` (`bunx commitlint --edit $1`). Types: `build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|wip`.
- Changesets: `baseBranch: main`, `ignore: ["examples","www"]`, only `package/` published. `beta` branch enters prerelease mode, `stable` exits it; both auto-bump `CHANGELOG.md` + `git push` + `npm publish` (`beta` tag vs `latest`).
