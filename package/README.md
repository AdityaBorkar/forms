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
import type { FieldComponentMap } from "@adistack/forms/core";

const fieldComponents: FieldComponentMap = {
  string: TextField,
  email: TextField,
  number: NumberField,
  boolean: CheckboxField,
  enum: SelectField,
  textarea: TextareaField,
};
```

Each component receives [`FieldRenderProps`](./src/types.ts) — `value`, `onChange`, `onBlur`, `ref`, `error`, plus the resolved `FieldDef` (`kind`, `meta`, `required`, `min`/`max`, `entries`, …).

**2. Wire the factory once** with your components and a schema adapter:

```tsx
import { createFormFormat } from "@adistack/forms/core";
import { zodAdapter } from "@adistack/forms/adapters/zod";

export const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createFormFormat({
    fieldMap: fieldComponents,
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
createFormFormat({ fieldMap, schemaResolver })
        │
        ├── useForm(schema)      → builds FieldMap + defaults + resolver, delegates to react-hook-form
        ├── <Form>               → wraps FormProvider + the context that carries fieldMap
        ├── <SmartField name>    → resolves FieldDef, renders your component via <Controller>
        └── <SmartFieldArray>    → wraps useFieldArray for repeatable rows
```

Three moving parts, all yours to swap:

| Part            | You provide                          | Library does                                   |
| --------------- | ------------------------------------ | ---------------------------------------------- |
| `FieldComponentMap` | React components keyed by `kind` | Rendered by `<SmartField>`                     |
| `SchemaAdapter`     | `buildFieldMap` / `buildDefaults` / `createResolver` | Introspects your schema into a `FieldMap` |
| The schema          | e.g. a Zod object               | Source of truth for validation + defaults      |

## Field meta

Attach UI hints to any schema field with `.meta(...)`. The adapter surfaces them as `FieldDef.meta`:

```tsx
z.string().min(8).meta({
  label: "Password",
  placeholder: "••••••••",
  description: "At least 8 characters.",
  component: "password", // overrides the resolved kind → renders your "password" component
})
```

`meta.component` is the escape hatch — force a `string` to render as a `textarea`, a `boolean` as a `switch`, etc.

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
import { createFormFormat } from "@adistack/forms/core";

// Zod v4 adapter (optional — only if you use Zod)
import { zodAdapter } from "@adistack/forms/adapters/zod";
```

The library is shipped as source TypeScript — no build step, just ESM.

## License

MIT
