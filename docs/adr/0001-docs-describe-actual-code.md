# ADR 0001: Docs describe actual code, not aspirational names

- **Status:** Accepted
- **Date:** 2026-06-29
- **Decided in:** `/grilling` session (`grill-with-docs` skill)

## Context

`CONTEXT.md` and `GLOSSARY.md` described a *planned* design using names that
did not exist in the codebase:

| Documented (planned) | Actual code (then) | Resolved? |
|---|---|---|
| `createFormSystem` | `createFormFormat` | Yes — renamed to `createFormSystem` |
| `SchemaTree` | `FieldMap` | Yes — renamed to `SchemaTree` |
| `FieldComponentProps` | `FieldRenderProps` | Yes — renamed to `FieldComponentProps` |
| `FormContextValue.schemaTree` | `FormContextValue.fieldMap` | No — property name retained |

`AGENTS.md` already flagged this as a gotcha and instructed readers to
cross-reference with source. The mismatch made the docs actively misleading:
they read as current architecture, not as a roadmap.

A second problem: the docs **omitted** real exported types — `FormInstance`,
`FormContextInstance`, `FormProps`, `SmartFieldProps`,
`SmartFieldArrayProps`/`SmartFieldArrayRenderProps`, `FieldArrayRow`,
`ValidationMode` — so the glossary was an incomplete map of the public surface.

A third problem, surfaced during the grilling: there is a **naming collision** the
old docs never mentioned. `createFormFormat`'s option is named `fieldMap` but its
type is `FieldComponentMap` (the UI component registry). Meanwhile
`FormContextValue.fieldMap` is a `SchemaTree` (the schema-derived metadata tree).
The same identifier denotes two unrelated things.

## Decision

1. **Document actual code.** `CONTEXT.md` and `GLOSSARY.md` use the names that
   exist in the source today (`createFormSystem`, `SchemaTree`,
   `FieldComponentProps`, `FormContextValue.fieldMap`). The planned renames have
   been applied to the source.

2. **Expand the glossary to the full public surface.** Every exported type from
   `@adistack/forms` and `@adistack/forms/adapters/zod` gets a glossary
   entry, ordered by dependency. This makes the glossary a complete map of the
   public API, including the `FormInstance` vs `FormContextInstance` distinction
   the old docs missed.

3. **Reframe "Known Issues & Planned Changes" as "Design Tradeoffs".** CONTEXT.md
   now describes current tradeoffs neutrally (what the design *is* and its costs),
   not a wishlist of renames. Forward-looking work — the renames themselves —
   moves to `TODO.md`, which is the backlog.

4. **Record the `fieldMap` collision as a tradeoff.** The same-name-two-meanings
   issue is documented in CONTEXT.md's tradeoffs and flagged in GLOSSARY.md at
   both `createFormSystem` and `FormContextValue`. The option was renamed to
   `fieldComponents`, resolving the collision.

## Consequences

- `AGENTS.md`'s gotcha about planned-vs-actual names is resolved — the docs now
  match the code, and the aspirational renames have been applied.
- The `required` derivation was fixed from `!optional && min != null` to
  `!optional` — a field is "required" when it cannot be omitted.
- The adapter's `createResolver` now returns `Resolver` (not `Resolver<any>`)
  with no cast — it delegates directly to `zodResolver(schema)`.
- `FieldDef.fields` was renamed to `FieldDef.elementFields` to convey that for
  arrays, it holds the element's fields, not the array's own fields.
- Anyone reading CONTEXT.md gets an accurate mental model of the running system,
  including its remaining wart (the `fieldMap` property name retained on
  `FormContextValue`). The cast chain that previously bridged the
  `SchemaAdapter`/RHF boundary has been removed.
