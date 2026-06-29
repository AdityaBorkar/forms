# Context

Architectural context for `@adistack/forms` — how the system works, why it's structured this way, and what constraints shape it.

---

## Purpose

`@adistack/forms` is a schema-driven React form library. You provide a validation schema and a set of UI components, and the library auto-renders form fields via `react-hook-form`. The core insight: **the schema knows what fields exist, their types, and their constraints — the form should derive itself from that knowledge.**

---

## Architecture Overview

```
                    ┌─────────────────────┐
                    │  createFormSystem()  │
                    │  (factory entry)     │
                    └────────┬────────────┘
                             │
                 ┌───────────┼───────────┐
                 ▼           ▼           ▼
          FieldComponentMap  SchemaAdapter<TSchema>
          (kind → component) (schema → SchemaTree + defaults + resolver)
                 │           │
                 │    ┌──────┼──────┐
                 │    ▼      ▼      ▼
                 │  SchemaTree  Defaults  Resolver
                 │  (metadata)  (values)  (RHF)
                 │    │
                 ▼    ▼
              SmartField ──reads──▶ SchemaTree
                 │                       (from React context)
                 ▼
              Controller (RHF)
                 │
                 ▼
              FieldComponentMap[kind]
                 │
                 ▼
              <Component {...FieldComponentProps} />
```

### Data flow

1. Consumer calls `createFormSystem({ fieldMap, schemaResolver })` — gets `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`.
2. Consumer calls `useForm({ schema, onSubmit, ... })` — the hook calls the adapter to produce `SchemaTree`, defaults, and a resolver, then delegates to `useForm` from `react-hook-form`.
3. Consumer renders `<Form form={formInstance}>` — this wraps RHF's `FormProvider` and sets React context with the `SchemaTree`.
4. Consumer renders `<SmartField name="address.city" />` — reads `SchemaTree` from context, resolves the field definition, looks up the component, renders inside RHF `Controller`.

---

## Key Design Decisions

### 1. Factory pattern over provider pattern

`createFormSystem` is a closure-based factory, not a React provider. This is intentional:

- **No runtime provider nesting** — the context is created inside the factory, not externally.
- **Type safety** — the generic `TSchema` flows from the adapter through the factory to the hooks.
- **Encapsulation** — `FieldComponentMap` is closed over, not floating in context.

The tradeoff: you can't swap components or adapters at runtime. This is acceptable — form systems are typically configured once at module level.

### 2. SchemaAdapter as the integration boundary

The adapter is the **only** place that knows about a specific validation library. Everything downstream operates on the adapter's normalized output (`SchemaTree`, defaults, resolver). This means:

- Adding a new validation library = writing a new adapter, not touching core.
- The core is validation-library-agnostic.
- The adapter's `buildFieldMap` is the most complex part — it walks schema internals (e.g., Zod's `_zod.def`), which is a private/fragile API.

### 3. Flat `kind` for component dispatch

The `kind` field on `FieldDef` is a single string that the adapter resolves from all schema nuances (primitive type, format, UI override). This keeps the `FieldComponentMap` lookup trivial: `componentMap[kind]`.

The cost: `kind` conflates three levels (type, format, component override), which causes coupling in `deriveDefault` and `meta.component`. This is a known tradeoff — simplicity in the dispatch path, fragility in the derivation path.

### 4. SchemaTree as the single source of truth

Once the adapter produces the `SchemaTree`, the rest of the system never touches the raw schema again. The tree carries all metadata needed for rendering:

- Field existence and nesting → `fields` property
- Field type → `kind` property
- Validation constraints → `checks`, `min`, `max`
- User annotations → `meta`
- Required status → `required` (currently leaky — see Known Issues)

### 5. SmartFieldArray is schema-agnostic

`SmartFieldArray` doesn't use the `SchemaTree` or the adapter. It's a thin wrapper over RHF's `useFieldArray`. This is correct — array operations (append, remove, move) don't need schema knowledge. The consumer is responsible for rendering the right `SmartField` components inside the array render function.

---

## Two Entrypoints

| Entrypoint | Path | Purpose |
|---|---|---|
| `@adistack/forms/core` | `src/core/index.ts` | Framework-agnostic core: `createFormSystem`, `SmartField`, `SmartFieldArray`, types, `useForm`/`useFormContext` factories |
| `@adistack/forms/adapters/zod` | `src/adapters/zod/index.ts` | Zod v4 adapter: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver` |

`@hookform/resolvers` and `zod` are **optional peer dependencies** — consumers who don't use the Zod adapter don't need them.

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
- Path alias: `@/*` → `./src/*`.
- Tests colocated with source (`*.test.ts`, `*.test.tsx`).

---

## Known Issues & Planned Changes

### From grilling session (this document's origin)

| Issue | Current State | Planned Fix |
|---|---|---|
| `FieldMap` naming | Doesn't convey tree structure | Rename to `SchemaTree` |
| `createFormFormat` naming | "Format" is vague | Rename to `createFormSystem` |
| `FieldRenderProps` naming | Doesn't match component contract | Rename to `FieldComponentProps` |
| `required` semantics | Derived as `!optional && min != null` — leaky | Should mean "cannot be omitted" |
| `deriveDefault` location | In Zod adapter but schema-agnostic | Move to core |
| `deriveDefault` fragility | Knows about UI override kinds (`password`, `textarea`, etc.) | Decouple `meta.component` from `kind` |
| `meta.component` override | Couples schema (data contract) to UI | Move override outside schema |
| `createResolver` return type | Returns `unknown`, cast as `never` in `use-form.ts` | Return typed resolver from adapter, move cast there |
| `unknown` kind fallback | Silently produces missing fields | Should throw |
| `resolveFieldDef` return type | Returns `undefined` | Should return a result type |
| Array `FieldDef.fields` naming | Same key as object's fields, different semantics | Better naming for element's fields |
| Nested forms | Not supported | Plan as distinct feature from nested objects |

### From TODO.md

| Issue | Notes |
|---|---|
| Cast chain | 3 `as never` + 1 `as unknown as` + 1 `as object` across `use-form.ts`, `form.tsx`, `use-form-context.ts`. Root cause: `SchemaAdapter<TSchema = unknown>` — the `unknown` default loses type info at the boundary. |
| deriveDefault coupling | Knows about string-derived kinds. Adding a new component override requires updating both `buildFieldDef`'s `meta.component` override and `deriveDefault`'s `kind` switch. |
| Nested forms | Explicitly not supported/planned. |

---

## File Map

```
src/
├── types.ts                          # Core types: FieldDef, SchemaTree, FieldComponentMap,
│                                     #   FieldComponentProps, SchemaAdapter, UseFormOptions, etc.
├── core/
│   ├── index.ts                      # Public re-exports from core
│   ├── create-form-format.ts         # createFormSystem factory (to be renamed)
│   ├── form.tsx                      # <Form> component (wraps FormProvider + context)
│   ├── use-form.ts                   # useForm hook (adapter → RHF delegation)
│   └── use-form-context.ts           # useFormContext hook (RHF context + SchemaTree)
├── ui/
│   ├── smart-field.tsx               # SmartField component + resolveFieldDef
│   └── smart-field-array.tsx         # SmartFieldArray component
└── adapters/
    └── zod/
        ├── index.ts                  # Public re-exports from Zod adapter
        ├── adapter.ts                # zodAdapter: SchemaAdapter<ZodType>
        ├── build-field-map.ts        # Zod schema → SchemaTree introspection
        ├── build-defaults.ts         # SchemaTree → default values
        └── create-resolver.ts        # Zod schema → RHF resolver
```

---

## Zod Adapter Internals

The Zod adapter is the most complex part of the system because it walks Zod v4's private `_zod.def` API. This is intentionally fragile — if Zod's internal shape changes, `build-field-map.ts` will break.

### Key behaviors

- **Optional unwrapping:** When `type === "optional"`, the adapter recurses into `innerType` with `optional = true`, then overlays `meta` from the outer schema.
- **Union handling:** When `type === "union"`, the adapter picks the first non-literal option (to handle `z.string().optional()` which becomes a union of `string | literal(undefined)`).
- **String kind resolution:** `resolveStringKind` checks format and checks for `"email"` / `"url"` before falling back to `"string"`.
- **Meta override:** If `meta.component` is set, it overrides the resolved `kind`. This is the coupling point that should move outside the schema.
- **Required derivation:** `required = !optional && min != null`. This is the leaky abstraction — a string field is only "required" when it has a `min_length` check.
