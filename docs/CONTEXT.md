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
                    │  createFormSystem()  │
                    │  (factory entry)    │
                    └─────────┬────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
          FieldComponentMap  SchemaAdapter<TSchema>
          (kind → component) (schema → SchemaTree + defaults + resolver)
                 │            │
                 │     ┌──────┼──────┐
                 │     ▼      ▼      ▼
                 │   SchemaTree  Defaults  Resolver
                 │  (metadata) (values)  (RHF)
                 │     │
                 ▼     ▼
              SmartField ──reads──▶ SchemaTree
                 │                     (from React context)
                 ▼
              register(name) + getFieldState(name, formState)  (RHF)
                 │
                 ▼
              FieldComponentMap[kind]
                 │
                 ▼
              <Component {...FieldComponentProps} />
```

### Data flow

1. Consumer calls `createFormSystem({ fieldComponents, schemaResolver })` — gets
   `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`. The factory
   creates a React context once and closes over the `FieldComponentMap`.
2. Consumer calls `useForm({ schema, onSubmit, ... })` — the hook calls the
   adapter to produce a `SchemaTree`, default values, and a resolver, then
   delegates to `useForm` from `react-hook-form`. Returns a `FormInstance`
   (RHF methods + `fieldMap` + `onSubmit`/`onInvalid`).
3. Consumer renders `<Form form={formInstance}>` — this wraps RHF's
   `FormProvider` and sets React context with `{ fieldMap: form.fieldMap }`.
4. Consumer renders `<SmartField name="address.city" />` — reads RHF context
   plus the `SchemaTree` from context (throws `createFormError` if used outside
   `<Form>`), resolves the field definition via `resolveFieldDef`, looks up the
   component in the `FieldComponentMap`, and renders it with RHF bindings via
   `register(name)` (provides `ref`, `onChange`, `onBlur`) and
   `getFieldState(name, formState).error?.message` (provides `error`). There is
   no `<Controller>` and no `meta.component` kind override — dispatch is always
   `fieldComponents[def.kind]`, with `onChange`/`onBlur` adapted to
   `{ target: { name, value }, type }` events. If
   `resolveFieldDef` throws or no component is registered for the resolved
   `kind`, SmartField calls `devWarn` and renders `null`.

---

## Key Design Decisions

### 1. Factory pattern over provider pattern

- **Encapsulation** — `FieldComponentMap` is closed over, not floating in
  context.
- **Input validation** — `createFormSystem` throws `createFormError` if no
  `schemaResolver` is provided or if `fieldComponents` is missing/empty.

The tradeoff: you can't swap components or adapters at runtime. This is
acceptable — form systems are typically configured once at module level.

### 2. SchemaAdapter as the integration boundary

The adapter is the **only** place that knows about a specific validation
library. Everything downstream operates on the adapter's normalized output
(`SchemaTree`, defaults, resolver). This means:

- Adding a new validation library = writing a new adapter, not touching core.
- The core is validation-library-agnostic.
- The adapter's `buildFieldMap` is the most complex part — it walks schema
  internals (e.g., Zod's `_zod.def`), which is a private/fragile API.

### 3. Flat `kind` for component dispatch

The `kind` field on `FieldDef` is a single string that the adapter resolves from
schema type and format. This keeps the `FieldComponentMap` lookup trivial:
`fieldComponents[def.kind]`.

### 4. SchemaTree as the single source of truth

Once the adapter produces the `SchemaTree`, the rest of the system never touches
the raw schema again. The tree carries all metadata needed for rendering:

- Field existence and nesting → `elementFields` property
- Field type → `kind` property
- Validation constraints → `checks`, `min`, `max`
- User annotations → `meta`
- Required status → `required` (derived as `!optional` — see
  [Design Tradeoffs](#design-tradeoffs))

### 5. SmartFieldArray is schema-agnostic

`SmartFieldArray` doesn't use the `SchemaTree` or the adapter. It's a thin wrapper
over RHF's `useFieldArray`. This is correct — array operations (append, remove,
move) don't need schema knowledge. The consumer is responsible for rendering the
right `SmartField` components inside the array render function.

---

## Three Entrypoints

| Entrypoint | Path | Purpose |
|---|---|---|
| `@adistack/forms` | `src/index.ts` | Core: `createFormSystem`, `resolveFieldDef`, `SmartFieldArray`, and types (`FieldDef`, `SchemaTree`, `FieldComponentMap`, `FieldComponentProps`, `FormInstance`, `FormContextInstance`, `UseFormOptions`, etc.). `SmartField`, `useForm`, `useFormContext` are **not** direct exports — they're returned by `createFormSystem()`. `FieldArrayRow` is defined in `ui/smart-field-array.tsx` but not re-exported from any entrypoint. |
| `@adistack/forms/adapters/zod` | `src/adapters/zod/index.ts` | Zod v4 adapter: `zodAdapter`, `buildFieldMap`, `buildDefaults`, `createResolver` (`deriveDefault` is private, not exported) |
| `@adistack/forms/ui` | `src/ui/index.ts` | Re-exports `SmartFieldArray` and prop types (`SmartFieldProps`, `SmartFieldArrayProps`, `SmartFieldArrayRenderProps` — `FieldArrayRow` is not re-exported) |

`zod` and `@hookform/resolvers` are **optional peer dependencies** (marked
`optional: true` via `peerDependenciesMeta`) — consumers who don't use the Zod
adapter don't need them. `react-hook-form@^7.86.0` and `react@>=18` are required
peers.

---

## Instance types

`useForm` and `useFormContext` return different (but related) shapes:

- **`FormInstance<TValues>`** — what `useForm` returns.
  `FormContextInstance & { onSubmit: (values: TValues) => void, onInvalid? }`.
  Carries the submit handlers because only the form author wires those. Generic
  over `TValues extends FieldValues` (defaults to `FieldValues`).
- **`FormContextInstance`** — what `useFormContext` returns.
  `UseFormReturn<FieldValues> & { fieldMap: SchemaTree }`. Not generic — deep
  field components read form state without needing to know the submit value
  type. Deliberately omits submit handlers — deep field components shouldn't
  trigger submit.

`FormInstance` extends `FormContextInstance` with the submit callbacks. `<Form>`
accepts a `FormInstance`; everything inside reads via `useFormContext` as a
`FormContextInstance`.

---

## Constraints & Dependencies

### External

| Dependency | Role | Required? |
|---|---|---|
| `react-hook-form@^7.86.0` | Form state management, validation, field registration | Yes (peer) |
| `react@>=18` | UI runtime | Yes (peer) |
| `@hookform/resolvers@>=5` | Schema resolver bridge | Only with Zod adapter (optional peer via `peerDependenciesMeta`) |
| `zod@>=4` | Schema definition & validation | Only with Zod adapter (optional peer via `peerDependenciesMeta`) |

### Internal invariants

- No build step — consumed as source TypeScript.
- ESM only (`"type": "module"`).
- TypeScript strict with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`.
- Path alias: `#/*` → `./src/*` (relative to `package/`).
- Tests colocated with source (`*.test.ts`, `*.test.tsx`).

---

## Design Tradeoffs

These describe the current design's costs honestly. Forward-looking fixes live
in [USER-TODO.md](./USER-TODO.md), not here.

### ~~`fieldMap` is an overloaded name~~ — resolved

`createFormSystem`'s option was renamed from `fieldMap` to `fieldComponents`,
eliminating the collision with `FormContextValue.fieldMap` (`SchemaTree`). The
option name now matches its type (`FieldComponentMap`).

### ~~`required` is a leaky derivation~~ — resolved

`required` was previously derived as `!optional && min != null`, which conflated
"has a min constraint" with "must be provided." It is now derived as `!optional`
— a field is "required" when it cannot be omitted (i.e., not optional).

### `buildDefaults` ignores its schema parameter

`SchemaAdapter.buildDefaults(schema, fieldMap, overrides?)` accepts the schema,
but the Zod implementation prefixes it `_schema` and only uses `fieldMap` +
`overrides`. The `schema` parameter is kept for adapters that might need it.

---

## File Map

```
package/src/
├── index.ts                          # Core entrypoint (createFormSystem, resolveFieldDef, SmartFieldArray, types)
├── types.ts                          # Core types: FieldDef, SchemaTree, FieldComponentMap,
│                                     #   FieldComponentProps, FieldMeta, FieldCheck,
│                                     #   SchemaAdapter, FormContextValue, UseFormOptions,
│                                     #   ValidationMode
├── errors.ts                         # createFormError (structured errors) + devWarn (dev-only warnings)
├── core/
│   ├── create-form-system.ts         # createFormSystem factory (validates inputs, creates context)
│   ├── create-form-system.test.tsx   # jsdom integration: resolution, nesting, submit, arrays
│   ├── resolve-field-def.ts          # resolveFieldDef (walks SchemaTree by dot-path)
│   ├── form.tsx                      # <Form> component (wraps FormProvider + context)
│   ├── use-form.ts                   # createUseForm hook factory + FormInstance / FormContextInstance types
│   └── use-form-context.ts           # createUseFormContext hook factory
├── ui/
│   ├── index.ts                      # Re-exports SmartFieldArray and prop types
│   ├── smart-field.tsx               # SmartField + createSmartField
│   └── smart-field-array.tsx         # SmartFieldArray + render-prop types (+ FieldArrayRow, not re-exported)
└── adapters/
    └── zod/
        ├── index.ts                  # Public re-exports from Zod adapter
        ├── adapter.ts                # zodAdapter: SchemaAdapter<ZodType>
        ├── build-field-map.ts        # Zod schema → SchemaTree introspection
        ├── build-field-map.test.ts   # Kind mapping, optional/union, record/literal throws
        ├── build-defaults.ts         # SchemaTree → default values + deriveDefault (private)
        ├── build-defaults.test.ts    # Per-kind defaults, nesting, overrides
        └── create-resolver.ts        # Zod schema → RHF resolver
```

---

## Zod Adapter Internals

The Zod adapter is the most complex part of the system because it walks Zod v4's
private `_zod.def` API. This is intentionally fragile — if Zod's internal shape
changes, `build-field-map.ts` will break.

Supported types (`SUPPORTED_TYPES`): `string`, `number`, `boolean`, `enum`,
`array`, `object`, `date`. `buildFieldMap(schema, parentPath?)` reads
`schema._zod.def.shape` and returns `{}` for non-object or `undefined` input.

### Key behaviors

- **Optional unwrapping:** When `type === "optional"`, the adapter recurses into
  `innerType` with `optional = true`, then overlays `meta` from the outer schema.
- **Union handling:** When `type === "union"`, the adapter picks the first
  non-literal option (to handle `z.string().optional()` which becomes a union of
  `string | literal(undefined)`). A bare `literal` or an empty union throws.
- **String kind resolution:** `resolveStringKind` checks `def.format` and
  `checks` for `"email"` / `"url"` before falling back to `"string"`.
- **Number constraints:** inclusive `greater_than` / `greater_than_equal` → `min`,
  inclusive `less_than` / `less_than_equal` → `max`; exclusive bounds become
  `{ type: "gt"/"lt" }` checks.
- **Required derivation:** `required = !optional`.
- **Defaults:** `deriveDefault` (private) returns `""` for
  `string/email/url/password/textarea/combobox`, `0` for `number`, `false` for
  `boolean/checkbox`, first entry for `enum`, `[]` for `array`, recursive object
  for `object`, and `undefined` for `optional`, `date`, `unknown`, and anything
  else. The Zod adapter never emits `password`/`textarea`/`combobox`/`checkbox` —
  those branches only trigger via custom adapters or manual field maps.
- **Unsupported types:** `record`, `literal`, and unrecognized Zod types throw
  (`Unsupported Zod type: …`). The adapter never produces `kind: "unknown"`;
  `resolveFieldDef` still rejects `"unknown"` for manually built maps.

---

## Supported vs. Unsupported Nesting

- **Nested objects — supported.** The `SchemaTree` is recursive, and
  `resolveFieldDef` walks nested `elementFields`. A schema like
  `{ address: z.object({ city: z.string() }) }` produces
  `<SmartField name="address.city" />`. Arrays of objects also nest via
  `elementFields` on the array's `FieldDef` (e.g. `tasks.0.title` skips the
  numeric segment).
- **Nested forms — not supported.** Sub-forms with an independent
  submit/validation lifecycle (separate `useForm` / `<Form>` inside another
  `<Form>`) are not supported. The system assumes a single `FormInstance` per
  form tree.

See [GLOSSARY.md — Nested Objects vs. Nested Forms](./GLOSSARY.md#nested-objects-vs-nested-forms).
