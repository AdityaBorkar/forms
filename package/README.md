# @adistack/forms

Schema-driven React form library. Pass a schema + adapter, get auto-rendered form fields via [`react-hook-form`](https://react-hook-form.com).

The schema is the single source of truth — it drives **validation**, **default values**, and **rendering**. You bring your own field components and your own schema adapter, so it works with any UI library (shadcn, Radix, MUI, …) and any validator (Zod today, more to come).

> **Status:** `0.0.1-alpha` — the API is still settling. Try it, break it, open an issue.

## Install

```bash
bun add @adistack/forms react-hook-form zod @hookform/resolvers
```

`react` (≥18) and `react-hook-form` are required peers. `zod` and `@hookform/resolvers` are only needed if you use the Zod adapter — both are optional peers.

## Quick start

**1. Register your field components** (one per "kind" the adapter can resolve):

```tsx
import type { FieldComponentMap } from "@adistack/forms";

const fieldComponents: FieldComponentMap = {
  string: TextField,
  email: TextField,
  number: NumberField,
  boolean: CheckboxField,
  enum: SelectField,
  textarea: TextareaField,
};
```

Each component receives [`FieldComponentProps`](./src/types.ts) — `def`, `name`, `value`, `onChange`, `onBlur`, `ref`, `error`, `disabled`, `config`. Read schema-derived data from `def` (`def.kind`, `def.meta`, `def.min`/`def.max`, `def.entries`, `def.optional`, …).

**2. Wire the factory once** with your components and a schema adapter:

```tsx
import { createFormSystem } from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";

export const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormSystem({
    fieldComponents,
    schemaResolver: zodAdapter,
  });
```

**3. Render straight from a Zod schema** — no manual wiring per field:

```tsx
import z from "zod";

const schema = z.object({
  email: z.email().meta({ label: "Email", placeholder: "ada@example.com" }),
  name: z.string().min(1).meta({ label: "Name" }),
});

function SimpleForm() {
  const form = useForm({
    schema,
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

`<SmartField>` reads the field map from context, resolves the def for `name`, and dispatches to your component — all validation, defaults, and error messages flow from the schema.

## How it works

```
createFormSystem({ fieldComponents, schemaResolver })
        │
        ├── useForm(schema)      → builds SchemaTree + defaults + resolver, delegates to react-hook-form
        ├── <Form>               → wraps FormProvider + the context that carries fieldMap
        ├── <SmartField name>    → resolves FieldDef, renders your component via useController()
        └── <SmartFieldArray>    → wraps useFieldArray for repeatable rows
```

Three moving parts, all yours to swap:

| Part            | You provide                          | Library does                                   |
| --------------- | ------------------------------------ | ---------------------------------------------- |
| `FieldComponentMap` | React components keyed by `kind` | Rendered by `<SmartField>`                     |
| `SchemaAdapter`     | `buildFieldMap` / `buildDefaults` / `createResolver` | Introspects your schema into a `SchemaTree` |
| The schema          | e.g. a Zod object               | Source of truth for validation + defaults      |

## Field meta

Attach UI hints to any schema field with `.meta(...)`. The adapter surfaces them as `FieldDef.meta`:

```tsx
z.string().min(8).meta({
  label: "Password",
  placeholder: "••••••••",
  description: "At least 8 characters.",
})
```

`meta` is passthrough, plus an optional `component` override — when
`meta.component` is a non-empty string it becomes the dispatch kind:

```tsx
z.string().meta({ component: "textarea", label: "Bio" }) // renders fieldComponents.textarea
```

Without the override, dispatch is `fieldComponents[def.kind]` and required
state derives as `!def.optional`. The Zod adapter emits
`string|number|boolean|date|email|url|object|array|enum` before the override;
the Valibot adapter emits `string|number|boolean|date|email|url|object|array|enum`
(`picklist`/`enum` normalize to `enum`).

## Nested objects & arrays

Nested objects resolve through dotted names — no extra setup:

```tsx
<SmartField name="address.street" />
<SmartField name="address.city" />
```

Repeatable rows use `<SmartFieldArray>`:

```tsx
<SmartFieldArray name="tasks">
  {({ fields, append, remove }) => (
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

## Entry points

```ts
// Framework-agnostic core
import { createFormSystem } from "@adistack/forms";

// Zod v4 adapter (optional — only if you use Zod)
import { zodAdapter } from "@adistack/forms/adapters/zod";
```

The library is shipped as source TypeScript — no build step, just ESM.

## License

MIT
