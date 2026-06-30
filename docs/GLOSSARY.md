# Glossary

Domain vocabulary for `@adistack/forms`. Terms are ordered by dependency —
earlier terms are used in later definitions. Every exported type from
`@adistack/forms/core` and `@adistack/forms/adapters/zod` is covered here. Names
match the actual source; see [ADR 0001](./adr/0001-docs-describe-actual-code.md).

---

## SchemaAdapter

**Type:** `SchemaAdapter<TSchema = unknown>`

The adapter contract. A schema adapter bridges a validation library (e.g., Zod,
Yup, Valibot) to the form system. It has three methods:

1. **`buildFieldMap(schema)`** — Introspects the schema and produces a
   [FieldMap](#fieldmap).
2. **`buildDefaults(schema, fieldMap, overrides?)`** — Derives default values from
   the [FieldMap](#fieldmap) and optional overrides. The `schema` parameter is
   kept for adapters that need it, though the Zod implementation prefixes it
   `_schema` and only uses `fieldMap` + `overrides`.
3. **`createResolver(schema)`** — Creates a `react-hook-form`-compatible resolver
   for schema-level validation. Returns `unknown`; the caller casts via
   `resolver as never`. See [Design Tradeoffs](./CONTEXT.md#the-cast-chain).

The adapter is the **only** place that knows about a specific validation
library's internals. Everything downstream operates on the adapter's normalized
output.

The `TSchema = unknown` default is the root cause of the cast chain — the
`unknown` default loses type info at the boundary.

---

## FieldMap

**Type:** `Record<string, FieldDef>`

The root of the schema-derived metadata tree. Each key is a top-level field name;
each value is a [FieldDef](#fielddef) node. The tree is recursive —
`FieldDef.fields` contains nested `FieldMap` structures for objects and arrays.

The FieldMap is produced by the adapter and consumed by the UI layer. It is the
**single source of truth** for what fields exist, their types, constraints, and
nesting structure. Once produced, the rest of the system never touches the raw
schema again.

> **Naming note:** `FieldMap` does not convey its tree structure, but it is the
> actual name in the code. A rename to something like `SchemaTree` is backlog
> (see [TODO.md](./TODO.md)).

---

## FieldDef

**Type:** `FieldDef`

A node in the [FieldMap](#fieldmap). Represents one field's resolved metadata
after adapter introspection. Key properties:

| Property | Type | Meaning |
|---|---|---|
| `kind` | `string` | The resolved field kind — used as the dispatch key into [FieldComponentMap](#fieldcomponentmap). See [Kind](#kind). |
| `optional` | `boolean` | Whether the schema marks this field as optional. |
| `required` | `boolean?` | **Leaky** — derived as `!optional && min != null`, which conflates "has a min constraint" with "must be provided". See [Design Tradeoffs](./CONTEXT.md#required-is-a-leaky-derivation). |
| `meta` | `FieldMeta?` | User-supplied annotations from the schema (label, placeholder, description, component, etc.). |
| `checks` | `FieldCheck[]?` | Adapter-normalized validation constraints. See [FieldCheck](#fieldcheck). |
| `entries` | `Record<string, string>?` | For enum kinds — the value-label pairs. |
| `fields` | `FieldMap?` | Nested fields. For objects, these are the child properties. For arrays, these are the **element's** child properties. |
| `min` | `number?` | Derived minimum constraint (length for strings/arrays, value for numbers). |
| `max` | `number?` | Derived maximum constraint. |

---

## Kind

**Type:** `string`

The `kind` property on [FieldDef](#fielddef). A flat, single-string value that
serves as the dispatch key into the [FieldComponentMap](#fieldcomponentmap). The
adapter resolves all schema nuances to a single `kind`.

Possible kinds include:

- **Primitive types:** `"string"`, `"number"`, `"boolean"`, `"date"`
- **Format variants:** `"email"`, `"url"`
- **Structural types:** `"object"`, `"array"`, `"enum"`
- **UI overrides:** `"password"`, `"textarea"`, `"combobox"`, `"checkbox"`
- **Fallback:** `"unknown"` — used for `record` types and any unrecognized type.
  Does **not** throw; a field with `kind: "unknown"` and no registered component
  renders nothing.

The `kind` is intentionally flat — the adapter is responsible for collapsing
type/format/component into a single string. This keeps the
[FieldComponentMap](#fieldcomponentmap) lookup simple at the cost of coupling in
the derivation path.

**Known coupling:** `meta.component` on Zod schemas allows schema authors to force
a specific `kind` (e.g., `.meta({ component: 'password' })`). This couples the
data contract to the UI layer. See
[Design Tradeoffs](./CONTEXT.md#kind-conflates-type-format-and-component-override).

---

## FieldCheck

**Type:** `{ type: string; value?: unknown }`

An adapter-normalized validation constraint. The adapter translates
schema-specific checks (e.g., Zod's `min_length`, `greater_than`, format
strings) into a uniform `{ type, value? }` format that components can consume for
hints (e.g., "show a min-length indicator").

The loose `{ type: string; value?: unknown }` shape is intentional — the adapter
is the normalization boundary, and the core doesn't need to know about specific
check types.

---

## FieldMeta

**Type:** `{ label?: string; placeholder?: string; description?: string; component?: string; [key: string]: unknown }`

User-supplied annotations attached to a schema field. The `component` property is
the UI override for [Kind](#kind) — this is the coupling point documented under
[Design Tradeoffs](./CONTEXT.md#kind-conflates-type-format-and-component-override).

The `[key: string]: unknown` index signature allows adapters to carry custom
metadata without changing the core type.

---

## FieldComponentMap

**Type:** `Record<string, React.ComponentType<FieldRenderProps>>`

The UI dispatch table. Maps [Kind](#kind) strings to React components. This is
the **only** place where UI components are registered. When
[SmartField](#smartfield) renders, it looks up `fieldComponents[def.kind]` and
passes a [FieldRenderProps](#fieldrenderprops) object.

This is provided by the consumer at `createFormFormat` time and closed over by
`createSmartField`. It is **not** available in React context — components cannot
be swapped at runtime.

> **Naming collision:** `createFormFormat`'s option is **named** `fieldMap` but
> its type is `FieldComponentMap` (UI components). This is unrelated to the
> [FieldMap](#fieldmap) type (schema metadata). The factory immediately rebinds
> the option as `fieldComponents`. See
> [Design Tradeoffs](./CONTEXT.md#fieldmap-is-an-overloaded-name).

---

## FieldRenderProps

**Type:** `FieldDef & { name, value, onChange, onBlur, ref, error?, disabled?, config? }`

The input contract for components in the [FieldComponentMap](#fieldcomponentmap).
Spreads all of [FieldDef](#fielddef) and adds `react-hook-form` control bindings:

| Added property | Type | Source |
|---|---|---|
| `name` | `string` | The field's RHF-registered path (dot-notation) |
| `value` | `unknown` | Current field value from RHF |
| `onChange` | `(value: unknown) => void` | RHF change handler |
| `onBlur` | `() => void` | RHF blur handler |
| `ref` | `React.Ref<any>` | RHF ref for focus management |
| `error` | `string?` | Current validation error message |
| `disabled` | `boolean?` | From SmartField's `disabled` prop |
| `config` | `Record<string, unknown>?` | From SmartField's `config` prop — arbitrary pass-through |

---

## FormContextValue

**Type:** `{ fieldMap: FieldMap }`

The value held in the form's React context. Only carries the
[FieldMap](#fieldmap) — this is all the UI layer needs from the schema. The
[FieldComponentMap](#fieldcomponentmap) is closed over by the factory, not in
context.

---

## ValidationMode

**Type:** `"onBlur" | "onChange" | "onSubmit" | "all"`

When RHF triggers validation. Passed through from
[UseFormOptions](#useformoptions). The `useForm` factory defaults this to
`"onBlur"` and sets `reValidateMode` to `"onChange"`.

---

## UseFormOptions

**Type:** `{ schema, onSubmit, onInvalid?, defaultValues?, validationMode? }`

Configuration for the `useForm` hook. The `schema` is the raw schema object (Zod
schema, etc.) — it's passed to the [SchemaAdapter](#schemaadapter) to produce the
[FieldMap](#fieldmap), defaults, and resolver. `defaultValues` overlays the
adapter-derived defaults.

---

## FormContextInstance

**Type:** `UseFormReturn<TValues> & { fieldMap: FieldMap }`

What [`useFormContext`](#useformcontext) returns. RHF's full return plus the
[FieldMap](#fieldmap). Deliberately **omits** submit handlers — deep field
components shouldn't trigger submit. `useFormContext` throws if used outside a
`<Form>`.

---

## FormInstance

**Type:** `FormContextInstance<TValues> & { onSubmit, onInvalid? }`

What [`useForm`](#useform) returns. Extends
[FormContextInstance](#formcontextinstance) with the submit callbacks
(`onSubmit`, optional `onInvalid`), because only the form author wires those.
This is what `<Form>` accepts as its `form` prop.

---

## FormProps

**Type:** `{ form: FormInstance, className?, children? }`

Props for the `<Form>` component. `form` is the [FormInstance](#forminstance)
returned by `useForm`. The component wraps RHF's `FormProvider`, sets React
context with `{ fieldMap: form.fieldMap }`, and renders a native `<form>` whose
`onSubmit` calls `form.handleSubmit(form.onSubmit, form.onInvalid)`.

---

## SmartFieldProps

**Type:** `{ name: string, disabled?: boolean, config?: Record<string, unknown> }`

Props for [SmartField](#smartfield).

- `name` — Dot-notation path into the form values (e.g. `"address.city"`,
  `"items.0.name"`).
- `disabled` — Passed through to the component as `FieldRenderProps.disabled`.
- `config` — Arbitrary pass-through for component-specific configuration.

---

## createFormFormat

**Type:** `<TSchema = unknown>(options: { fieldMap: FieldComponentMap, schemaResolver: SchemaAdapter<TSchema> }) => { Form, SmartField, SmartFieldArray, useForm, useFormContext }`

The factory entry point. Creates a React context and wires together all five
exports via closure. Called once per form system configuration:

```ts
const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormFormat({ fieldMap: myComponents, schemaResolver: zodAdapter });
```

The closure captures:

- The React context (for Form → SmartField communication)
- The `FieldComponentMap` (rebound internally as `fieldComponents`, for
  SmartField → component dispatch)

> **Naming collision:** the option is named `fieldMap` but holds a
> `FieldComponentMap`, not a [FieldMap](#fieldmap). See
> [Design Tradeoffs](./CONTEXT.md#fieldmap-is-an-overloaded-name).

---

## SmartField

**Type:** React component, created by `createSmartField(FormContext, fieldComponents)`

Renders a single form field. Reads the [FieldMap](#fieldmap) from React context,
resolves the field definition via [resolveFieldDef](#resolvefielddef), looks up
the component in [FieldComponentMap](#fieldcomponentmap), and renders it inside
an RHF `Controller`.

Props: [SmartFieldProps](#smartfieldprops) — `{ name, disabled?, config? }`.

Behavior on miss: returns `null` (no throw) if the field definition is not found,
or if no component is registered for the resolved `kind`. See
[Design Tradeoffs](./CONTEXT.md#silent-null-on-missing-field-or-component).

Throws if used outside a `<Form>` (no context).

---

## SmartFieldArray

**Type:** React component (static export, not factory-created)

Renders a repeatable field array. Wraps RHF's `useFieldArray`. Schema-agnostic —
it doesn't read the [FieldMap](#fieldmap) and doesn't need the adapter context.
The consumer provides a render function that receives
[SmartFieldArrayRenderProps](#smartfieldarrayrenderprops).

Props: [SmartFieldArrayProps](#smartfieldarrayprops) — `{ name, children }`.

---

## FieldArrayRow

**Type:** `Record<string, unknown> & { id: string }`

The row shape exposed by [SmartFieldArray](#smartfieldarray). Each entry in the
`fields` array is a `FieldArrayRow` — the row's field values plus RHF's stable
`id` (used as `key`). Consumers access named fields off each row inside the
render function.

---

## SmartFieldArrayRenderProps

**Type:** `{ fields: FieldArrayRow[], append, remove, update, move }`

The argument to the [SmartFieldArray](#smartfieldarray) render function:

| Property | Type | Meaning |
|---|---|---|
| `fields` | `FieldArrayRow[]` | The current array rows |
| `append` | `(value) => void` | Add a row at the end |
| `remove` | `(index: number) => void` | Remove a row by index |
| `update` | `(index, value) => void` | Replace a row's values |
| `move` | `(from, to) => void` | Reorder rows |

---

## SmartFieldArrayProps

**Type:** `{ name: string, children: (props: SmartFieldArrayRenderProps) => ReactNode }`

Props for [SmartFieldArray](#smartfieldarray). `name` is the RHF-registered
array path; `children` is a render function receiving the array operations.

---

## resolveFieldDef

**Type:** `(fieldMap: FieldMap, name: string) => FieldDef | undefined`

Walks the [FieldMap](#fieldmap) by splitting the `name` on `.` and traversing
nested `FieldDef.fields`. Skips numeric segments (for RHF array paths like
`"items.0.name"`). Returns `undefined` if the path doesn't resolve —
[SmartField](#smartfield) turns that into `null`.

Currently lives in `smart-field.tsx` but is exported from core — it is a
FieldMap operation, not strictly a UI operation.

---

## useForm

**Type:** hook created by `createUseForm<TSchema>(adapter)`

Returns a `useForm<TValues>(options: UseFormOptions) => FormInstance<TValues>`.
Internally builds the [FieldMap](#fieldmap) via `adapter.buildFieldMap(schema)`,
defaults via `adapter.buildDefaults(schema, fieldMap, defaultValues)`, and a
resolver via `adapter.createResolver(schema)`, then delegates to RHF's `useForm`.
The resolver is cast `as never` to bridge RHF's resolver type — see
[Design Tradeoffs](./CONTEXT.md#the-cast-chain).

---

## useFormContext

**Type:** hook created by `createUseFormContext(FormContext)`

Returns a `useFormContext<TValues>() => FormContextInstance<TValues>`. Reads
RHF's context plus the [FormContextValue](#formcontextvalue) from the factory's
context. Throws `"useFormContext must be used within a Form"` if no context.

---

## deriveDefault

**Type:** `(def: FieldDef) => unknown`

Derives a default value from a [FieldDef](#fielddef) by switching on
[Kind](#kind):

- `optional` → `undefined`
- `string`/`email`/`url`/`password`/`textarea`/`combobox` → `""`
- `number` → `0`
- `boolean`/`checkbox` → `false`
- `enum` → first entry value (or `undefined`)
- `array` → `[]`
- `object` → recursively derived
- default → `undefined`

Currently lives in the Zod adapter but is **schema-agnostic** — it only branches
on `kind`, never touches the schema. Should be moved to core. The switch also
handles UI override kinds (`password`, `textarea`, `combobox`, `checkbox`) that
are not primitive types — adding a new component override requires updating this
function. See
[Design Tradeoffs](./CONTEXT.md#derivedefault-lives-in-the-zod-adapter-but-is-schema-agnostic).

---

## Zod adapter exports

The Zod adapter (`@adistack/forms/adapters/zod`) exports:

- **`zodAdapter`** — a `SchemaAdapter<ZodType>` wiring the three functions below.
- **`buildFieldMap(schema)`** — Zod schema → [FieldMap](#fieldmap). Reads
  `schema._zod.def.shape`; returns `{}` if no shape. See
  [Zod Adapter Internals](./CONTEXT.md#zod-adapter-internals).
- **`buildDefaults(schema, fieldMap, overrides?)`** — [FieldMap](#fieldmap) →
  default values. Ignores `schema` (prefixed `_schema`); iterates `fieldMap`
  calling [deriveDefault](#derivedefault) per field, then overlays `overrides`.
- **`deriveDefault(def)`** — see [deriveDefault](#derivedefault).
- **`createResolver(schema)`** — returns `zodResolver(schema as never)` typed as
  `unknown`.

---

## Nested Objects vs. Nested Forms

**Nested objects** are supported — the [FieldMap](#fieldmap) is recursive, and
`resolveFieldDef` walks nested `fields`. A schema like
`{ address: z.object({ city: z.string() }) }` produces
`<SmartField name="address.city" />`.

**Nested forms** are a different concern — sub-forms with independent
submit/validation lifecycle. Not currently supported.
