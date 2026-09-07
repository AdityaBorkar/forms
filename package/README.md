# @adistack/forms

Schema-driven React form library. Pass a schema + adapter, get auto-rendered form fields via [`react-hook-form`](https://react-hook-form.com).

The schema is the single source of truth — it drives **validation** and **rendering**. `defaultValues` stay yours and pass straight through to RHF. You bring your own field components and your own schema adapter, so it works with any UI library (shadcn, Radix, MUI, …) and any supported validator (Zod v4 and Valibot today).

> **Status:** `0.0.1-alpha` — the API is still settling. Try it, break it, open an issue.

## Install

```bash
bun add @adistack/forms react-hook-form zod @hookform/resolvers
# or, for Valibot instead of Zod:
bun add @adistack/forms react-hook-form valibot @hookform/resolvers
```

| Peer | Required? |
| ---- | --------- |
| `react` (≥18), `react-hook-form` (^7.86.0) | Yes |
| `zod` (≥4), `@hookform/resolvers` (≥5) | Only with the Zod adapter |
| `valibot` (≥1), `@hookform/resolvers` (≥5) | Only with the Valibot adapter |

Shipped as source TypeScript — no build step, ESM only.

## Quick start

**1. Register your field components** — one per `kind` the adapter can emit:

```tsx
import { defineFieldComponents } from "@adistack/forms";
import { CheckboxField, DateField, NumberField, SelectField, TextField } from "./fields";

const fieldComponents = defineFieldComponents({
  string: TextField,
  email: TextField,
  url: TextField,
  number: NumberField,
  boolean: CheckboxField,
  enum: SelectField,
  date: DateField,
});
```

Dispatch is strictly `fieldComponents[def.kind]`. There is no `textarea` kind — a textarea is just another widget for `string` (map it per system, or pick it per field — see [Alternative widgets](#writing-field-components)).

**2. Wire the factory once** with your components and a schema adapter:

```tsx
import { createFormSystem } from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";
// or: import { valibotAdapter } from "@adistack/forms/adapters/valibot";

export const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormSystem({
    fieldComponents,
    schemaResolver: zodAdapter,
  });
```

`SmartField` / `SmartFieldArray` / `useForm` / `useFormContext` are factory-bound — they only exist on the object `createFormSystem` returns, and they share one React context. There are no standalone exports for them.

**3. Render straight from a schema** — no manual wiring per field:

```tsx
import z from "zod";

const schema = z.object({
  name: z.string().min(1).meta({ label: "Name" }),
  email: z.email().meta({ label: "Email", placeholder: "ada@example.com" }),
});

function SimpleForm() {
  const form = useForm({
    schema,
    defaultValues: { name: "", email: "" },
    onSubmit: (values) => console.log(values),
  });

  return (
    <Form form={form}>
      <SmartField name="name" />
      <SmartField name="email" />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

`<SmartField>` resolves the `FieldDef` for `name` from context and renders your component through RHF's `useController`. Validation and error messages flow from the schema; initial values come from your `defaultValues`. Form values infer from the schema via Standard Schema (`z.infer`-compatible) unless you pin `TValues` explicitly.

## How it works

```
createFormSystem({ fieldComponents, schemaResolver, onMissingField? })
        │
        ├── useForm({ schema, onSubmit, … }) → fieldMap + resolver (WeakMap-cached per schema object)
        ├── <Form form>                      → FormProvider + { fieldMap } context, submit wiring
        ├── <SmartField name>                → resolveFieldDef → fieldComponents[def.kind] via useController
        ├── <SmartFieldArray name>           → useFieldArray for repeatable rows (requires <Form> context)
        └── useFormContext()                 → RHF methods + { fieldMap } for deep components
```

| Part | You provide | Library does |
| ---- | ----------- | ------------ |
| `FieldComponentMap` | React components keyed by `kind` | Rendered by `<SmartField>` |
| `SchemaAdapter` | `createFieldMap` / `createResolver` | Introspects your schema into a `SchemaTree` + RHF resolver |
| The schema | e.g. a Zod v4 object, a Valibot object | Source of truth for validation and rendering |

## Writing field components

Each component receives `FieldComponentProps` — `def`, `name`, `value`, `onChange`, `onBlur`, `ref`, `error`, `disabled`, `config`:

```tsx
import type { FieldComponentProps } from "@adistack/forms";

function TextField({ def, name, value, onChange, onBlur, ref, error, disabled }: FieldComponentProps) {
  return (
    <div>
      <label htmlFor={name}>
        {def.meta?.label}
        {!def.optional && " *"}
      </label>
      <input
        id={name}
        name={name}
        type={def.kind === "email" ? "email" : def.kind === "url" ? "url" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        ref={ref}
        disabled={disabled}
        placeholder={def.meta?.placeholder}
      />
      {error && <p>{error}</p>}
    </div>
  );
}
```

Rules:

- **Read schema data from `def`.** `def.kind`, `def.meta` (label/placeholder/description + custom keys), `def.min`/`def.max`, `def.checks`, `def.entries` (enum value→label), `def.optional`.
- **Required is derived: `!def.optional`.** There is no stored `required` field.
- **Handle `undefined`.** No defaults are auto-derived — `value` is `undefined` until set (`value ?? ""`, `checked === true`, …). Array rows use explicit `append(value)`.
- **`onChange` takes the value, not the event.** `error` is already `fieldState.error?.message`.
- **Type your widgets** with `defineFieldComponent<TValue, TConfig>` and pin the map with `defineFieldComponents(map)`. Per-field overrides arrive via `<SmartField config={…} />` (e.g. `ComboboxConfig`'s `{ options: string[] }`).

## `useForm`

```ts
const form = useForm({
  schema,
  onSubmit: async (values) => { /* … */ },
  onInvalid: (errors) => { /* validation failed */ },
  onSubmitError: (error) => { /* onSubmit threw/rejected */ },
  defaultValues: { name: "" },
  validationMode: "onBlur",   // default; "onBlur" | "onChange" | "onSubmit" | "onTouched" | "all"
  reValidateMode: "onChange", // default; "onChange" | "onBlur" | "onSubmit"
});
```

- `schema` + `onSubmit` are required (missing options/`schema`/`onSubmit` throw).
- `defaultValues` pass straight through to RHF — nothing is derived from the schema.
- `onInvalid` fires on validation failures. A throwing/rejecting `onSubmit` is caught, routed to `onSubmitError`, and recorded as a `root.serverError` field error (read via `form.formState.errors.root?.serverError`).
- `fieldMap`/`resolver` are `WeakMap`-cached per schema object, so reusing one schema object across mounts is cheap. `validationMode`/`reValidateMode` are type-checked only (no runtime check).

## `<Form>`

```tsx
<Form form={form} className="grid gap-4">
  {/* SmartFields here */}
</Form>
```

Wraps RHF `FormProvider`, provides `{ fieldMap }` context, and renders `<form onSubmit={preventDefault + handleSubmit(onSubmit, onInvalid)}>`. Throws without a `form` prop. `<SmartField>`, `<SmartFieldArray>`, and `useFormContext()` must be inside it (they throw outside it).

## `<SmartField>`

```tsx
<SmartField name="address.city" />
<SmartField name="tasks.0.title" disabled config={{ options: [...] }} />
```

- `name` — dotted path (`address.city`, `tasks.0.title`, `tags.0`). Empty names and empty segments (`a..b`, leading/trailing dots) throw.
- `disabled` — forwarded to `useController` and to your component.
- `config` — arbitrary pass-through to your component (`TConfig`).

## Nested objects & arrays

Nested objects resolve through dotted names — no extra setup:

```tsx
<SmartField name="address.street" />
<SmartField name="address.city" />
```

Arrays need an **explicit index** — bare `tasks.title` throws (which row?). Primitive elements resolve directly (`tags.0`):

```tsx
<SmartFieldArray name="tasks">
  {({ fields, append, remove, update, move }) => (
    <>
      {fields.map((row, index) => (
        <div key={row.id}>
          <SmartField name={`tasks.${index}.title`} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ title: "" })}>Add</button>
    </>
  )}
</SmartFieldArray>
```

`fields` rows are `{ …values, id }` (use `id` as `key`). `SmartFieldArray` validates that `name` resolves to an `array` field and otherwise follows the [missing-field policy](#missing-fields).

## Field defs

`resolveFieldDef(fieldMap, name)` walks `elementFields` (objects) / `elementDef` (array elements, including primitives). Each node is a `FieldDef` discriminated by `kind`:

| Kind | Carries |
| ---- | ------- |
| `string` / `email` / `url` | `checks`, `min`, `max` (length) |
| `number` | `checks`, `min`, `max` (value) |
| `boolean`, `date` | leaf, no constraints |
| `enum` | `entries` (`Record<value, label>`) |
| `array` | `elementDef`, `checks`, `min`, `max` (length) |
| `object` | `elementFields` (required) |

Custom string kinds stay allowed in the type (`CustomFieldDef`) for third-party adapters, but neither bundled adapter emits them — and neither ever emits `kind: "unknown"`.

Attach UI hints with schema metadata — surfaced as `FieldDef.meta` (passthrough):

```tsx
// Zod
z.string().min(8).meta({ label: "Password", placeholder: "••••••••", description: "At least 8 characters." });
// Valibot
v.pipe(v.string(), v.minLength(8), v.title("Password"), v.description("At least 8 characters."));
```

## Adapters

| Adapter | Import | Notes |
| ------- | ------ | ----- |
| Zod v4 | `@adistack/forms/adapters/zod` (`zodAdapter`) | Walks `schema._zod.def` (fragile by design). `z.email()`/`z.url()` → `email`/`url` kinds. |
| Valibot | `@adistack/forms/adapters/valibot` (`valibotAdapter`) | `picklist`/`enum` normalize to `enum`. `optional`/`nullish`/`exact_optional` force `optional`; `nullable` alone does not. `v.title()` → `meta.label`/`meta.title`, `v.metadata()` merges in. |

Both share one engine (`createFieldMap` / `createResolver` via `@hookform/resolvers`):

- **Unions:** keep the single non-`literal` branch (covers `z.string().optional()`-style unions), else throw (empty/all-literal/ambiguous).
- **`record` and unknown types throw.** Narrow the schema to a supported type instead.
- Non-object/empty input yields an empty field map (`{}`).

## Missing fields

`createFormSystem({ onMissingField })` controls unknown names and unregistered kinds (default `"throw"`):

- `"throw"` — throws in dev for fast debugging; production always warns + renders `null`.
- `"warn"` — renders `null` with a dev-only deduplicated warning, in dev too.

## TypeScript

- `useForm` infers `TValues` from the schema via Standard Schema `~standard.types.output` (works for Zod v4 and Valibot).
- `FieldKind = KnownFieldKind | (string & {})` — known kinds autocomplete, custom kinds still typecheck.
- `defineFieldComponent<TValue, TConfig>` / `defineFieldComponents(map)` are zero-runtime helpers that pin widget contracts at registration.

## Entry points

```ts
import { createFormSystem, resolveFieldDef } from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";
import { valibotAdapter } from "@adistack/forms/adapters/valibot";
import type { SmartFieldProps, SmartFieldArrayProps } from "@adistack/forms/ui";
```

| Entrypoint | Exports |
| ---------- | ------- |
| `@adistack/forms` | `createFormSystem`, `resolveFieldDef`, `defineFieldComponent(s)`, all core types (`FieldDef` + variants, `SchemaTree`, `FieldComponentMap`/`Props`, `SchemaAdapter`, `FormInstance`, `UseFormOptions`, …) |
| `@adistack/forms/adapters/zod` | `zodAdapter`, `createFieldMap`, `createResolver` |
| `@adistack/forms/adapters/valibot` | `valibotAdapter`, `createFieldMap`, `createResolver` |
| `@adistack/forms/ui` | Types only (`SmartFieldProps`, `SmartFieldArrayProps`, `SmartFieldArrayRenderProps`, `FieldArrayRow`) |

## License

MIT
