# AGENTS.md

## Project

`@adityab/forms` — schema-driven React form library. Pass a Zod schema, get auto-rendered form fields via `react-hook-form`.

## Runtime & Toolchain

- **Bun** is the package manager and runtime (not Node). Use `bun` for install/run/script commands.
- **Biome** for linting and formatting (not ESLint/Prettier). Config in `biome.jsonc` (currently empty body, uses Biome defaults).
- **TypeScript** with `strict: true`, `verbatimModuleSyntax`, `noEmit: true`, `allowImportingTsExtensions`.
- No build step — library is consumed as source TypeScript. Entry: `src/index.ts` (`"module"` field).

## Commands

```
bun run check:lint    # biome check --fix .
bun run check:types   # tsc --noEmit
bun run update:deps   # taze -w --maturity-period 3 && bun install
```

Run `check:lint` then `check:types` after changes. No test runner is configured yet (`tests/` is empty).

## Architecture

- `src/hooks/use-form.ts` — Zod schema introspection. Builds `FieldMap` from Zod v4 internals (`_zod.def`). This is private/fragile API; changes to Zod's internal shape may break things.
- `src/components/form.tsx` — `<Form>` component. Wraps `react-hook-form` with `zodResolver`.
- `src/components/field.tsx` — `<Field>` component. Reads `FieldMap` from context, dispatches to type-specific sub-fields.
- `src/context.ts` — React context providing `fieldMap` and `formId` to nested fields.
- `src/components/` — Type-specific field components (string, number, boolean, enum, combobox, field-array).

## Known Issues

- `@hookform/resolvers` is imported in `form.tsx` but not listed in `package.json` dependencies. It must be installed or added as a dependency.
- `biome.jsonc` has an empty body — all behavior is Biome defaults.
