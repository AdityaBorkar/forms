# Glossary

Domain vocabulary for `@adistack/forms`. Terms are ordered by dependency —
earlier terms are used in later definitions. Every exported type from
`@adistack/forms`, `@adistack/forms/adapters/zod`, and
`@adistack/forms/adapters/valibot` is covered here. Names match the actual
source. Architecture rationale lives in [ARCHITECTURE.md](./ARCHITECTURE.md);
tight domain language lives in [CONTEXT.md](./CONTEXT.md).

---

## SchemaAdapter

**Type:** `SchemaAdapter<TSchema>`

The adapter contract. Bridges one validation library to the form system:

1. **`buildFieldMap(schema)`** — Introspects the schema, produces a
   [SchemaTree](#schematree).
2. **`buildDefaults(fieldMap, overrides?)`** — Derives
   `DefaultValues<FieldValues>` from the [SchemaTree](#schematree), deep-merging
   `overrides`. Takes no `schema` parameter (see
   [buildDefaults](#builddefaults-shared)).
3. **`createResolver(schema)`** — Creates an RHF-compatible `Resolver` for
   schema-level validation.

The adapter is the **only** place that knows about a validation library's
internals. Everything downstream operates on normalized output.

---

## SchemaTree

**Type:** `Record<string, FieldDef>`

The root metadata tree. Each key is a top-level field name; each value is a
[FieldDef](#fielddef). Recursive via `FieldDef.elementFields` /
`FieldDef.elementDef`. Produced by the adapter, carried in React context as
`fieldMap`, consumed by the UI layer. Single source of truth — the raw schema
is never touched again downstream.

---

## FieldDef

**Type:** `FieldDef`

One node's resolved metadata:

| Property | Type | Meaning |
|---|---|---|
| `kind` | [FieldKind](#fieldkind) | Dispatch key into [FieldComponentMap](#fieldcomponentmap) (already includes any `meta.component` override) |
| `optional` | `boolean` | Whether the value may be `undefined`. Single source of truth — derive "required" in UI as `!optional`. There is no stored `required` field. |
| `meta` | [FieldMeta](#fieldmeta)? | User annotations (label, placeholder, `component` override, …) |
| `checks` | [FieldCheck](#fieldcheck)[]? | Normalized validation constraints |
| `entries` | `Record<string, string>?` | Enum value-label pairs |
| `elementFields` | [SchemaTree](#schematree)? | Child fields: object properties, or array-element children (hoisted for index-less lookup) |
| `elementDef` | `FieldDef?` | Array element definition — present whenever the element type is known, including primitives (`z.array(z.string())` yields a `string` elementDef) |
| `min` | `number?` | Derived minimum (length for strings/arrays, value for numbers) |
| `max` | `number?` | Derived maximum |

---

## FieldKind

**Type:** `FieldKind = KnownFieldKind | (string & {})`

The `kind` on [FieldDef](#fielddef). Known kinds get autocomplete; any other
non-empty string stays allowed (custom variants via
[`meta.component`](#fieldmeta)). See [Kind](#kind).

## Kind

The runtime value of `FieldDef.kind`. Base kinds per adapter:

- Zod emits: `string|number|boolean|date|email|url|object|array|enum`
- Valibot emits: `string|number|boolean|date|email|url|object|array|enum`
  (`picklist`/`enum` both normalize to `enum`)

`meta.component` replaces the base kind with any string (e.g. `"textarea"`,
`"password"`, `"slider"`, `"switch"`, `"checkbox"`, `"combobox"`, or a fully
custom widget name). The adapter never emits `"unknown"`; custom/unknown kinds
resolve at render time (missing component → `devWarn` + `null`).

## KnownFieldKind

**Type:** union of 15 first-class kinds

`string|email|url|password|textarea|combobox|number|slider|boolean|checkbox|switch|enum|array|object|date`

---

## FieldCheck

**Type:** `{ type: FieldCheckType; value?: unknown }`

Normalized validation constraint for component hints. Loose shape is
intentional — the adapter is the normalization boundary.

## KnownFieldCheckType

**Type:** `"min"|"max"|"gt"|"lt"|"email"|"url"|"integer"|"safe_integer"`

## FieldCheckType

**Type:** `KnownFieldCheckType | (string & {})`

---

## FieldMeta

**Type:** `{ label?: string; placeholder?: string; description?: string; component?: string; [key: string]: unknown }`

User annotations from the schema. `component`, when a non-empty string,
replaces the dispatch kind (see [Kind](#kind) and `resolveKind`). The index
signature carries custom metadata without changing the core type. Zod reads
`.meta()`; Valibot merges `v.metadata()` plus `v.title()` → `label`/`title`
and `v.description()`.

---

## FieldComponentMap

**Type:** `Record<string, React.ComponentType<FieldComponentProps>>`

Kind-to-component dispatch table, supplied once to `createFormSystem` and
closed over (not in React context, not swappable at runtime).

---

## FieldComponentProps

**Type:** `{ def: FieldDef; name: string; value?: unknown; onChange: (value: unknown) => void; onBlur: () => void; ref: React.RefCallback<HTMLElement>; error?: string; disabled?: boolean; config?: Record<string, unknown> }`

Input contract for [FieldComponentMap](#fieldcomponentmap) components:

| Property | Source |
|---|---|
| `def` | Resolved [FieldDef](#fielddef) (read `def.kind`, `def.meta`, `def.min`/`max`, `def.entries`, `def.optional`) |
| `name` | RHF dotted path |
| `value` | Current value via `useController` (omitted when `undefined`) |
| `onChange` | `(value: unknown) => void` — takes the value directly, not an event |
| `onBlur` | `() => void` |
| `ref` | Focus ref |
| `error` | `fieldState.error?.message` |
| `disabled` | From [SmartFieldProps](#smartfieldprops) |
| `config` | From [SmartFieldProps](#smartfieldprops), arbitrary pass-through |

---

## FormContextValue

**Type:** `{ fieldMap: SchemaTree }`

React context value. Carries only the [SchemaTree](#schematree); the
[FieldComponentMap](#fieldcomponentmap) stays closed over in the factory.

---

## ValidationMode

**Type:** `"onBlur" | "onChange" | "onSubmit" | "onTouched" | "all"`

When RHF triggers validation. `useForm` defaults to `"onBlur"`.

## ReValidateMode

**Type:** `"onChange" | "onBlur" | "onSubmit"`

When RHF re-triggers validation after a submit attempt. `useForm` defaults to
`"onChange"`.

---

## UseFormOptions

**Type:** `UseFormOptions<TSchema, TValues extends FieldValues = FieldValues>`

```ts
type UseFormOptions<TSchema, TValues extends FieldValues = FieldValues> = {
  schema: TSchema;
  onSubmit: (values: TValues) => void;
  onInvalid?: (errors: FieldErrors<TValues>) => void;
  defaultValues?: DefaultValues<TValues>;
  validationMode?: ValidationMode;
  reValidateMode?: ReValidateMode;
};
```

`schema` feeds the adapter; `defaultValues` deep-merge over derived defaults.

---

## FormContextInstance

**Type:** `FormContextInstance<TValues extends FieldValues = FieldValues> = UseFormReturn<TValues> & { fieldMap: SchemaTree }`

What [`useFormContext`](#useformcontext) returns. Generic over `TValues`
(default `FieldValues`).

---

## FormInstance

**Type:** `FormInstance<TValues extends FieldValues = FieldValues> = UseFormReturn<TValues, unknown, TValues> & { fieldMap: SchemaTree; onSubmit: (values: TValues) => void; onInvalid?: (errors: FieldErrors<TValues>) => void }`

What [`useForm`](#useform) returns. Extends the RHF return with the
[SchemaTree](#schematree) plus submit callbacks. This is what `<Form>` accepts.

---

## FormProps

**Type:** `{ form: FormInstance<TValues>; className?: string; children?: ReactNode }`

Props for `<Form>`. Wraps RHF `FormProvider`, sets `{ fieldMap }` context, and
renders `<form onSubmit={preventDefault + handleSubmit(onSubmit, onInvalid)}>`.

---

## SmartFieldProps

**Type:** `{ name: string; disabled?: boolean; config?: Record<string, unknown> }`

- `name` — dotted path (`"address.city"`, `"tasks.0.title"`).
- `disabled` — forwarded to `useController` and to the component.
- `config` — arbitrary pass-through to the component.

---

## CreateFormSystemOptions

**Type:** `{ fieldComponents: FieldComponentMap; schemaResolver: SchemaAdapter<TSchema> }`

Input to [`createFormSystem`](#createformsystem).

## FormSystem

**Type:** `{ Form; SmartField; SmartFieldArray; useForm; useFormContext }`

Closed factory result. `Form`/`SmartField`/`SmartFieldArray` are bound to the
same React context; `useForm` is bound to the adapter.

## createFormSystem

**Type:** `<TSchema>(options: CreateFormSystemOptions<TSchema>) => FormSystem<TSchema>`

```ts
const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormSystem({ fieldComponents: myComponents, schemaResolver: zodAdapter });
```

Throws [`createFormError`](#createformerror) when `schemaResolver` is missing,
when `fieldComponents` is missing/empty, or when any registered value is not a
component function.

---

## SmartField

Factory-bound component (`createSmartField(FormContext, fieldComponents)`).
Reads the [SchemaTree](#schematree) from context (throws outside `<Form>`),
resolves via [resolveFieldDef](#resolvefielddef), dispatches
`fieldComponents[def.kind]` through `useController({ name, disabled })`.
`def.kind` already includes any `meta.component` override (applied by the
adapter via `resolveKind`).

Miss behavior: `resolveFieldDef` failure or unregistered kind → [`devWarn`](#devwarn)
+ render `null`. Outside `<Form>` → throw.

---

## SmartFieldArray

Factory-bound component is canonical
(`createSmartFieldArray(FormContext)` — requires `<Form>` context, throws
outside it). Thin wrapper over RHF `useFieldArray`; schema-agnostic. Props:
[SmartFieldArrayProps](#smartfieldarrayprops).

A static unbound `SmartFieldArray` (same render behavior, no context check) is
also exported from `@adistack/forms` and `@adistack/forms/ui` (see
[SmartFieldArray exports](#smartfieldarray-exports)).

---

## FieldArrayRow

**Type:** `Record<string, unknown> & { id: string }`

One row in [SmartFieldArray](#smartfieldarray) `fields` — row values plus RHF's
stable `id` (use as `key`). Defined in `ui/smart-field-array.tsx`, **not**
re-exported from any entrypoint — infer from render props.

---

## SmartFieldArrayRenderProps

**Type:** `{ fields: FieldArrayRow[]; append; remove; update; move }`

| Property | Meaning |
|---|---|
| `fields` | Current rows |
| `append` | `(value: Record<string, unknown>) => void` |
| `remove` | `(index: number) => void` |
| `update` | `(index: number, value: Record<string, unknown>) => void` |
| `move` | `(from: number, to: number) => void` |

---

## SmartFieldArrayProps

**Type:** `{ name: string; children: (props: SmartFieldArrayRenderProps) => ReactNode }`

`name` is the array path; `children` is a render function.

---

## SmartFieldArray exports

Two components share the name:

- **Bound (canonical):** returned by `createFormSystem`, requires `<Form>`
  context. Use this in factory-based apps.
- **Static:** `SmartFieldArray` exported from `@adistack/forms` and
  `@adistack/forms/ui`. Same `useFieldArray` behavior without the context
  guard. Useful outside a factory system or in the `ui` entrypoint.

Both take [SmartFieldArrayProps](#smartfieldarrayprops).

---

## resolveFieldDef

**Type:** `(fieldMap: SchemaTree, name: string) => FieldDef`

Splits `name` on `.` and walks `elementFields`/`elementDef`:

- Empty name or empty segments (`"addr..city"`, leading/trailing dots) throw.
- Numeric segments into `kind === "array"` step into `elementDef` (or stay on
  the array for legacy defs without element detail). Numeric keys on non-arrays
  look up literally.
- `arr.city` resolves via the array's `elementFields`/`elementDef.elementFields`
  without an index; explicit `arr.0.city` is preferred.
- Unknown roots/segments throw `No field definition found for "<name>"` with
  available-field hints.

No `"unknown"`-kind rejection — custom kinds are render-time concerns. Lives in
`core/resolve-field-def.ts`, exported from `@adistack/forms`.

---

## useForm

Factory-bound hook (`createUseForm(adapter)`):
`<TValues>(options: UseFormOptions<TSchema, TValues>) => FormInstance<TValues>`.
Builds `fieldMap` via `buildFieldMap(schema)`, defaults via
`buildDefaults(fieldMap, defaultValues)`, resolver via `createResolver(schema)`,
delegates to RHF with `mode: validationMode ?? "onBlur"`,
`reValidateMode: reValidateMode ?? "onChange"`.

---

## useFormContext

Factory-bound hook (`createUseFormContext(FormContext)`):
`<TValues>() => FormContextInstance<TValues>`. Merges RHF context with
`{ fieldMap }`. Throws outside `<Form>`.

---

## buildDefaults (shared)

**Signature:** `buildDefaults(fieldMap: SchemaTree, overrides?: Record<string, unknown>) => DefaultValues<FieldValues>`

Shared implementation (`adapters/shared/defaults.ts`), re-exported by both
adapters. Derives per-field defaults via private `deriveDefault`, then
deep-merges `overrides` (nested objects merge, not clobber).

## deriveDefault

Private helper in `adapters/shared/defaults.ts`. `optional` → `undefined`
first, then: `string/email/url/password/textarea/combobox` → `""`;
`number/slider` → `0`; `boolean/checkbox/switch` → `false`; `enum` → first entry
value; `array` → `[]`; `object` → recursive (or `undefined` without
`elementFields`); `date`/custom/`unknown` → `undefined`. `meta.component`
variants are reachable (e.g. `component: "password"` still defaults to `""`).

---

## resolveKind / mergeMeta / makeFieldDef

Internal adapter helpers (`adapters/shared/field-def.ts`, re-exported from
`adapters/shared` but not from public entrypoints):

- **`resolveKind(baseKind, meta?)`** — non-empty `meta.component` wins, else
  `baseKind`.
- **`mergeMeta(inner?, outer?)`** — shallow merge, outer (wrapper) keys win.
- **`makeFieldDef(base, optional, meta?)`** — applies `resolveKind` and attaches
  `meta` when present.

---

## createFormError

**Type:** `(message: string, details?: string[]) => Error`

`[@adistack/forms]`-prefixed error with `→ detail` bullet lines. Internal
(`errors.ts`, not exported).

---

## devWarn

**Type:** `(message: string, details?: string[]) => void`

Dev-only `console.warn` (`[@adistack/forms]` prefix, skipped when
`NODE_ENV === "production"`), deduplicated per message. Used for recoverable
`SmartField` misses (render `null`). Internal (`errors.ts`, not exported).
`resetDevWarnings()` clears the dedupe set (tests only).

---

## Zod adapter exports

`@adistack/forms/adapters/zod`:

- **`zodAdapter`** — `SchemaAdapter<ZodType>` wiring the three below.
- **`buildFieldMap(schema)`** — Zod → [SchemaTree](#schematree) via
  `schema._zod.def.shape`; `{}` for non-object/`undefined`. See
  [ARCHITECTURE.md](./ARCHITECTURE.md#zod-adapter-internals).
- **`buildDefaults(fieldMap, overrides?)`** — shared (above).
- **`createResolver(schema)`** — `zodResolver(schema)` typed as `Resolver`.

---

## Valibot adapter exports

`@adistack/forms/adapters/valibot`:

- **`valibotAdapter`** — `SchemaAdapter<GenericSchema>`, same shape.
- **`buildFieldMap(schema)`** — Valibot → [SchemaTree](#schematree) via
  `type`/`entries`/`item`/`wrapped`/`pipe`. `picklist`/`enum` → `enum`.
  `optional`/`nullish`/`exact_optional` force optional; `nullable` alone does
  not.
- **`buildDefaults(fieldMap, overrides?)`** — shared.
- **`createResolver(schema)`** — `valibotResolver(schema)` typed as `Resolver`.

---

## Nested Objects vs. Nested Forms

**Nested objects** are supported — recursive [SchemaTree](#schematree),
`resolveFieldDef` walks `elementFields`/`elementDef`
(`address.city`, `tasks.0.title`, `tags.0`).

**Nested forms** (sub-forms with independent submit/validation lifecycle) are
not supported. One `FormInstance` per form tree.
