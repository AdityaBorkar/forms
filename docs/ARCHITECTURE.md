# Architecture

How `@adistack/forms` works today. Names and signatures match `package/src/`.
For tight domain definitions see [CONTEXT.md](./CONTEXT.md); for the full
public API reference see [GLOSSARY.md](./GLOSSARY.md).

## Purpose

`@adistack/forms` is a schema-driven React form library. You provide a
validation schema and a set of UI components, and the library auto-renders form
fields via `react-hook-form`. The core insight: **the schema knows what fields
exist, their types, and their constraints — the form should derive itself from
that knowledge.**

---

## Overview

```
                    ┌──────────────────────┐
                    │  createFormSystem()  │
                    │  (factory entry)    │
                    └─────────┬────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
          FieldComponentMap  SchemaAdapter<TSchema>
          (kind → component) (schema → SchemaTree + resolver)
                 │            │
                 │     ┌──────┼──────┐
                 │     ▼      ▼      ▼
                 │   SchemaTree  Defaults  Resolver
                 │  (metadata) (RHF)     (RHF)
                 │     │
                 ▼     ▼
              SmartField ──reads──▶ SchemaTree
                 │                     (from React context)
                 ▼
              useController({ name, disabled })  (RHF)
                 │
                 ▼
              FieldComponentMap[kind]
                 │
                 ▼
              <Component {...FieldComponentProps} />
```

`meta.component` is applied at adapter time, not at render time:
`resolveKind` in `adapters/shared/field-def.ts` lets a non-empty
`meta.component` string replace the base kind, so `def.kind` already carries
the override when `SmartField` dispatches.

### Data flow

1. Consumer calls `createFormSystem({ fieldComponents, schemaResolver })` — gets
   `{ Form, SmartField, SmartFieldArray, useForm, useFormContext }`. The factory
   creates a React context once and closes over the `FieldComponentMap`.
   It throws `createFormError` without a `schemaResolver`, with a
   missing/empty `fieldComponents` map, or when any registered value is not a
   function (a React component). `onMissingField` (`"throw"` default, `"warn"`
   opt-in) is also closed over and forwarded to `SmartField`/`SmartFieldArray`.
2. Consumer calls `useForm({ schema, onSubmit, ... })` — the hook validates
   its options (missing options/`schema`/`onSubmit` throw `createFormError`;
   there is no runtime `validationMode`/`reValidateMode` check — invalid
   strings are a type error only), then calls `adapter.buildFieldMap(schema)` for the
   `SchemaTree` and `adapter.createResolver(schema)` for validation (raw adapter failures
   are wrapped with context; adapter `createFormError`s pass through), then
   delegates to RHF's `useForm` with `mode: validationMode` (defaults to
   `"onBlur"`) and `reValidateMode` (defaults to `"onChange"`).
   `fieldMap`/`resolver` are `WeakMap`-cached per schema object (GC-safe);
   `onSubmit`/`onInvalid`/`onSubmitError` are latest-ref stabilized so the
   returned `form` identity is stable. `TValues` infers from the schema via
   `InferFormValues` (Standard Schema `~standard.types.output`) unless
   overridden explicitly.
3. Consumer renders `<Form form={formInstance}>` — this wraps RHF's
   `FormProvider` and sets React context with `{ fieldMap: form.fieldMap }`.
   Submit goes through `form.handleSubmit(form.onSubmit, form.onInvalid)` with
   `preventDefault`; a throwing `onSubmit` is caught and routed to
   `form.onSubmitError` plus a `root.serverError` field error. A missing
   `form` prop throws `createFormError`.
4. Consumer renders `<SmartField name="address.city" />` — reads the
   `SchemaTree` from context (throws `createFormError` outside `<Form>`),
   resolves the def via `resolveFieldDef`, looks up
   `fieldComponents[def.kind]`, and renders it through
   `useController({ name, disabled })` (`value` / `onChange(value)` / `onBlur` /
   `ref` / `error.message`, `value` omitted when `undefined`). On a missing def
   or missing component the default `onMissingField: "throw"` policy throws in
   dev (prod always `devWarn` + `null`); `"warn"` opts into `devWarn`
   (deduplicated, dev-only) + `null` in dev too.
5. Consumer renders `<SmartFieldArray name="tasks">` — the factory-bound
   version requires `<Form>` context (throws outside it) and delegates to RHF's
   `useFieldArray`. There is no static unbound export — `ui/index.ts` and the
   core entrypoint re-export only its prop/row types.

---

## Key design decisions

### 1. Factory pattern over provider pattern

- **Encapsulation** — `FieldComponentMap` is closed over, not floating in
  context.
- **Input validation** — `createFormSystem` throws `createFormError` if no
  `schemaResolver`, if `fieldComponents` is missing/empty, or if any entry is
  not a component function.

The tradeoff: you can't swap components or adapters at runtime. This is
acceptable — form systems are typically configured once at module level.

### 2. SchemaAdapter as the integration boundary

The adapter is the **only** place that knows about a specific validation
library. Everything downstream operates on normalized output (`SchemaTree`,
defaults, resolver). Adding a validation library = writing a new adapter, not
touching core. The `buildFieldMap` implementations walk private internals
(Zod's `_zod.def`, Valibot's `type`/`entries`/`pipe`) — intentionally fragile.

Current signature (`src/types.ts`):

```ts
type SchemaAdapter<TSchema, TValues = unknown> = {
  buildFieldMap(schema: TSchema): SchemaTree;
  createResolver(schema: TSchema): Resolver;
  /** Phantom output type — never read at runtime. Enables `useForm` inference. */
  readonly _infer?: TValues;
};
```

`useForm` infers `TValues` from the schema via `InferFormValues<TSchema>`
(Standard Schema `~standard.types.output`, falling back to `unknown` for
non-conforming schemas) unless the caller pins `TValues` explicitly. Typed
widget helpers are zero-runtime: `defineFieldComponent<TValue, TConfig>` /
`defineFieldComponents(map)`, plus `FieldKindValueMap` (kind → value type)
and `ComboboxConfig` (`{ options: string[] }`).

There is no auto-default derivation — `defaultValues` pass straight through
to RHF. Guessing `0` for numbers or the first entry for enums masked
required-field UX, so the adapter no longer derives defaults.

### 3. Flat `kind` plus `meta.component` override

`FieldDef.kind` (`FieldKind = KnownFieldKind | (string & {})`) is the single
dispatch key: `fieldComponents[def.kind]`. Adapters resolve base kinds, then
`resolveKind(baseKind, meta)` lets a non-empty `meta.component` string replace
the kind (e.g. `z.string().meta({ component: "textarea" })` dispatches to
`fieldComponents.textarea`). `KnownFieldKind` lists the first-class kinds:

`string|email|url|password|textarea|combobox|number|slider|boolean|checkbox|switch|enum|array|object|date`

Custom strings stay allowed for user-defined variants.

### 4. SchemaTree as the single source of truth

Once the adapter produces the `SchemaTree`, the rest of the system never touches
the raw schema again. The tree carries:

- Nesting → `elementFields` (object children only) plus
  `elementDef` (array element definition, including primitives; object
  elements carry their own `elementFields` via `elementDef`)
- Type → `kind`
- Constraints → `checks`, `min`, `max`
- Annotations → `meta` (including `component` override)
- Optionality → `optional` (single source of truth; derive "required" in UI as
  `!optional` — there is no stored `required` field)

### 5. SmartFieldArray validates its target but stays operation-agnostic

The factory-bound `SmartFieldArray` (the only export — there is no static
unbound component) checks that `name` resolves to an `array`
field (`onMissingField: "throw"` throws in dev, `"warn"` or prod `devWarn` +
`null`) — array operations (append, remove, update, move) themselves don't need schema
knowledge. It still requires `<Form>` context so array rows render inside the
same form tree. The consumer renders the right `SmartField` components inside
the render function.

---

## Entrypoints

Four exports in `package/package.json`:

| Entrypoint | Path | Purpose |
|---|---|---|
| `@adistack/forms` | `src/index.ts` | Core: `createFormSystem`, `resolveFieldDef`, types (`FieldDef`, `SchemaTree`, `FieldComponentMap`, `FieldComponentProps<TValue, TConfig>` with nested `def`, `FormInstance` (+`onSubmitError`), `FormContextInstance`, `UseFormOptions` (`onSubmit` returns `void \| Promise<void>`), `ValidationMode`, `ReValidateMode`, `FieldKind`, `KnownFieldKind`, `FieldCheck`, `KnownFieldCheckType`, `FieldMeta`, `FormSystem`, `CreateFormSystemOptions` (+`onMissingField`), `OnMissingField`, `InferFormValues`, `FieldKindValueMap`, `ComboboxConfig`), helpers (`defineFieldComponent`, `defineFieldComponents`), prop/row types (`SmartFieldProps`, `SmartFieldArrayProps`, `SmartFieldArrayRenderProps`, `FieldArrayRow` — re-exported). `SmartField`/`useForm`/`useFormContext`/`SmartFieldArray` components are **not** direct exports — they're factory-returned. |
| `@adistack/forms/adapters/zod` | `src/adapters/zod/index.ts` | Zod v4 adapter: `zodAdapter`, `buildFieldMap(schema)`, `createResolver(schema)` |
| `@adistack/forms/adapters/valibot` | `src/adapters/valibot/index.ts` | Valibot adapter: `valibotAdapter`, same shape (`picklist`/`enum` normalize to `enum`) |
| `@adistack/forms/ui` | `src/ui/index.ts` | Types only: `SmartFieldProps`, `SmartFieldArrayProps`, `SmartFieldArrayRenderProps`, `FieldArrayRow` (no runtime component exports) |

`react-hook-form@^7.86.0` and `react@>=18` are required peers.
`zod@>=4`, `valibot@>=1`, `@hookform/resolvers@>=5` are optional peers via
`peerDependenciesMeta`.

---

## Instance types

`useForm` and `useFormContext` return different (but related) shapes, both
generic over `TValues extends FieldValues` (default `FieldValues`):

- **`FormContextInstance<TValues>`** — what `useFormContext` returns.
  `UseFormReturn<TValues> & { fieldMap: SchemaTree }`. Deep field components
  read form state; by convention they don't trigger submit.
- **`FormInstance<TValues>`** — what `useForm` returns.
  `UseFormReturn<TValues, unknown, TValues> & { fieldMap, onSubmit, onInvalid?, onSubmitError? }`.
  `onSubmit: (values: TValues) => void | Promise<void>`,
  `onInvalid?: (errors: FieldErrors<TValues>) => void`,
  `onSubmitError?: (error: unknown) => void` (submit-handler failures only;
  validation failures go to `onInvalid`). This is what `<Form>` accepts as its
  `form` prop.

`UseFormOptions<TSchema, TValues>`:

```ts
type UseFormOptions<TSchema, TValues extends FieldValues = FieldValues> = {
  schema: TSchema;
  onSubmit: (values: TValues) => void | Promise<void>;
  onInvalid?: (errors: FieldErrors<TValues>) => void;
  onSubmitError?: (error: unknown) => void;
  defaultValues?: DefaultValues<TValues>;
  validationMode?: ValidationMode;    // default "onBlur" (type-checked only)
  reValidateMode?: ReValidateMode;    // default "onChange" (type-checked only)
};
```

`ValidationMode = "onBlur" | "onChange" | "onSubmit" | "onTouched" | "all"`.
`ReValidateMode = "onChange" | "onBlur" | "onSubmit"`.

---

## Constraints & dependencies

### External

| Dependency | Role | Required? |
|---|---|---|
| `react-hook-form@^7.86.0` | Form state, validation, `useController`/`useFieldArray` | Yes (peer) |
| `react@>=18` | UI runtime | Yes (peer) |
| `@hookform/resolvers@>=5` | Schema resolver bridge (`zodResolver`, `valibotResolver`) | Only with an adapter (optional peer) |
| `zod@>=4` | Schema definition & validation | Only with Zod adapter (optional peer) |
| `valibot@>=1` | Schema definition & validation | Only with Valibot adapter (optional peer) |

### Internal invariants

- No build step — consumed as source TypeScript.
- ESM only (`"type": "module"`).
- TypeScript strict with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`.
- Path alias: `#/*` → `./src/*` (relative to `package/`).
- Tests colocated with source (`*.test.ts`, `*.test.tsx`).

---

## Design tradeoffs

Forward-looking fixes live in [USER-TODO.md](./USER-TODO.md), not here.

### ~~`fieldMap` is an overloaded name~~ — resolved

`createFormSystem`'s option was renamed from `fieldMap` to `fieldComponents`,
eliminating the collision with `FormContextValue.fieldMap` (`SchemaTree`). The
option name now matches its type (`FieldComponentMap`).

### ~~`required` stored alongside `optional`~~ — resolved (removed)

`required` was previously derived as `!optional && min != null`, then as
`!optional`. It is now gone from `FieldDef` — `optional: boolean` is the single
source of truth. Derive "required" in UI as `!optional`.

### ~~Auto-derived defaults~~ — resolved (removed)

`SchemaAdapter.buildDefaults` (plus `deriveDefault`/`mergeDefaults` and
`SmartFieldArray.appendDefault`) used to guess per-kind defaults (`""`, `0`,
`false`, first enum entry, `[]`). `0` vs `undefined` and auto-selecting the
first enum entry were wrong UX and masked required validation, so the whole
subsystem was removed. `useForm({ defaultValues })` now passes straight
through to RHF.

---

## File map

```
package/src/
├── index.ts                          # Core entrypoint (createFormSystem, resolveFieldDef, full type/helper re-exports; no runtime SmartField/SmartFieldArray)
├── types.ts                          # FieldDef (kind/optional/meta/checks/entries/elementFields/elementDef/min/max),
│                                     #   FieldKind/KnownFieldKind, FieldCheck(+Type), FieldMeta (+component),
│                                     #   FieldComponentMap/Props<TValue, TConfig> ({ def, name, value, onChange, onBlur, ref, error, disabled, config }),
│                                     #   FieldKindValueMap, ComboboxConfig, defineFieldComponent(s),
│                                     #   SchemaAdapter (+_infer) / InferFormValues, OnMissingField,
│                                     #   SchemaTree, FormContextValue/Instance, FormInstance (+onSubmitError),
│                                     #   UseFormOptions, ValidationMode, ReValidateMode
├── errors.ts                         # createFormError + devWarn (deduplicated, dev-only) + isProduction (no reset helper)
├── core/
│   ├── create-form-system.ts         # createFormSystem factory (+ CreateFormSystemOptions w/ onMissingField, FormSystem w/ inferred useForm)
│   ├── create-form-system.test.tsx   # jsdom integration: resolution, meta.component, nesting, submit, arrays, onMissingField, inference
│   ├── form-context.ts               # useFormContextValue choke point (SmartField|SmartFieldArray|useFormContext)
│   ├── resolve-field-def.ts          # resolveFieldDef (dot-path, numeric via elementDef, array index required, empty-segment throw)
│   ├── resolve-field-def.test.ts
│   ├── form.tsx                      # <Form> (FormProvider + context, handleSubmit wiring) + FormProps
│   ├── use-form.ts                   # createUseForm factory (WeakMap fieldMap/resolver cache, stable callbacks, no runtime mode check)
│   └── use-form-context.ts           # createUseFormContext factory
├── ui/
│   ├── index.ts                      # Types only (SmartFieldProps, SmartFieldArrayProps/RenderProps, FieldArrayRow)
│   ├── smart-field.tsx               # createSmartField + SmartFieldProps (useController dispatch, onMissingField policy)
│   └── smart-field-array.tsx         # createSmartFieldArray (bound-only, context-gated) + FieldArrayRow
└── adapters/
    ├── shared/
    │   ├── field-def.ts              # resolveKind (meta.component), mergeMeta (outer wins), makeFieldDef, isFieldMeta
    │   ├── constraints.ts            # ConstraintAcc type + finalizeConstraints (accumulators start as `{ checks: [] }`)
    │   └── index.ts
    ├── zod/
    │   ├── index.ts                  # zodAdapter, createResolver
    │   ├── build-field-map.ts        # Zod → SchemaTree via _zod.def (+ SUPPORTED_TYPES)
    │   └── build-field-map.test.ts
    └── valibot/
        ├── index.ts                  # valibotAdapter, createResolver
        ├── build-field-map.ts        # Valibot → SchemaTree via type/entries/pipe (+ SUPPORTED_TYPES, OPTIONAL_WRAPPERS)
        └── build-field-map.test.ts
```

---

## Adapter internals

### Zod (`adapters/zod/build-field-map.ts`)

Walks Zod v4's private `_zod.def` API (fragile by design).
`SUPPORTED_TYPES`: `string`, `number`, `boolean`, `enum`, `array`, `object`,
`date`. `buildFieldMap(schema)` reads `schema._zod.def.shape`, returns `{}` for
non-object or `undefined` input.

- **Optional:** `type === "optional"` recurses into `innerType` with
  `optional = true`; outer `meta` wins via `mergeMeta(inner.meta, meta)`.
- **Union:** picks the single non-`literal` branch (handles
  `z.string().optional()` as `string | literal(undefined)`). Empty unions,
  all-literal unions, and multi-branch unions throw (unsupported/ambiguous).
- **String kinds:** `resolveStringKind` checks `def.format` for `email`/`url`,
  else `string`. `password`/`textarea`/`combobox` come from
  `meta.component`, not from Zod itself.
- **Numbers:** inclusive `greater_than`/`greater_than_equal` → `min`, inclusive
  `less_than`/`less_than_equal` → `max`; exclusive bounds become
  `{ type: "gt"/"lt" }` checks; `format` checks (e.g. `integer`) pass through.
- **Arrays:** `element` builds `elementDef`; object elements carry their
  `elementFields` on `elementDef` (no hoisting onto the array def — array
  paths require an explicit index, e.g. `arr.0.city`).
- **Objects:** `elementFields` built recursively.
- **Unsupported:** `record`, `literal` (bare), and unknown types throw
  `Unsupported Zod type: …`. The adapter never emits `kind: "unknown"`.

### Valibot (`adapters/valibot/build-field-map.ts`)

Walks Valibot's public-ish `type`/`entries`/`item`/`wrapped`/`pipe` shape.
`SUPPORTED_TYPES`: `string`, `number`, `boolean`, `picklist`, `enum`, `array`,
`object`, `date`. `picklist` and `enum` both normalize to `kind: "enum"`.

- **Optional wrappers:** `optional`/`nullish`/`exact_optional` force
  `optional: true`. `nullable` alone does not (preserves outer optionality —
  `null` is a value, not absence).
- **Meta:** merged from `pipe` metadata entries (`metadata`, plus
  `title` → `label`/`title`, `description`).
- **Strings:** `email`/`rfc_email` → `email`, `url` → `url`, else `string`;
  length constraints (`min_length`/`max_length`/`length`/`non_empty`) feed
  `min`/`max`/`checks`.
- **Numbers:** `min_value`/`max_value` → `min`/`max`,
  `gt_value`/`lt_value` → `{ type: "gt"/"lt" }`,
  `integer`/`safe_integer` → checks.
- **Union/record/unknown:** same policy as Zod — single non-`literal` branch
  wins, otherwise throw; `record` and unknown types throw.

### Defaults — intentionally absent (RHF owns `defaultValues`)

No auto-defaults are derived. Guessing `""`/`0`/`false`/first-enum-entry hid
required-field UX (`0` and a pre-selected enum pass validation without user
input), so `deriveDefault`/`buildDefaults`/`mergeDefaults` and
`SmartFieldArray.appendDefault` were removed. `useForm({ defaultValues })`
passes straight through to RHF; array rows use explicit `append(value)`.
Field components must handle `undefined` (omitted `value` prop) — the demo
widgets already do via `value ?? ""` / `checked === true` fallbacks.

---

## Supported vs. unsupported nesting

- **Nested objects — supported.** `resolveFieldDef` walks nested
  `elementFields`. `{ address: z.object({ city: z.string() }) }` renders via
  `<SmartField name="address.city" />`.
- **Arrays — indexed only.** Numeric segments step into `elementDef`
  (`tasks.0.title`); object-element children live on
  `elementDef.elementFields`. Index-less `arr.city` is ambiguous (which row?)
  and throws — always use an explicit index (`arr.0.city`). Primitive
  elements resolve directly (`tags.0` → `string`).
- **`resolveFieldDef` is strict.** Empty names and empty segments
  (`"addr..city"`, leading/trailing dots) throw; unknown roots/segments throw
  with available-field hints. Numeric keys on non-array objects look up
  literally.
- **Nested forms — not supported.** Sub-forms with an independent
  submit/validation lifecycle (separate `useForm` / `<Form>` inside another
  `<Form>`) are not supported. One `FormInstance` per form tree.

See [GLOSSARY.md — Nested Objects vs. Nested Forms](./GLOSSARY.md#nested-objects-vs-nested-forms).
