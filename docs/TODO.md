# TODO

## Phase 1

- Smart Component Support
- Cast chain: 3 as never casts + 1 as unknown as + 1 as object across use-form.ts, form.tsx, use-form-context.ts. Root cause is SchemaAdapter<TSchema = unknown> — the unknown default loses type info at the boundary. A future tightening of the generic chain would eliminate most of these.

never, any, etc ts types

### Zod adapter internals

- `build-field-map.ts` — introspects Zod v4 schemas via `schema._zod.def` (private/fragile API). If Zod's internal shape changes, this will break.
  - Optional unwrapping: recurses into `innerType` with `optional = true`, overlays `meta` from outer.
  - Union handling: picks the first non-literal option (e.g. `z.string().optional()` → union of `string | literal(undefined)`).
  - `meta.component` on a Zod field overrides the resolved `kind` — this is how callers force a field to render as e.g. `textarea` or `password` instead of the default `string`.
  - `required` is derived as `!optional && min != null` — a field is only "required" when it's non-optional AND has a min constraint.
- `build-defaults.ts` — derives default values from the schema. Also exports `deriveDefault` (currently in adapter but is schema-agnostic — planned move to core).
- `create-resolver.ts` — wraps `@hookform/resolvers/zod`.
- `@hookform/resolvers` and `zod` are **optional peer dependencies** — consumers who don't use the Zod adapter don't need them.

- Review
  - thermo-nuclear
  - security-audit

- Publish to NPM
  - beta
  - latest

## Phase 2

- Write tests
  - E2E
  - Unit
- @abstack/conform
  - Write a README
  - GitHub Actions
  - GitHub Repository Settings
  - Auto-Publishing using Branches & PRs

## Naming & API backlog

Moved here from CONTEXT.md — the docs now describe actual code (see
[ADR 0001](./adr/0001-docs-describe-actual-code.md)). These are the aspirational
renames/fixes, each cross-referenced to the tradeoff it addresses in
[CONTEXT.md](./CONTEXT.md#design-tradeoffs):

- Rename `FieldMap` → `SchemaTree` (conveys tree structure) — [FieldMap tradeoff](./GLOSSARY.md#fieldmap)
- Rename `createFormFormat` → `createFormSystem` ("Format" is vague)
- Rename `FieldRenderProps` → `FieldComponentProps` (matches component contract)
- Resolve `fieldMap` name collision — `createFormFormat`'s option (`FieldComponentMap`) vs `FormContextValue.fieldMap` (`FieldMap`) — [fieldMap tradeoff](./CONTEXT.md#fieldmap-is-an-overloaded-name)
- Fix `required` semantics — should mean "cannot be omitted", not `!optional && min != null` — [required tradeoff](./CONTEXT.md#required-is-a-leaky-derivation)
- Decouple `meta.component` from `kind` — move UI override outside the schema — [kind tradeoff](./CONTEXT.md#kind-conflates-type-format-and-component-override)
- Move `deriveDefault` to core (schema-agnostic, currently in Zod adapter) — [deriveDefault tradeoff](./CONTEXT.md#derivedefault-lives-in-the-zod-adapter-but-is-schema-agnostic)
- `createResolver` should return a typed resolver from the adapter (move the `as never` cast inside the adapter) — [cast chain](./CONTEXT.md#the-cast-chain)
- `unknown` kind fallback should throw instead of silently rendering nothing — [silent null tradeoff](./CONTEXT.md#silent-null-on-missing-field-or-component)
- `resolveFieldDef` should return a result type, not `undefined`
- Rename array `FieldDef.fields` to convey "element fields", not "the array's fields"
- `SmartField` should distinguish "not found" from "no component" instead of silent `null`

## Features not supported / planned:

- Nested Forms
