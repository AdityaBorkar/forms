# Context

Architectural context for `@adistack/forms` — how the system works today, why
it's structured this way, and what tradeoffs it carries. Names and signatures in
this document match the actual source in `package/src/`. See
[ADR 0001](./adr/0001-docs-describe-actual-code.md) for why the docs were
rewritten to describe the code as-is.

---

## Purpose

`@adistack/forms` is a schema-driven React form library. You provide a
validation schema and a set of UI components, and the library auto-renders form
fields via `react-hook-form`. The core insight: **the schema knows what fields
exist, their types, and their constraints — the form should derive itself from
that knowledge.**

---

## Architecture Overview

```
                    ┌──────────────────────┐
                    │  createFormFormat()  │
                    │  (factory entry)    │
                    └─────────┬────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
          FieldComponentMap  SchemaAdapter<TSchema>
          (kind → component) (schema → FieldMap + defaults + resolver)
                 │            │
                 │     ┌──────┼──────┐
                 │     ▼      ▼      ▼
                 │   FieldMap  Defaults  Resolver
                 │  (metadata) (values)  (RHF)
                 │     │
                 ▼     ▼
              SmartField ──reads──▶ FieldMap
                 │                     (from React context)
                 ▼
              Controller (RHF)
                 │
                 ▼
              FieldComponentMap[kind]
                 │
                 ▼
              <Component {...FieldRenderProps} />
```

### Data flow

1. Consumer calls `createFormFormat({ fieldComponents, schemaResolver })` — gets
   `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`. The factory
   creates a React context once and closes over the `FieldComponentMap`.
2. Consumer calls `useForm({ schema, onSubmit, ... })` — the hook calls the
   adapter to produce a `FieldMap`, default values, and a resolver, then
   delegates to `useForm` from `react-hook-form`. Returns a `FormInstance`
   (RHF methods + `fieldMap` + `onSubmit`/`onInvalid`).
3. Consumer renders `<Form form={formInstance}>` — this wraps RHF's
   `FormProvider` and sets React context with `{ fieldMap: form.fieldMap }`.
4. Consumer renders `<SmartField name="address.city" />` — reads the `FieldMap`
   from context, resolves the field definition via `resolveFieldDef`, looks up
   the component in the `FieldComponentMap`, renders it inside an RHF
   `Controller`.

---

## Key Design Decisions

### 1. Factory pattern over provider pattern
- `build-field-map.ts` — introspects Zod v4 schemas via `schema._zod.def` (private/fragile API). If Zod's internal shape changes, this will break.
  - Optional unwrapping: recurses into `innerType` with `optional = true`, overlays `meta` from outer.
  - Union handling: picks the first non-literal option (e.g. `z.string().optional()` → union of `string | literal(undefined)`).
  - Unsupported types (`record`, `literal`, etc.) throw an error.
  - `required` is derived as `!optional && min != null` — a field is only "required" when it's non-optional AND has a min constraint.
- `build-defaults.ts` — derives default values from the schema. `deriveDefault` is a private helper.
- `create-resolver.ts` — wraps `@hookform/resolvers/zod`.
- `@hookform/resolvers` and `zod` are **optional peer dependencies** — consumers who don't use the Zod adapter don't need them.
- **Encapsulation** — `FieldComponentMap` is closed over, not floating in
  context.

The tradeoff: you can't swap components or adapters at runtime. This is
acceptable — form systems are typically configured once at module level.

### 2. SchemaAdapter as the integration boundary

The adapter is the **only** place that knows about a specific validation
library. Everything downstream operates on the adapter's normalized output
(`FieldMap`, defaults, resolver). This means:

- Adding a new validation library = writing a new adapter, not touching core.
- The core is validation-library-agnostic.
- The adapter's `buildFieldMap` is the most complex part — it walks schema
  internals (e.g., Zod's `_zod.def`), which is a private/fragile API.

### 3. Flat `kind` for component dispatch

The `kind` field on `FieldDef` is a single string that the adapter resolves from
schema type and format. This keeps the `FieldComponentMap` lookup trivial:
`fieldComponents[def.kind]`.

### 4. FieldMap as the single source of truth

Once the adapter produces the `FieldMap`, the rest of the system never touches
the raw schema again. The tree carries all metadata needed for rendering:

- Field existence and nesting → `fields` property
- Field type → `kind` property
- Validation constraints → `checks`, `min`, `max`
- User annotations → `meta`
- Required status → `required` (currently leaky — see
  [Design Tradeoffs](#design-tradeoffs))

### 5. SmartFieldArray is schema-agnostic

`SmartFieldArray` doesn't use the `FieldMap` or the adapter. It's a thin wrapper
over RHF's `useFieldArray`. This is correct — array operations (append, remove,
move) don't need schema knowledge. The consumer is responsible for rendering the
right `SmartField` components inside the array render function.

---

## Two Entrypoints

| Entrypoint | Path | Purpose |
|---|---|---|
| `@adistack/forms/core` | `src/core/index.ts` | Framework-agnostic core: `createFormFormat`, `SmartField`, `SmartFieldArray`, `resolveFieldDef`, types, `useForm`/`useFormContext` factories |
| `@adistack/forms/adapters/zod` | `src/adapters/zod/index.ts` | Zod v4 adapter: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `deriveDefault`, `createResolver` |

`@hookform/resolvers` and `zod` are **optional peer dependencies** — consumers
who don't use the Zod adapter don't need them. `react-hook-form` and `react` are
required peers.

---

## Instance types

`useForm` and `useFormContext` return different (but related) shapes:

- **`FormInstance<TValues>`** — what `useForm` returns. `UseFormReturn<TValues>`
  & `{ fieldMap }` & `{ onSubmit, onInvalid? }`. Carries the submit handlers
  because only the form author wires those.
- **`FormContextInstance<TValues>`** — what `useFormContext` returns.
  `UseFormReturn<TValues>` & `{ fieldMap }`. No submit handlers — deep field
  components shouldn't trigger submit.

`FormInstance` extends `FormContextInstance` with the submit callbacks. `<Form>`
accepts a `FormInstance`; everything inside reads via `useFormContext` as a
`FormContextInstance`.

---

## Constraints & Dependencies

### External

| Dependency | Role | Required? |
|---|---|---|
| `react-hook-form` | Form state management, validation, field registration | Yes (peer) |
| `@hookform/resolvers` | Schema resolver bridge | Only with Zod adapter |
| `zod` | Schema definition & validation | Only with Zod adapter |
| `react` | UI runtime | Yes (peer) |

### Internal invariants

- No build step — consumed as source TypeScript.
- ESM only (`"type": "module"`).
- TypeScript strict with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`.
- Path alias: `@/*` → `./src/*` (relative to `package/`).
- Tests colocated with source (`*.test.ts`, `*.test.tsx`).

---

## Design Tradeoffs

These describe the current design's costs honestly. Forward-looking fixes live
in [TODO.md](./TODO.md), not here.

### ~~`fieldMap` is an overloaded name~~ — resolved

`createFormFormat`'s option was renamed from `fieldMap` to `fieldComponents`,
eliminating the collision with `FormContextValue.fieldMap` (`FieldMap`). The
option name now matches its type (`FieldComponentMap`).

### `required` is a leaky derivation

`required` is derived as `!optional && min != null`. A string field is only
"required" when it has a `min_length` check. This conflates "has a min
constraint" with "must be provided." A truly optional field with no min reads as
`required: undefined` (falsy), and a required field without an explicit min also
reads as not-required.


### The cast chain

Several casts bridge the `SchemaAdapter<TSchema = unknown>` boundary and RHF's
types:

- `use-form.ts`: `resolver as never`, `useRhfForm(...) as unknown as UseFormReturn<TValues>`
- `form.tsx`: `form.onSubmit as never, form.onInvalid as never`,
  `form as unknown as UseFormReturn<TValues>`
- `use-form-context.ts`: `...(rhf as object)`, `as FormContextInstance<TValues>`
- `create-resolver.ts`: `schema as never`
- `smart-field-array.tsx`: `append`/`fields`/`move`/`update` casts to
  `SmartFieldArrayRenderProps` shapes

Root cause: `SchemaAdapter<TSchema = unknown>` — the `unknown` default loses type
info at the boundary. A future tightening of the generic chain would eliminate
most of these.

### `buildDefaults` ignores its schema parameter

`SchemaAdapter.buildDefaults(schema, fieldMap, overrides?)` accepts the schema,
but the Zod implementation prefixes it `_schema` and only uses `fieldMap` +
`overrides`. The `schema` parameter is kept for adapters that might need it.

---

## File Map

```
package/src/
├── types.ts                          # Core types: FieldDef, FieldMap, FieldComponentMap,
│                                     #   FieldRenderProps, FieldMeta, FieldCheck,
│                                     #   SchemaAdapter, FormContextValue, UseFormOptions,
│                                     #   ValidationMode
├── core/
│   ├── index.ts                      # Public re-exports from core
│   ├── create-form-format.ts         # createFormFormat factory
│   ├── form.tsx                      # <Form> component (wraps FormProvider + context)
│   ├── use-form.ts                   # useForm hook + FormInstance / FormContextInstance types
│   └── use-form-context.ts           # useFormContext hook
├── ui/
│   ├── smart-field.tsx               # SmartField + createSmartField + resolveFieldDef
│   └── smart-field-array.tsx         # SmartFieldArray + render-prop types
└── adapters/
    └── zod/
        ├── index.ts                  # Public re-exports from Zod adapter
        ├── adapter.ts                # zodAdapter: SchemaAdapter<ZodType>
        ├── build-field-map.ts        # Zod schema → FieldMap introspection
        ├── build-defaults.ts         # FieldMap → default values + deriveDefault
        └── create-resolver.ts        # Zod schema → RHF resolver
```

---

## Zod Adapter Internals

The Zod adapter is the most complex part of the system because it walks Zod v4's
private `_zod.def` API. This is intentionally fragile — if Zod's internal shape
changes, `build-field-map.ts` will break.

### Key behaviors

- **Optional unwrapping:** When `type === "optional"`, the adapter recurses into
  `innerType` with `optional = true`, then overlays `meta` from the outer schema.
- **Union handling:** When `type === "union"`, the adapter picks the first
  non-literal option (to handle `z.string().optional()` which becomes a union of
  `string | literal(undefined)`).
- **String kind resolution:** `resolveStringKind` checks `def.format` and
  `checks` for `"email"` / `"url"` before falling back to `"string"`.
- **Required derivation:** `required = !optional && min != null`.
- **Unsupported types:** `record` and unrecognized Zod types throw an error.

---

## Features not supported / planned:

- Nested Forms
