# Better DX — API Setup & Usage Simplification Report

Status: proposal only, no code changed.
Evidence: `package/src/core/create-form-system.ts`, `package/src/types.ts`,
`package/src/core/use-form.ts`, `package/src/core/form.tsx`,
`package/src/ui/smart-field.tsx`, `package/src/ui/smart-field-array.tsx`,
`package/src/adapters/shared/defaults.ts`, `package/src/adapters/shared/field-def.ts`,
`examples/src/lib/form.tsx`, `examples/src/lib/form-valibot.tsx`,
`examples/src/examples/*.tsx`, `README.md`, `docs/CONTEXT.md`.

Goal: cut the mandatory setup from ~50 lines + 5 imports down to ~10 lines
for the common Zod case, without removing the escape hatches (custom adapters,
custom widgets, full RHF access).

---

## TL;DR — ranked suggestions

| # | Pain today | Proposal | Impact |
|---|------------|----------|--------|
| 1 | `createFormSystem({ fieldComponents, schemaResolver })` + 14-entry widget map copy-pasted per adapter (`examples/src/lib/form.tsx:28-48`, `form-valibot.tsx:26-46`) | `createZodFormSystem(fieldComponents)` shortcut + rename `schemaResolver` → `adapter` | Removes 1 import + 1 confusing name for 90% of users |
| 2 | No type inference: `onSubmit: (values) => …` is `FieldValues`; callers cast `schema as ZodType<…>` (`custom-component.tsx:97`) | `SchemaAdapter<TSchema, TValues>` with `infer` + generic `useForm<typeof schema>` | Real autocomplete + no casts |
| 3 | Two-step form wiring: `useForm({schema})` → `<Form form={form}>` every time (`form-wrapper.tsx:50-91`) | Single-step `<AutoForm schema onSubmit>` (thin wrapper over existing primitives) | Halves boilerplate in every example |
| 4 | One `<SmartField name>` per field, hand-listed (`field-kinds.tsx:66-82` lists 13) | `<AutoFields />` with `include/exclude/order` | Large schemas go from N lines to 1 |
| 5 | Every widget repeats `String(value ?? "")` / `typeof value === "number"` casts + `FieldShell` wiring (`text-field.tsx:7-52`) | `defineFieldComponent<TValue>()` typed helper | Kills `unknown` casts in userland |
| 6 | `config?: Record<string, unknown>` is untyped (`field-kinds.tsx:74-77` passes `config={{ options: […] }}` blind) | Per-kind `config` generics on `FieldComponentMap` | Autocomplete + compile-time errors |
| 7 | `SmartFieldArray` forces manual `tasks.${index}.title` strings + manual `append({title: ""})` shapes (`array-form.tsx:38-84`) | `appendDefault()` / `useFieldArrayDefaults()` + `<ArrayRow>` helper | No shape duplication, no string-interp bugs |
| 8 | Silent failures: missing kind/name → `devWarn` + `null` (`smart-field.tsx:31-56`), invisible in prod | Dev-strict mode: throw in dev, `null`+warn only in prod; codemod-safe | Faster debugging, same prod safety |
| 9 | Name collisions: factory returns `useForm`/`useFormContext`/`Form` shadowing `react-hook-form`; 3 entrypoints | Keep names, add namespace export + document alias pattern; re-export `FieldArrayRow` from `ui/index.ts` | Fewer import bugs |
| 10 | `validationMode` renames RHF's `mode` (`types.ts:136`, `use-form.ts:20-21`); `buildDefaults(fieldMap, overrides)` vs docs' 3-arg shape; dual `FormInstance`/`FormContextInstance` | Align names with RHF (`mode`), fix docs drift, collapse or rename instance types | Less "second mental model" to learn |

Details + before/after for each below.

---

## 1. Setup: factory ceremony + confusing `schemaResolver` name

Problem: `package/src/core/create-form-system.ts:23-26`

```ts
createFormSystem({ fieldComponents, schemaResolver: zodAdapter })
```

- `schemaResolver` reads like an RHF `Resolver`, but it is a full
  `SchemaAdapter` (`buildFieldMap` + `buildDefaults` + `createResolver`,
  `package/src/types.ts:94-101`). Every new user misreads it once.
- Zod users (the default path) must import the adapter separately and repeat
  the 14-entry `fieldComponents` map per system (`form.tsx` vs
  `form-valibot.tsx` are identical except the adapter import).

Proposal:

```ts
// a. Rename option to `adapter`, accept `schemaResolver` as deprecated alias
export type CreateFormSystemOptions<TSchema> = {
  fieldComponents: FieldComponentMap;
  adapter: SchemaAdapter<TSchema>;
};

// b. Pre-wired shortcuts — one import for the common case
import { createZodFormSystem } from "@adistack/forms/adapters/zod";

export const { Form, SmartField, SmartFieldArray, useForm } =
  createZodFormSystem(fieldComponents);
// Valibot equivalent: createValibotFormSystem(fieldComponents)
```

Before (today, `examples/src/lib/form.tsx:1-51`):

```tsx
import { createFormSystem, type FieldComponentMap } from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";

const fieldComponents: FieldComponentMap = { /* 14 entries */ };
const system = createFormSystem({ fieldComponents, schemaResolver: zodAdapter });
export const { SmartField, SmartFieldArray, Form, useForm, useFormContext } = system;
```

After:

```tsx
import { createZodFormSystem } from "@adistack/forms/adapters/zod";

export const { SmartField, SmartFieldArray, Form, useForm, useFormContext } =
  createZodFormSystem(fieldComponents);
```

Effort: small, backward-compatible (alias + new export).

---

## 2. Setup: shared widget map is copy-paste

Problem: `form.tsx:28-43` and `form-valibot.tsx:26-41` define the same 14 keys
(`boolean/checkbox/combobox/date/email/enum/number/password/slider/string/switch/textarea/unknown/url`).
Adding one widget (e.g. `stars` in `custom-component.tsx:64-71`) means editing
every map.

Proposal: export a base map + extension helper.

```tsx
import { baseFieldComponents, extendComponents } from "@adistack/forms/ui";
// or ship per-UI-kit presets later: `shadcnFieldComponents`

const fieldComponents = extendComponents(baseFieldComponents, {
  stars: StarsField, // override or add; type-checked against FieldKind
});
```

Also add a `defineFieldComponents()` helper that warns at build time (type
error) when a schema kind has no widget, instead of runtime `devWarn` + `null`
in `smart-field.tsx:43-56`.

---

## 3. Types: recover `z.infer` instead of `FieldValues`

Problem: `UseFormOptions<TSchema, TValues extends FieldValues = FieldValues>`
(`types.ts:128-138`) defaults `TValues` to `FieldValues`, so this has no
autocomplete and forces casts:

```tsx
// today — custom-component.tsx:93-98
const form = customSystem.useForm({
  defaultValues: { score: 3 },
  onSubmit: (values: FieldValues) => setResult(values), // untyped
  schema: schema as ZodType<FieldValues, FieldValues>, // cast
});
```

Proposal: thread an infer type through the adapter.

```ts
export type SchemaAdapter<TSchema, TValues = unknown> = {
  infer?: TValues; // phantom — enables z.infer-style extraction
  buildFieldMap(schema: TSchema): SchemaTree;
  // …
};

// usage — values is { title: string; score: number; feedback?: string }
const form = useForm({
  onSubmit: (values) => setResult(values.score + 1), // typed
  schema,
});
```

Keep the explicit-generic escape hatch
(`useForm<MyValues>({ schema, … })`) for hand-built maps. Zod adapter sets
`TValues` via `z.infer`; Valibot via `v.InferOutput`.

Effort: medium (touches `SchemaAdapter`, `UseFormOptions`, `FormInstance`).

---

## 4. Usage: single-step `<AutoForm>` (Smart Component Support)

Problem: every form repeats the two-step dance — `useForm()` then
`<Form form={form}>` plus submit-state plumbing (`form-wrapper.tsx:50-91`
reimplements `pending`/`outcome` per example; `form-context.tsx:89-109`
reimplements a shell).

Proposal: keep primitives, add a composing component. Nothing existing breaks.

```tsx
// Before (today — simple-form.tsx + form-wrapper.tsx combined ≈ 60 lines)
const form = useForm({ onSubmit, schema });
return (
  <Form form={form}>
    <SmartField name="name" />
    <SmartField name="email" />
    <button type="submit">Submit</button>
  </Form>
);

// After — small forms collapse to one component
import { AutoForm } from "@adistack/forms"; // new, built on useForm + Form

<AutoForm
  onInvalid={(errors) => console.log(errors)}
  onSubmit={(values) => console.log(values)} // typed via §3
  schema={schema}
>
  <SmartField name="name" />
  <SmartField name="email" />
</AutoForm>;
```

`<AutoForm>` props = `UseFormOptions` + `FormProps` minus `form`
(`schema`, `onSubmit`, `onInvalid`, `defaultValues`, `validationMode`,
`className`, `children`). Implement as ~20 lines over `useForm` + `Form`.
Also consider `<SubmitButton pending={…}>` since every example hand-rolls it.

---

## 5. Usage: `<AutoFields />` for full-schema renders

Problem: `field-kinds.tsx:66-82` hand-lists 13 `<SmartField>`s in schema order.
Rename a schema key → silent `null` (see §8). Large schemas are pure toil.

Proposal:

```tsx
// Render every top-level field in schema order
<AutoForm schema={schema} onSubmit={onSubmit}>
  <AutoFields />
</AutoForm>

// Opt out / reorder without losing the default
<AutoFields exclude={["password"]} />
<AutoFields include={["username", "email", "role"]} />
<AutoFields order={["email", "username"]} /> // rest follow schema order
```

Semantics: iterate `fieldMap` keys (already in context), render
`<SmartField name={key}>`, skip `kind: "object"` roots or render them as
`<fieldset>` groups (document the choice). Nested objects stay explicit
(`<SmartField name="address.city">`) — `AutoFields` is a top-level
convenience, not a layout engine.

---

## 6. Custom widgets: typed `defineFieldComponent` (Custom Smart Component Support)

Problem: `FieldComponentProps.value?: unknown`, `onChange: (value: unknown) => void`
(`types.ts:77-87`). Every widget casts:

```tsx
// today — text-field.tsx:17-20, custom-component.tsx:32
const current = typeof value === "number" ? value : 0;
onChange(event.target.value); // unknown in, unknown out
// + every widget repeats FieldShell label/description/required wiring
```

Proposal:

```tsx
import { defineFieldComponent } from "@adistack/forms";

export const NumberField = defineFieldComponent<number>(({
  def, value, onChange, onBlur, ref, error, disabled,
}) => (
  <FieldShell label={def.meta?.label} error={error} name={def.path} required={!def.optional}>
    <Input
      value={value ?? 0} // number, not unknown
      onChange={(e) => onChange(Number(e.target.value))} // type-checked
      onBlur={onBlur}
      ref={ref}
      disabled={disabled}
    />
  </FieldShell>
));
```

Notes:

- Generic defaults to current `unknown` shape — fully backward-compatible.
- Provide per-kind value mapping table (`string|email|url|password|textarea|combobox → string`,
  `number|slider → number`, `boolean|checkbox|switch → boolean`, `enum → string`,
  `date → Date | undefined`, `array → unknown[]`, `object → Record<string, unknown>`)
  so `defineFieldComponent<"number">` or inference from the map key types the widget.
- Consider exporting `FieldShell` from the library (today each app hand-rolls
  `examples/.../field-shell.tsx`) — it is the most-copied file after the widget map.

---

## 7. Custom widgets: type the `config` bag

Problem: `SmartFieldProps.config?: Record<string, unknown>` (`smart-field.tsx:14-18`)
is pass-through with no contract. The combobox reads `config.options` at runtime;
a typo (`option` vs `options`) renders an empty list with no error.

Proposal: allow per-component config types via generics on the map.

```ts
type FieldComponentMap = Record<string, ComponentType<FieldComponentProps<any, any>>>;
// defineFieldComponent<TValue, TConfig> registers its TConfig;
// SmartField infers it:
<SmartField name="city" config={{ options: [...] }} />
//                              ^^^^^^^ typed as { options: string[] } for ComboboxField
//                            typo → compile error
```

Minimum viable version: export a `ComboboxConfig = { options: string[] }` type
and document the pattern, even before full inference lands.

---

## 8. Arrays: stop duplicating row shapes + index strings

Problem (`array-form.tsx:35-86`):

1. Indexed names are string-interpolated (`tasks.${index}.title`) — rename
   `title` → silent `null` (see §8).
2. `append({ hours: 0, title: "" })` duplicates the schema's defaults by hand;
   drift (add a schema field, forget the append shape) is a runtime bug.
3. `SmartFieldArray` is schema-agnostic by design (`CONTEXT.md`), so it can't
   help today.

Proposal (all additive):

```tsx
<SmartFieldArray name="tasks">
  {({ fields, appendDefault, remove, move }) => (
    <>
      {fields.map((row, index) => (
        <ArrayRow key={row.id} name={`tasks.${index}`}>
          {/* resolves relative to row prefix */}
          <SmartField name="title" />
          <SmartField name="hours" />
        </ArrayRow>
      ))}
      {/* derives { hours: 0, title: "" } from fieldMap + overrides */}
      <button type="button" onClick={() => appendDefault()}>Add task</button>
      <button type="button" onClick={() => appendDefault({ title: "New" })}>Add named</button>
    </>
  )}
</SmartFieldArray>
```

- `appendDefault(overrides?)` uses the existing `buildDefaults` recursion
  (`shared/defaults.ts:5-68`) scoped to the array's `elementDef` — no new
  inference needed.
- `<ArrayRow>` (name TBD: `FieldArrayScope` / `ArrayItemContext`) is a context
  provider that prefixes descendant `SmartField name`s. Absolute names
  (containing `.` or matching a root key) keep working as today.
- Type `fields` as `FieldArrayRow[]` is already done; re-export `FieldArrayRow`
  from `@adistack/forms/ui` (today it is defined but not re-exported —
  `ui/index.ts` gap noted in `CONTEXT.md`).

---

## 9. Validation & error handling: fail loudly in dev

Problem: `smart-field.tsx:31-56` catches both "name not in schema" and "no
widget for kind" → `devWarn` + `null`. Correct for prod resilience, bad for
authoring: a typo renders a silently shorter form, and `devWarn` is suppressed
entirely when `NODE_ENV === "production"` (`errors.ts:24`), so bug reports
arrive as "field missing" with no log.

Proposal:

- Dev-strict default: `throw` (error boundary–visible, with the already-good
  `createFormError` detail lines listing available fields/kinds) when
  `NODE_ENV !== "production"`; keep `null` + warn in prod. Gate behind an
  explicit opt-out (`createFormSystem({ onMissingField: "warn" | "throw" })`)
  so design-system preview routes that intentionally render partial maps don't break.
- Surface `onInvalid` shape consistently: today `UseFormOptions.onInvalid`
  types errors as `FieldErrors<TValues>` (`types.ts:133`) but glossary docs say
  `Record<string, unknown>` — pick one and fix the other.
- Document the validation-mode story once: `validationMode` (default `onBlur`,
  `use-form.ts:20`) renames RHF's `mode`. Either alias to `mode` or keep and
  explain why in one line — today users must hold both names.

---

## 10. Naming, imports & type-surface cleanup (Clean and Complete Functionality)

Small, mostly non-breaking items found during the audit:

1. **`FormInstance` vs `FormContextInstance`** (`types.ts:116-126`): two types
   differing only by `onSubmit`/`onInvalid`. Rename intent-revealingly
   (`FormApi` / `FormContextApi`) or collapse to one type with optional submit
   handlers. At minimum fix the glossary (it still shows old `buildDefaults`
   3-arg and `register`-era `SmartField` descriptions — both stale vs source).
2. **Re-export `FieldArrayRow`** from `@adistack/forms` and `@adistack/forms/ui`.
   Defined in `smart-field-array.tsx:10` but exported from neither entrypoint,
   forcing `Record<string, unknown>` workarounds in userland.
3. **`buildDefaults` signature drift**: source is
   `buildDefaults(fieldMap, overrides?)` (`shared/defaults.ts:59`), docs say
   `(schema, fieldMap, overrides?)`. Decide the canonical shape (2-arg is
   correct for the Zod impl) and fix `CONTEXT.md`/`GLOSSARY.md` + `SchemaAdapter`
   accordingly. Consider exporting a `getDefaults(schema, overrides?)` one-call
   for array-row defaults (§8) and tests.
4. **Shadowed RHF names**: factory returns `useForm`/`useFormContext`/`Form`.
   Keep them (renaming breaks everyone) but bless the alias pattern in README:
   `import { Form as SmartForm, useForm as useSmartForm } from "#/components/form-zod"`,
   and add a namespace export (`createFormSystem` also returns nothing new —
   just document `import * as loginForm from …` usage).
5. **Expose submit state**: examples track `pending` manually for server submits
   (`form-wrapper.tsx:48`). Re-export RHF's `formState.isSubmitting` prominently
   (it already flows through `FormInstance extends UseFormReturn`) and add a
   `<SubmitButton>` that disables on `isSubmitting` — removes ~15 lines per app.
6. **`meta.component` vs `kind`**: `resolveKind` (`shared/field-def.ts:8-12`)
   lets `meta.component` override dispatch, but `SmartField` docs in
   `CONTEXT.md:67-73` say "no override". The code supports it (and examples rely
   on it: `password/textarea/slider/switch/combobox/stars`). One-line doc fix;
   no API change needed.

---

## Suggested rollout (keeps `0.0.1-alpha` shippable)

- **Patch (non-breaking)**: `adapter` alias, `createZodFormSystem` /
  `createValibotFormSystem`, `<AutoForm>`, `FieldArrayRow` re-export,
  `appendDefault`, glossary fixes, `ComboboxConfig` type.
- **Minor (additive, needs RFC)**: `<AutoFields />`, `<ArrayRow>` scoping,
  `defineFieldComponent<TValue, TConfig>`, `SchemaAdapter<TSchema, TValues>`
  inference, dev-strict missing-field mode.
- **Major (breaking, batch for beta)**: rename `schemaResolver` → `adapter`
  (remove alias), `validationMode` → `mode`, collapse instance types.

Each item above is independently shippable; §1 + §4 + §6 cover ~80% of the
perceived complexity for new adopters.
