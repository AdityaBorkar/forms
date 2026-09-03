# AGENTS.md

## Project

`@adistack/forms` — schema-driven React forms via `react-hook-form`. Factory `createFormSystem({ fieldComponents, schemaResolver })` — caller supplies `SchemaAdapter` + `FieldComponentMap`.

## Structure

Bun workspace. Root `package.json` → `workspaces: ["./package","./examples"]`. Library is `package/` (`src/`, `tsconfig.json`, library `package.json`); `examples/` is a Bun + Elysia 2 (beta) + React demo (no frontend router — state-switched pages in `src/examples/`, API + source serving in `src/server.ts`). `docs/` → `CONTEXT.md`, `GLOSSARY.md`, `USER-TODO.md`, `adr/` (`TODO.md` was renamed to `USER-TODO.md`). `www/` exists but is empty. `.github/workflows/` is empty — no CI/publish workflows committed.

## Commands

```
bun run check:lint   # biome check --fix .
bun run check:types  # tsc -b (composite project references)
bun run format       # biome format --fix .
bunx vitest run      # all tests (vitest; no `test` script in root package.json)
bunx vitest run package/src/adapters/zod/build-field-map.test.ts  # single file
bun run update:deps  # bun taze -rw --maturity-period 3 && bun install
```

Run `check:lint` → `check:types` after changes. No workflows committed (`.github/workflows/` empty). Husky `pre-commit` runs `bun format` (format only, not lint).

## Toolchain

- **Bun** only — use `bun` for install/run (not `npm`/`node`).
- **Biome** (not ESLint/Prettier): `biome.json` domains `react`/`tailwind`/`types` = `all`, nursery `useSortedClasses` enforces Tailwind order (`clsx`/`cva`/`tw`), import groups `Bun/Node → packages → @/* → relative`. Lint disabled for `examples/src/components/ui/**` (generated shadcn).
- **TypeScript** strict `verbatimModuleSyntax` + `noUncheckedIndexedAccess`, `composite:true` with refs `package/`+`examples/`, alias `@/*` → `./src/*` in both `package/tsconfig.json` and `examples/tsconfig.json`. Package overrides `lib: [ES2022,DOM,DOM.Iterable]` and `types: [react]` (root uses `types: [bun]`).
- **Vitest** (not Jest): `vitest.config.ts` defaults `environment: "node"` + `vite-tsconfig-paths`. Component tests must set `// @vitest-environment jsdom` as first line.
- No build — consumed as source TS, ESM only (`"type":"module"`).
- `bunfig.toml`: `ignore-scripts=true`, `minimumReleaseAge=259200` (3d), `saveTextLockfile=false`.

## Architecture

3 exports in `package/package.json`:

- `@adistack/forms` → `package/src/index.ts`: `createFormSystem`, `resolveFieldDef`, `SmartFieldArray`, types. `SmartField`/`useForm`/`useFormContext` are **factory-returned** (not direct imports); `core/use-form.ts` (`createUseForm`) + `core/use-form-context.ts` (`createUseFormContext`) are internal factories.
- `@adistack/forms/adapters/zod` → `package/src/adapters/zod/index.ts`: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver`.
- `@adistack/forms/ui` → `package/src/ui/index.ts`: re-exports `SmartFieldArray` + prop types.

Flow: `createFormSystem` creates context + validates inputs → `useForm({ schema })` calls adapter for `SchemaTree`+defaults+resolver, delegates to `react-hook-form` (`validationMode` option defaults `onBlur`, `reValidateMode: onChange`) → `<Form form={form}>` wraps `FormProvider` + context `{ fieldMap }` → `<SmartField name="address.city">` reads context, `resolveFieldDef` walks `elementFields` (skips empty + numeric segments), dispatches `fieldComponents[def.kind]` via `register(name)` + `getFieldState(name, formState)` (no `<Controller>`; `onChange`/`onBlur` adapt to `{ target: { name, value }, type }` events). No `meta.component` kind override exists.

Zod adapter: introspects `schema._zod.def` (private/fragile — breaks if Zod internals change). `SUPPORTED_TYPES` = `string|number|boolean|enum|array|object|date`. `optional` recurses `innerType` with `optional=true` overlaying outer `meta`; `union` picks first non-`literal`; `record`/`literal`/unknown throws; `required = !optional`. `buildFieldMap(schema, parentPath?)` returns `{}` for non-object/undefined. `build-defaults.ts` derives defaults (private `deriveDefault` not exported): `string|email|url|password|textarea|combobox` → `""`, `number` → `0`, `boolean|checkbox` → `false`, `enum` → first entry, `array` → `[]`, `object` → recursive, `date|unknown|optional` → `undefined`. `zod@>=4` + `@hookform/resolvers@>=5` are optional peers (`peerDependenciesMeta`); `react@>=18` + `react-hook-form@^7.86.0` required.

## Testing

- Colocated `*.test.ts`/`*.test.tsx` next to source — never create `package/tests/`.
- `biome.json` overrides relax `noNonNullAssertion` + `noUnnecessaryConditions` in `**/*.test.*`.

## Git & Release

- Conventional Commits enforced by `commitlint` via Husky `commit-msg` (`bunx commitlint --edit $1`). Types: `build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|wip`.
- Changesets: `baseBranch: main`, `ignore: ["examples","www"]`, only `package/` published (`examples` is `private`). No release workflows committed yet.
