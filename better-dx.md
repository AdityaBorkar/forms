# Better DX — Verified Report (v2, performant)

Status: verified against source, no code changed.
Evidence: `package/src/types.ts`, `package/src/index.ts`,
`package/src/core/create-form-system.ts`, `package/src/core/use-form.ts`,
`package/src/core/form.tsx`, `package/src/core/form-context.ts`,
`package/src/core/use-form-context.ts`, `package/src/core/resolve-field-def.ts`,
`package/src/ui/smart-field.tsx`, `package/src/ui/smart-field-array.tsx`,
`package/src/ui/index.ts`, `package/src/errors.ts`,
`package/src/adapters/shared/defaults.ts`,
`package/src/adapters/shared/field-def.ts`,
`package/src/adapters/zod/index.ts`,
`package/src/adapters/valibot/index.ts`, `package/README.md`.

Goal: same as v1 (10-line Zod setup, typed values, less per-field toil)
with two added constraints: (a) every runtime suggestion is O(1) or
memoized on the hot render path, (b) every type suggestion is zero-runtime
(generics + identity helpers only, no new deps, no extra providers).

---

## Verification of v1 (what held up, what didn't)

| # | v1 claim | Verdict |
|---|----------|---------|
| 1 | `schemaResolver` misnamed, is a full `SchemaAdapter` (`create-form-system.ts:23-26`, `types.ts:94-101`) | **Confirmed** |
| 2 | 14-entry widget map copy-pasted per adapter; proposes `baseFieldComponents` | **Partially wrong.** Copy-paste is real, but the library is headless — `src/ui/` ships no widgets, so there is no base map to export. A preset can only live in examples or a future UI-kit package. The shippable fix is a type-checked identity helper, not a base map. |
| 3 | `TValues` defaults to `FieldValues`, forces `schema as ZodType<…>` casts; proposes `SchemaAdapter<TSchema, TValues>` phantom `infer` | **Confirmed.** Zod adapter erases to `ZodType<FieldValues, FieldValues>` (`adapters/zod/index.ts:17`); Valibot to `GenericSchema`. Phantom `infer?: TValues` alone never infers — needs a real `Infer<TSchema>` mapping per adapter. |
| 4 | Two-step `useForm` → `<Form form>`; proposes `<AutoForm>` | **Confirmed** (`use-form.ts`, `form.tsx`). Additive and safe. |
| 5 | Hand-listed `<SmartField>`s; proposes `<AutoFields include/exclude/order>` | **Confirmed** as DX gap. Semantics (iterate `fieldMap` keys = schema order) are sound. |
| 6 | `value?: unknown` casts in every widget; proposes `defineFieldComponent<TValue>()` | **Confirmed** (`types.ts:77-87`). v1's `defineFieldComponent<"number">` (kind string) is a typo — the generic must be the **value** type (`<number>`), optionally plus `TConfig`. |
| 7 | `config?: Record<string, unknown>` untyped; proposes full per-name inference on `SmartField` | **Overpromised.** `SmartField name` is a runtime string; statically mapping `name → config` requires threading `TSchema` paths through the factory — heavy conditional types on every render for one combobox. Ship the cheap half: typed `TConfig` on the component + exported `ComboboxConfig`. |
| 8 | Array row-shape duplication + `tasks.${i}.title` strings; proposes `appendDefault()` + `<ArrayRow>` scoping | **Confirmed** (`smart-field-array.tsx:1-56` is schema-agnostic, only `append/remove/update/move`). `<ArrayRow>` prefix context is real API surface + a context read per field — needs a perf note (below). `appendDefault` itself is cheap (existing `deriveDefault` recursion). |
| 9 | Silent `null` on miss (`smart-field.tsx:31-56` catches `resolveFieldDef` throws); proposes dev-throw | **Confirmed.** Note: it breaks the existing test `renders nothing for an unknown field name` (`create-form-system.test.tsx:102-110`) — test must be updated to expect throw in dev. Gate behind opt-out flag. |
| 10 | `FormInstance` vs `FormContextInstance`, `buildDefaults` 2-arg vs docs 3-arg, `FieldArrayRow` not re-exported, `validationMode` vs `mode`, shadowed RHF names, `meta.component` docs | **All confirmed.** `types.ts:116-126`, `shared/defaults.ts:59-68`, `ui/index.ts:1-6` + `index.ts:27-32` (no `FieldArrayRow`), `use-form.ts:20,39`, `shared/field-def.ts:8-12`. |

### Perf gaps v1 missed (hot-path findings)

1. **No memo on `resolveFieldDef`.** `SmartField` splits + regex-tests `name` and walks the tree on **every render** (`smart-field.tsx:31-33`). Cache per `(fieldMap, name)`.
2. **Three `useMemo`s keyed on `schema` / `defaultValues` identity** (`use-form.ts:24-35`). An inline `z.object(...)` or inline `defaultValues={{…}}` rebuilds fieldMap + defaults + resolver every render. Needs a `WeakMap<schema, SchemaTree>` cache + hoist-schema docs.
3. **`form` identity churn.** `use-form.ts:44-52` spreads `{...methods}` into a new object every render, and `form.tsx:33-38` rebinds `handleSubmit` on `[form]`. Stabilize `onSubmit`/`onInvalid` via ref so the memo holds and `FormProvider` stops re-rendering children needlessly.
4. **`renderProps` alloc per `ControlledField` render** (`smart-field.tsx:90-100`). Unavoidable, but document `React.memo` on user widgets; keep the `value !== undefined` spread (already correct — avoids controlled/uncontrolled flip).
5. **`onSubmit: (values) => void` bans async actions** (`types.ts:133`). Should be `void | Promise<void>` — zero runtime cost, unblocks server submits + `formState.isSubmitting` (no new `<SubmitButton>` component needed).
6. **No `displayName` on factory components.** DevTools shows anonymous — one-line DX win, zero prod cost.

---

## TL;DR — revised ranked suggestions (all perf-safe)

| # | Change | Runtime cost | Impact |
|---|--------|--------------|--------|
| 1 | `adapter` alias + `createZodFormSystem` / `createValibotFormSystem` shortcuts | None (import-time only) | Kills 1 import + confusing name |
| 2 | `SchemaAdapter<TSchema, TValues>` + per-adapter `Infer<TSchema>` (zod `z.infer`, valibot `v.InferOutput`); `useForm` infers `TValues` from `TSchema` | Zero (types only) | Typed `onSubmit`, no casts |
| 3 | `WeakMap` cache for `buildFieldMap` + `createResolver`; stabilize `onSubmit` ref in `useForm` | O(1) hit; fixes per-render rebuild | Biggest render-perf win, no API change |
| 4 | Memoize `resolveFieldDef(fieldMap, name)` in `SmartField`; allow `void \| Promise<void>` submit | O(1) hit; zero cost | Hot-path fix + async submits |
| 5 | `defineFieldComponent<TValue, TConfig>` identity helper + `FieldKindValueMap` + exported `ComboboxConfig` | Zero (identity fn) | Kills `unknown` casts |
| 6 | `defineFieldComponents()` identity helper (type-checks map keys against `FieldKind`); presets stay in examples, not the lib | Zero | Fixes copy-paste without fake base map |
| 7 | Additive `<AutoForm>` (~20 lines over `useForm` + `Form`) | Same as manual wiring | Halves small-form boilerplate |
| 8 | Additive `<AutoFields include/exclude/order>` (top level only, schema order) | Same N `useController` subs as manual | N lines → 1 |
| 9 | `appendDefault(overrides?)` on `SmartFieldArray` via existing `deriveDefault` on `elementDef`; export `FieldArrayRow` from root + `ui` | O(row size), on click only | No shape duplication |
| 10 | Dev-strict missing field/kind: throw in dev, `null`+warn in prod, `onMissingField: "throw" \| "warn"` opt-out | Dev-only branch (existing `errors.ts` pattern) | Fast debugging, same prod safety |
| 11 | Docs/type cleanup: `validationMode`→ document as `mode` alias (don't break), collapse/rename instance types, fix `buildDefaults` drift, bless RHF-name alias pattern, `displayName`s | Zero / docs | Less second mental model |

Dropped / deferred from v1: `baseFieldComponents` from the lib (impossible headless — §2 correction), automatic per-`name` config inference (cost > value — §7 correction), `<ArrayRow>` prefix-scoping context (defer: new context read per field + ambiguous absolute/relative resolution; `appendDefault` + existing dotted names cover 90%), standalone `<SubmitButton>` (unneeded once async submit + `formState.isSubmitting` are documented — already flows through `FormInstance extends UseFormReturn`).

---

## Details

### 1. Setup: `adapter` alias + per-adapter shortcuts

```ts
// types + factory — additive, old name keeps working
export type CreateFormSystemOptions<TSchema> = {
  fieldComponents: FieldComponentMap;
  adapter: SchemaAdapter<TSchema, any>;
  schemaResolver?: SchemaAdapter<TSchema, any>; // deprecated alias
  onMissingField?: "throw" | "warn"; // §10 default "throw"
};

import { createZodFormSystem } from "@adistack/forms/adapters/zod";
export const { Form, SmartField, SmartFieldArray, useForm, useFormContext } =
  createZodFormSystem(fieldComponents); // = createFormSystem({ fieldComponents, adapter: zodAdapter })
```

### 2. Types: real inference, zero runtime

```ts
export type SchemaAdapter<TSchema, TValues = unknown> = {
  buildFieldMap(schema: TSchema): SchemaTree;
  buildDefaults(fieldMap: SchemaTree, overrides?: Record<string, unknown>): DefaultValues<FieldValues>;
  createResolver(schema: TSchema): Resolver;
  readonly _infer?: TValues; // phantom, never read at runtime
};
// zod adapter: SchemaAdapter<TSchema, z.infer<TSchema>> via InferZod<TSchema>
// valibot adapter: SchemaAdapter<TSchema, v.InferOutput<TSchema>>
// useForm<const TSchema>(options: UseFormOptions<TSchema, Infer<TSchema>>) — values typed, explicit-generic escape hatch kept.
```

### 3. Perf: cache the schema walk (no API change)

```ts
// adapters/shared or core: WeakMap<TSchema, { fieldMap, resolver }> — GC-safe, survives inline schemas.
const fieldMapCache = new WeakMap<object, SchemaTree>();
// use-form: resolve onSubmit/onInvalid through a ref so the returned `form` memo
// ([methods, fieldMap] only) stays stable across inline-callback renders;
// Form's handleSubmit binds to stable methods, not [form].
```

Also document: hoist `schema` and `defaultValues` out of render. Lint-proof and faster than any deep-compare dep.

### 4. Perf: memoize field resolution; allow async submit

```tsx
// inside factory SmartField:
const def = useMemo(() => resolveFieldDef(fieldMap, name), [fieldMap, name]);
// types: onSubmit: (values: TValues) => void | Promise<void>;
// Form.handleSubmit already supports promise returns via RHF; document formState.isSubmitting instead of new state.
```

### 5–6. Widgets: typed identity helpers (zero runtime)

```ts
export type FieldKindValueMap = {
  string: string; email: string; url: string; password: string;
  textarea: string; combobox: string; number: number; slider: number;
  boolean: boolean; checkbox: boolean; switch: boolean;
  enum: string; date: Date | undefined; array: unknown[];
  object: Record<string, unknown>;
};
export const defineFieldComponent =
  <TValue = unknown, TConfig = Record<string, unknown>>(
    c: React.ComponentType<FieldComponentProps<TValue, TConfig>>,
  ) => c;
export const defineFieldComponents = (m: FieldComponentMap) => m; // excess-key / missing-kind check at build time
export type ComboboxConfig = { options: string[] };
// FieldComponentProps becomes generic with defaults (backward-compatible):
// FieldComponentProps<TValue = unknown, TConfig = Record<string, unknown>>
```

### 7–8. `<AutoForm>` + `<AutoFields>` (thin, additive)

```tsx
<AutoForm schema={schema} onSubmit={onSubmit} onInvalid={...} defaultValues={...} mode="onBlur" className={...}>
  <AutoFields exclude={["password"]} /> {/* or include/order; top-level keys in fieldMap order; objects opt-in via explicit SmartField */}
</AutoForm>
// AutoForm = useForm(...) + <Form form> in ~20 lines; passes fieldMap through existing context (no new provider).
// AutoFields = Object.keys(fieldMap) → <SmartField name> with include/exclude/order filter. No layout engine, no virtualization (document: >200 fields → paginate).
```

### 9. Arrays: `appendDefault`, no new context

```tsx
<SmartFieldArray name="tasks">
  {({ fields, appendDefault, remove }) => (<>
    {fields.map((row, i) => <SmartField key={row.id} name={`tasks.${i}.title`} />)}
    <button type="button" onClick={() => appendDefault()}>Add</button>
    <button type="button" onClick={() => appendDefault({ title: "New" })}>Add named</button>
  </>)}
</SmartFieldArray>
// impl: def = resolveFieldDef(fieldMap, name).elementDef; default = deriveDefault(elementDef) merged with overrides.
// + export type { FieldArrayRow } from root and ui (today missing from both).
```

### 10. Dev-strict misses + naming cleanup

- `SmartField`: `try resolveFieldDef / lookup` → on miss: `if (onMissingField === "warn" || NODE_ENV === "production") { devWarn(...); return null } throw createFormError(...)` (reuse existing detail lines). Update the `renders nothing` test to expect throw in dev.
- `validationMode`: add `mode` alias, keep `validationMode` deprecated (renaming breaks beta users for zero perf gain).
- Collapse `FormInstance`/`FormContextInstance` or rename to `FormApi`/`FormContextApi` at beta; fix `buildDefaults` docs to 2-arg; bless `import { Form as SmartForm }` alias pattern in README; set `displayName` (`SmartField`, `Form`, `SmartFieldArray`) at creation.

---

## Rollout (alpha-safe order)

- **Patch (non-breaking, ship first):** `adapter` alias + shortcuts, `FieldArrayRow` re-export, `ComboboxConfig` + `defineFieldComponent(s)` helpers, `void | Promise<void>` submit, `displayName`s, `WeakMap` cache + submit-ref stabilization + resolution memo, docs drift fixes.
- **Minor (additive):** `<AutoForm>`, `<AutoFields />`, `appendDefault`, `SchemaAdapter<TSchema, TValues>` inference, dev-strict flag (default throw in dev).
- **Major (beta batch):** remove `schemaResolver` alias, remove `validationMode` alias, collapse instance types.
