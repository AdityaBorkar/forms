# ADR 0001: Docs describe actual code, not aspirational names

- **Status:** Accepted
- **Date:** 2026-06-29
- **Decided in:** `/grilling` session (`grill-with-docs` skill)

## Context

`CONTEXT.md` and `GLOSSARY.md` described a *planned* design using names that
did not exist in the codebase:

| Documented (planned) | Actual code |
|---|---|
| `createFormSystem` | `createFormFormat` |
| `SchemaTree` | `FieldMap` |
| `FieldComponentProps` | `FieldRenderProps` |
| `FormContextValue.schemaTree` | `FormContextValue.fieldMap` |

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
`FormContextValue.fieldMap` is a `FieldMap` (the schema-derived metadata tree).
The same identifier denotes two unrelated things.

## Decision

1. **Document actual code.** `CONTEXT.md` and `GLOSSARY.md` use the names that
   exist in the source today (`createFormFormat`, `FieldMap`,
   `FieldRenderProps`, `FormContextValue.fieldMap`). The docs no longer present
   aspirational names as current.

2. **Expand the glossary to the full public surface.** Every exported type from
   `@adistack/forms/core` and `@adistack/forms/adapters/zod` gets a glossary
   entry, ordered by dependency. This makes the glossary a complete map of the
   public API, including the `FormInstance` vs `FormContextInstance` distinction
   the old docs missed.

3. **Reframe "Known Issues & Planned Changes" as "Design Tradeoffs".** CONTEXT.md
   now describes current tradeoffs neutrally (what the design *is* and its costs),
   not a wishlist of renames. Forward-looking work — the renames themselves —
   moves to `TODO.md`, which is the backlog.

4. **Record the `fieldMap` collision as a tradeoff.** The same-name-two-meanings
   issue is documented in CONTEXT.md's tradeoffs and flagged in GLOSSARY.md at
   both `createFormFormat` and `FormContextValue`. The rename is backlog
   (`TODO.md`), not a pretend-current fact.

## Consequences

- `AGENTS.md`'s gotcha about planned-vs-actual names is resolved — the docs now
  match the code, so the cross-reference warning is no longer needed for naming.
- Future renames (`FieldMap` → `SchemaTree`, etc.) become explicit `TODO.md`
  items rather than silent doc drift.
- Anyone reading CONTEXT.md gets an accurate mental model of the running system,
  including its warts (silent `null` on missing field/component, `required`
  derivation, the cast chain, the `fieldMap` collision).
