# Glossary

Domain vocabulary for `@adistack/forms`. Terms are ordered by dependency —
earlier terms are used in later definitions. Every exported type from
`@adistack/forms` and `@adistack/forms/adapters/zod` is covered here. Names
match the actual source; see [ADR 0001](./adr/0001-docs-describe-actual-code.md).

---

## SchemaAdapter

**Type:** `SchemaAdapter<TSchema>`

The adapter contract. A schema adapter bridges a validation library (e.g., Zod,
Yup, Valibot) to the form system. It has three methods:

1. **`buildFieldMap(schema)`** — Introspects the schema and produces a
   [SchemaTree](#schematree).
2. **`buildDefaults(schema, fieldMap, overrides?)`** — Derives default values from
   the [SchemaTree](#schematree) and optional overrides. The `schema` parameter is
   kept for adapters that need it, though the Zod implementation prefixes it
   `_schema` and only uses `fieldMap` + `overrides`.
3. **`createResolver(schema)`** — Creates a `react-hook-form`-compatible resolver
   for schema-level validation. Returns `Resolver` (no generic) — the Zod
   adapter delegates directly to `zodResolver(schema)` with no cast.

The adapter is the **only** place that knows about a specific validation
library's internals. Everything downstream operates on the adapter's normalized
output.

---

## SchemaTree

**Type:** `Record<string, FieldDef>`

The root of the schema-derived metadata tree. Each key is a top-level field name;
each value is a [FieldDef](#fielddef) node. The tree is recursive —
`FieldDef.elementFields` contains nested `SchemaTree` structures for objects and arrays.

The SchemaTree is produced by the adapter and consumed by the UI layer. It is the
**single source of truth** for what fields exist, their types, constraints, and
nesting structure. Once produced, the rest of the system never touches the raw
schema again.

---

## FieldDef

**Type:** `FieldDef`

A node in the [SchemaTree](#schematree). Represents one field's resolved metadata
after adapter introspection. Key properties:

| Property | Type | Meaning |
|---|---|---|
| `kind` | `string` | The resolved field kind — used as the dispatch key into [FieldComponentMap](#fieldcomponentmap). See [Kind](#kind). |
| `optional` | `boolean` | Whether the schema marks this field as optional. |
| `required` | `boolean?` | Derived as `!optional` — a field is "required" when it cannot be omitted. See [Design Tradeoffs](./CONTEXT.md#required-is-a-leaky-derivation). |
| `meta` | `FieldMeta?` | User-supplied annotations from the schema (label, placeholder, description, etc.). |
| `checks` | `FieldCheck[]?` | Adapter-normalized validation constraints. See [FieldCheck](#fieldcheck). |
| `entries` | `Record<string, string>?` | For enum kinds — the value-label pairs. |
| `elementFields` | `SchemaTree?` | Nested fields. For objects, these are the child properties. For arrays, these are the **element's** child properties. |
| `min` | `number?` | Derived minimum constraint (length for strings/arrays, value for numbers). |
| `max` | `number?` | Derived maximum constraint. |

---

## Kind

**Type:** `string`

The `kind` property on [FieldDef](#fielddef). A flat, single-string value that
serves as the dispatch key into the [FieldComponentMap](#fieldcomponentmap). The
adapter resolves all schema nuances to a single `kind`.

Possible kinds (everything the Zod adapter can emit):

- **Primitive types:** `"string"`, `"number"`, `"boolean"`, `"date"`
- **Format variants:** `"email"`, `"url"`
- **Structural types:** `"object"`, `"array"`, `"enum"`

**Unsupported types:** `record`, `literal`, and unrecognized Zod types throw an
error rather than falling through to `"unknown"`. The Zod adapter never emits
`"unknown"` — `resolveFieldDef` still rejects `kind === "unknown"` for manually
built field maps.

The `kind` is intentionally flat — the adapter is responsible for collapsing
type/format into a single string. This keeps the
[FieldComponentMap](#fieldcomponentmap) lookup simple.

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

**Type:** `{ label?: string; placeholder?: string; description?: string; [key: string]: unknown }`

User-supplied annotations attached to a schema field. The `[key: string]: unknown`
index signature allows adapters to carry custom metadata without changing the
core type.

---

## FieldComponentMap

**Type:** `Record<string, React.ComponentType<FieldComponentProps>>`

The UI dispatch table. Maps [Kind](#kind) strings to React components. This is
the **only** place where UI components are registered. When
[SmartField](#smartfield) renders, it looks up `fieldComponents[def.kind]` and
passes a [FieldComponentProps](#fieldcomponentprops) object.

This is provided by the consumer at `createFormSystem` time and closed over by
`createSmartField`. It is **not** available in React context — components cannot
be swapped at runtime.

> **Naming collision (resolved):** `createFormSystem`'s option was renamed from
> `fieldMap` to `fieldComponents`, eliminating the collision with
> `FormContextValue.fieldMap` (`SchemaTree`). See
> [Design Tradeoffs](./CONTEXT.md#fieldmap-is-an-overloaded-name).

---

## FieldComponentProps

**Type:** `FieldDef & { name, value?, onChange, onBlur, ref, error?, disabled?, config? }`

The input contract for components in the [FieldComponentMap](#fieldcomponentmap).
Spreads all of [FieldDef](#fielddef) and adds `react-hook-form` control bindings:

| Added property | Type | Source |
|---|---|---|
| `name` | `string` | The field's RHF-registered path (dot-notation) |
| `value` | `unknown?` | Current field value from RHF |
| `onChange` | `(value: unknown) => void` | RHF change handler |
| `onBlur` | `() => void` | RHF blur handler |
| `ref` | `React.RefCallback<HTMLElement>` | RHF ref for focus management |
| `error` | `string?` | Current validation error message (`getFieldState(name, formState).error?.message`) |
| `disabled` | `boolean?` | From SmartField's `disabled` prop |
| `config` | `Record<string, unknown>?` | From SmartField's `config` prop — arbitrary pass-through |

---

## FormContextValue

**Type:** `{ fieldMap: SchemaTree }`

The value held in the form's React context. Only carries the
[SchemaTree](#schematree) — this is all the UI layer needs from the schema. The
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

**Type:** `UseFormOptions<TSchema, TValues extends FieldValues = FieldValues>`

Configuration for the `useForm` hook. The `schema` is the raw schema object (Zod
schema, etc.) — it's passed to the [SchemaAdapter](#schemaadapter) to produce the
[SchemaTree](#schematree), defaults, and resolver. `defaultValues` overlays the
adapter-derived defaults. `onSubmit` is `(values: TValues) => void`;
`onInvalid` is an optional `(errors: Record<string, unknown>) => void`.

```ts
type UseFormOptions<TSchema, TValues extends FieldValues = FieldValues> = {
  schema: TSchema;
  onSubmit: (values: TValues) => void;
  onInvalid?: (errors: Record<string, unknown>) => void;
  defaultValues?: Record<string, unknown>;
  validationMode?: ValidationMode;
}
```

---

## FormContextInstance

**Type:** `UseFormReturn<FieldValues> & { fieldMap: SchemaTree }`

What [`useFormContext`](#useformcontext) returns. RHF's full return (over
`FieldValues`) plus the [SchemaTree](#schematree). Not generic — deep field
components read form state without needing to know the submit value type.
Deliberately **omits** submit handlers — deep field components shouldn't trigger
submit. `useFormContext` throws if used outside a `<Form>`.

---

## FormInstance

**Type:** `FormContextInstance & { onSubmit: (values: TValues) => void, onInvalid?: (errors: Record<string, unknown>) => void }`

What [`useForm`](#useform) returns. Extends
[FormContextInstance](#formcontextinstance) with the submit callbacks
(`onSubmit`, optional `onInvalid`), generic over `TValues extends FieldValues`
(defaults to `FieldValues`), because only the form author wires those. This is
what `<Form>` accepts as its `form` prop.

```ts
type FormInstance<TValues extends FieldValues = FieldValues> =
  FormContextInstance & {
    onSubmit: (values: TValues) => void;
    onInvalid?: (errors: Record<string, unknown>) => void;
  }
```

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
- `disabled` — Passed through to the component as `FieldComponentProps.disabled`.
- `config` — Arbitrary pass-through for component-specific configuration.

---

## createFormSystem

**Type:** `<TSchema>(options: { fieldComponents: FieldComponentMap, schemaResolver: SchemaAdapter<TSchema> }) => { Form, SmartField, SmartFieldArray, useForm, useFormContext }`

The factory entry point. Creates a React context and wires together all five
exports via closure. Called once per form system configuration:

```ts
const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormSystem({ fieldComponents: myComponents, schemaResolver: zodAdapter });
```

The closure captures:

- The React context (for Form → SmartField communication)
- The `FieldComponentMap` (passed to `createSmartField` for component dispatch)

Throws [`createFormError`](#createformerror) if `schemaResolver` is not provided
or if `fieldComponents` is missing/empty.



---

## SmartField

**Type:** React component, created by `createSmartField(FormContext, fieldComponents)`

Renders a single form field. Reads RHF context plus the [SchemaTree](#schematree)
from React context (throws `createFormError("SmartField must be used within a <Form>")`
if no context), resolves the field definition via [resolveFieldDef](#resolvefielddef),
looks up the component in [FieldComponentMap](#fieldcomponentmap), and renders it
with RHF bindings via `register(name)` (`ref`, `onChange`, `onBlur`) and
`getFieldState(name, formState).error?.message` (`error`). No `<Controller>` is
used; `onChange`/`onBlur` adapt the component value to
`{ target: { name, value }, type }` events. There is no `meta.component` kind
override — dispatch is always `fieldComponents[def.kind]`.

Props: [SmartFieldProps](#smartfieldprops) — `{ name, disabled?, config? }`.

Behavior on miss: SmartField catches `resolveFieldDef` errors (field not found
or `kind === "unknown"`), calls [`devWarn`](#devwarn) with a diagnostic message,
and renders `null`. If no component is registered for the resolved `kind`,
SmartField also calls [`devWarn`](#devwarn) and renders `null`.

Throws if used outside a `<Form>` (no context).

---

## SmartFieldArray

**Type:** React component (static export, not factory-created)

Renders a repeatable field array. Wraps RHF's `useFieldArray`. Schema-agnostic —
it doesn't read the [SchemaTree](#schematree) and doesn't need the adapter context.
The consumer provides a render function that receives
[SmartFieldArrayRenderProps](#smartfieldarrayrenderprops).

Props: [SmartFieldArrayProps](#smartfieldarrayprops) — `{ name, children }`.

---

## FieldArrayRow

**Type:** `Record<string, unknown> & { id: string }`

The row shape exposed by [SmartFieldArray](#smartfieldarray). Each entry in the
`fields` array is a `FieldArrayRow` — the row's field values plus RHF's stable
`id` (used as `key`). Consumers access named fields off each row inside the
render function. Defined in `ui/smart-field-array.tsx` but not re-exported from
`@adistack/forms` or `@adistack/forms/ui` — infer it from render props or import
the file directly.

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

**Type:** `(fieldMap: SchemaTree, name: string) => FieldDef`

Walks the [SchemaTree](#schematree) by splitting the `name` on `.` and traversing
nested `FieldDef.elementFields`. Skips empty segments and numeric segments (for
RHF array paths like `"items.0.name"`). Throws `"No field definition found for \"<name>\""` if the
path doesn't resolve, or `"Unsupported field type for \"<name>\""` if the
resolved kind is `"unknown"`.

Lives in `core/resolve-field-def.ts` and is exported from `src/index.ts` (the
`@adistack/forms` entrypoint).

---

## useForm

**Type:** hook created by `createUseForm<TSchema>(adapter)`

Returns a `useForm<TValues>(options: UseFormOptions) => FormInstance<TValues>`.
Internally builds the [SchemaTree](#schematree) via `adapter.buildFieldMap(schema)`,
defaults via `adapter.buildDefaults(schema, fieldMap, defaultValues)`, and a
resolver via `adapter.createResolver(schema)`, then delegates to RHF's `useForm`
with `mode: validationMode` (defaults to `"onBlur"`) and
`reValidateMode: "onChange"`.

---

## useFormContext

**Type:** hook created by `createUseFormContext(FormContext)`

Returns a `useFormContext() => FormContextInstance`. Reads
RHF's context plus the [FormContextValue](#formcontextvalue) from the factory's
context. Throws `"useFormContext must be used within a <Form>"` if no context.

---

## deriveDefault

**Type:** `(def: FieldDef) => unknown` (private helper in `build-defaults.ts`)

Derives a default value from a [FieldDef](#fielddef) by switching on
[Kind](#kind). Returns `undefined` for optional fields. Handles Zod-produced
kinds (`string`/`email`/`url` → `""`, `number` → `0`, `boolean` → `false`,
`array` → `[]`, `object` → recursive, `enum` → first entry value) and returns
`undefined` for `date` and anything else. The switch also contains
`password`/`textarea`/`combobox` → `""` and `checkbox` → `false` branches that
are unreachable via the Zod adapter (it never emits those kinds). Called
recursively for nested objects. Used internally by [buildDefaults](#builddefaults).

---

## createFormError

**Type:** `(message: string, details?: string[]) => Error`

Creates a structured error with the `[@adistack/forms]` prefix. If `details` are
provided, they're appended as indented bullet lines (`→ detail`). Used throughout
the codebase for user-facing errors (missing schemaResolver, unsupported Zod
types, missing field definitions, etc.).

Lives in `errors.ts`. Not exported from any entrypoint — internal only.

---

## devWarn

**Type:** `(message: string, details?: string[]) => void`

Emits a `console.warn` with the `[@adistack/forms]` prefix, but **only in
non-production** environments (skipped when `NODE_ENV === "production"`). Used
by [SmartField](#smartfield) when a field definition is not found or no component
is registered for a kind — these are recoverable conditions (render `null`)
rather than hard errors.

Lives in `errors.ts`. Not exported from any entrypoint — internal only.

---

## Zod adapter exports

The Zod adapter (`@adistack/forms/adapters/zod`) exports:

- **`zodAdapter`** — a `SchemaAdapter<ZodType>` wiring the three functions below.
- **`buildFieldMap(schema, parentPath?)`** — Zod schema → [SchemaTree](#schematree). Reads
  `schema._zod.def.shape`; returns `{}` if no shape. `parentPath` is used
  internally for recursive calls and error messages (defaults to `""`). See
  [Zod Adapter Internals](./CONTEXT.md#zod-adapter-internals).
- **`buildDefaults(schema, fieldMap, overrides?)`** — [SchemaTree](#schematree) →
  default values. Ignores `schema` (prefixed `_schema`); iterates `fieldMap`
  calling `deriveDefault` (private helper) per field, then overlays `overrides`.
- **`createResolver(schema)`** — returns `zodResolver(schema)` typed as
  `Resolver` (no generic, no cast).

---

## Nested Objects vs. Nested Forms

**Nested objects** are supported — the [SchemaTree](#schematree) is recursive, and
`resolveFieldDef` walks nested `elementFields`. A schema like
`{ address: z.object({ city: z.string() }) }` produces
`<SmartField name="address.city" />`.

**Nested forms** are a different concern — sub-forms with independent
submit/validation lifecycle. Not currently supported.
