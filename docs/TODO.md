# TODO

## Phase 1

- Write Examples (using bun)
- Write Tests
- Smart Component Support
- Cast chain: 3 as never casts + 1 as unknown as + 1 as object across use-form.ts, form.tsx, use-form-context.ts. Root cause is SchemaAdapter<TSchema = unknown> — the unknown default loses type info at the boundary. A future tightening of the generic chain would eliminate most of these.
- deriveDefault knows about string-derived kinds (textarea, password, combobox, checkbox) — these are adapter-level overrides, not primitive types. This coupling between buildFieldDef's meta.component override and deriveDefault's kind switch is fragile; adding a new component override requires updating both paths.

## Phase 2

- Write a README
- GitHub Actions
- conform

## Features not supported / planned:

- Nested Forms
