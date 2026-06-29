# TODO

- Publish to NPM
  - alpha
  - latest
- Write a README file

## Phase 1

Write examples of the form with schemas in @examples :
1. Simple example with two fields
2. Example with Nested Fields in the same form
3. Example with Array Fields
4. Example with Custom Fields Types
5. Example with Custom Field Component

- Smart Component Support
- Cast chain: 3 as never casts + 1 as unknown as + 1 as object across use-form.ts, form.tsx, use-form-context.ts. Root cause is SchemaAdapter<TSchema = unknown> — the unknown default loses type info at the boundary. A future tightening of the generic chain would eliminate most of these.
- deriveDefault knows about string-derived kinds (textarea, password, combobox, checkbox) — these are adapter-level overrides, not primitive types. This coupling between buildFieldDef's meta.component override and deriveDefault's kind switch is fragile; adding a new component override requires updating both paths.

## Phase 1

- Review
  - improve-codebase-arch
  - thermo-nuclear
  - grill-with-docs
  - security-audit

## Phase 2

- Write tests
  - E2E
  - Unit
- @abstack/conform
  - Write a README
  - GitHub Actions

## Features not supported / planned:

- Nested Forms
