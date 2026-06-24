# Glossary

Domain vocabulary for `@adityab/forms`. Terms are ordered by dependency — earlier terms are used in later definitions.

---

## SchemaAdapter

**Type:** `SchemaAdapter<TSchema>`

The adapter contract. A schema-adapter bridges a validation library (e.g., Zod, Yup, Valibot) to the form system. It has three methods:

1. **`buildFieldMap(schema)`** — Introspects the schema and produces a [SchemaTree](#schematree).
2. **`buildDefaults(schema, fieldMap, overrides?)`** — Derives default values from the [SchemaTree](#schematree) and optional overrides. The `schema` parameter is kept for adapters that need it, though the Zod adapter currently only uses the tree.
3. **`createResolver(schema)`** — Creates a `react-hook-form`-compatible resolver for schema-level validation. The adapter is responsible for returning a properly typed resolver — the `as never` cast should live inside the adapter, not in core.

The adapter is the **only** place that knows about a specific validation library's internals. Everything downstream operates on the adapter's normalized output.

---

## SchemaTree

**Type:** `Record<string, FieldDef>` (currently named `FieldMap`; renaming to `SchemaTree`)

The root of the schema-derived metadata tree. Each key is a top-level field name; each value is a [FieldDef](#fielddef) node. The tree is recursive — `FieldDef.fields` contains nested `SchemaTree` structures for objects and arrays.

The SchemaTree is produced by the adapter and consumed by the UI layer. It is the **single source of truth** for what fields exist, their types, constraints, and nesting structure.

---

## FieldDef

**Type:** `FieldDef`

A node in the [SchemaTree](#schematree). Represents one field's resolved metadata after adapter introspection. Key properties:

| Property | Type | Meaning |
|---|---|---|
| `kind` | `string` | The resolved field kind — used as the dispatch key into [FieldComponentMap](#fieldcomponentmap). See [Kind](#kind). |
| `optional` | `boolean` | Whether the schema marks this field as optional. |
| `required` | `boolean` | **Currently a leaky abstraction** — derived as `!optional && min != null`, which conflates "has a min constraint" with "must be provided". Should mean "this field cannot be omitted". |
| `meta` | `FieldMeta?` | User-supplied annotations from the schema (label, placeholder, description, etc.). |
| `checks` | `FieldCheck[]?` | Adapter-normalized validation constraints. See [FieldCheck](#fieldcheck). |
| `entries` | `Record<string, string>?` | For enum kinds — the value-label pairs. |
| `fields` | `SchemaTree?` | Nested fields. For objects, these are the child properties. For arrays, these are the **element's** child properties (naming TBD — should convey "element fields", not "the array's fields"). |
| `min` | `number?` | Derived minimum constraint (length for strings/arrays, value for numbers). |
| `max` | `number?` | Derived maximum constraint. |

---

## Kind

**Type:** `string`

The `kind` property on [FieldDef](#fielddef). A flat, single-string value that serves as the dispatch key into the [FieldComponentMap](#fieldcomponentmap). The adapter resolves all schema nuances to a single `kind`.

Possible kinds include:

- **Primitive types:** `"string"`, `"number"`, `"boolean"`, `"date"`
- **Format variants:** `"email"`, `"url"`
- **Structural types:** `"object"`, `"array"`, `"enum"`
- **UI overrides:** `"password"`, `"textarea"`, `"combobox"`, `"checkbox"`
- **Fallback:** `"unknown"` — currently used when the adapter can't resolve a type. **Should throw instead** of silently producing missing fields.

The `kind` is intentionally flat — the adapter is responsible for collapsing type/format/component into a single string. This keeps the [FieldComponentMap](#fieldcomponentmap) lookup simple.

**Known coupling:** The `meta.component` override on Zod schemas allows schema authors to force a specific `kind` (e.g., `.meta({ component: 'password' })`). This couples the data contract to the UI layer. **Should move outside the schema** — the override should happen at the FieldComponentMap level or via a mapping config.

---

## FieldCheck

**Type:** `{ type: string; value?: unknown }`

An adapter-normalized validation constraint. The adapter translates schema-specific checks (e.g., Zod's `min_length`, `greater_than`) into a uniform `{ type, value? }` format that components can consume for hints (e.g., "show a min-length indicator").

The loose `{ type: string; value?: unknown }` shape is intentional — the adapter is the normalization boundary, and the core doesn't need to know about specific check types.

---

## FieldMeta

**Type:** `{ label?: string; placeholder?: string; description?: string; component?: string; [key: string]: unknown }`

User-supplied annotations attached to a schema field. The `component` property is the UI override for [Kind](#kind) — this coupling should be removed (see Kind entry).

The `[key: string]: unknown` index signature allows adapters to carry custom metadata without changing the core type.

---

## FieldComponentMap

**Type:** `Record<string, React.ComponentType<FieldComponentProps>>`

The UI dispatch table. Maps [Kind](#kind) strings to React components. This is the **only** place where UI components are registered. When [SmartField](#smartfield) renders, it looks up `fieldComponentMap[def.kind]` and passes a [FieldComponentProps](#fieldcomponentprops) object.

This is provided by the consumer at `createFormSystem` time and closed over by `createSmartField`. It is **not** available in React context — components cannot be swapped at runtime.

---

## FieldComponentProps

**Type:** `FieldDef & { name, value, onChange, onBlur, ref, error?, disabled?, config? }` (currently named `FieldRenderProps`; renaming to `FieldComponentProps`)

The input contract for components in the [FieldComponentMap](#fieldcomponentmap). Spreads all of [FieldDef](#fielddef) and adds `react-hook-form` control bindings:

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

## createFormSystem

**Type:** `(options: { fieldMap: FieldComponentMap, schemaResolver: SchemaAdapter<TSchema> }) => { Form, SmartField, SmartFieldArray, useForm, useFormContext }` (currently named `createFormFormat`; renaming to `createFormSystem`)

The factory entry point. Creates a React context and wires together all five exports via closure. Called once per form system configuration:

```ts
const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormSystem({ fieldMap: myComponents, schemaResolver: zodAdapter });
```

The closure captures:
- The React context (for Form → SmartField communication)
- The FieldComponentMap (for SmartField → component dispatch)

---

## SmartField

**Type:** React component, created by `createSmartField(FormContext, fieldComponents)`

Renders a single form field. Reads the [SchemaTree](#schematree) from React context, resolves the field definition via [resolveFieldDef](#resolvefielddef), looks up the component in [FieldComponentMap](#fieldcomponentmap), and renders it inside an RHF `Controller`.

Props: `{ name: string, disabled?: boolean, config?: Record<string, unknown> }`

- `name` — Dot-notation path into the form values (e.g., `"address.city"`, `"items.0.name"`)
- `disabled` — Passed through to the component
- `config` — Arbitrary pass-through for component-specific configuration

---

## SmartFieldArray

**Type:** React component (static export, not factory-created)

Renders a repeatable field array. Wraps RHF's `useFieldArray`. Schema-agnostic — it doesn't read the [SchemaTree](#schematree) and doesn't need the adapter context. The consumer provides a render function that receives `{ fields, append, remove, update, move }`.

---

## resolveFieldDef

**Type:** `(fieldMap: SchemaTree, name: string) => FieldDef | undefined`

Walks the [SchemaTree](#schematree) by splitting the `name` on `.` and traversing nested `FieldDef.fields`. Skips numeric segments (for RHF array paths like `"items.0.name"`).

**Should return a result type** instead of `undefined`, so consumers can distinguish "not found" from other states.

Currently lives in `smart-field.tsx` but is exported from core — it's a SchemaTree operation, not a UI operation.

---

## FormContextValue

**Type:** `{ fieldMap: SchemaTree }` (property will rename to `schemaTree`)

The value held in the form's React context. Only carries the [SchemaTree](#schematree) — this is all the UI layer needs from the schema. The [FieldComponentMap](#fieldcomponentmap) is closed over by the factory, not in context.

---

## UseFormOptions

**Type:** `{ schema, onSubmit, onInvalid?, defaultValues?, validationMode? }`

Configuration for the `useForm` hook. The `schema` is the raw schema object (Zod schema, etc.) — it's passed to the [SchemaAdapter](#schemaadapter) to produce the [SchemaTree](#schematree), defaults, and resolver.

---

## deriveDefault

**Type:** `(def: FieldDef) => unknown`

Derives a default value from a [FieldDef](#fielddef) by switching on [Kind](#kind). Currently lives in the Zod adapter but is **schema-agnostic** — it only branches on `kind`, never touches the schema. Should be moved to core.

**Known fragility:** The switch handles UI override kinds (`"password"`, `"textarea"`, `"combobox"`, `"checkbox"`) that are not primitive types. Adding a new component override requires updating this function. Moving to core and decoupling `meta.component` from `kind` would fix this.

---

## Nested Objects vs. Nested Forms

**Nested objects** are supported — the [SchemaTree](#schematree) is recursive, and `resolveFieldDef` walks nested `fields`. A schema like `{ address: z.object({ city: z.string() }) }` produces `SmartField name="address.city"`.

**Nested forms** are a different concern — sub-forms with independent submit/validation lifecycle. Not currently supported, but should be planned for as a distinct feature.
