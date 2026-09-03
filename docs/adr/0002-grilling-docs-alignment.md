# ADR 0002: Align docs with code in grilling session

- **Status:** Accepted
- **Date:** 2026-09-03
- **Decided in:** `/grilling` session (`grill-with-docs` skill)

## Context

A repo audit found `docs/` and `AGENTS.md` drifting from the code: `TODO.md` was renamed to `USER-TODO.md` (breaking two links), `README` claimed `<Controller>` rendering and a `meta.component` kind override neither implemented in `smart-field.tsx`, the glossary listed extension kinds (`password`, `textarea`, `combobox`, `checkbox`, `slider`, `switch`, `unknown`) the Zod adapter never emits, and `AGENTS.md` claimed `react-hook-form@^7.80`, a `bun test` script, and `ci.yml`/`publish.yml` workflows that don't exist (`.github/workflows/` is empty, peers are `^7.86.0`, tests run via `bunx vitest run`).

## Decision

Keep `docs/USER-TODO.md` and retarget links to it; fix `README`/`CONTEXT`/`GLOSSARY` to describe `register()` + `getFieldState` dispatch via `fieldComponents[def.kind]` with no `meta.component` override; restrict the `Kind` list to the nine Zod-emitted kinds while documenting the unreachable `deriveDefault` branches inline; and correct `AGENTS.md` to the actual toolchain (peer versions, `core/use-form.ts` paths, `bun format` pre-commit, no committed workflows).
