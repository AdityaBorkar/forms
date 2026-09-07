# One shared field-map engine; adapters are thin primitives

Both `createFieldMap` implementations run through `createFieldMapEngine(AdapterPrimitives)` in `adapters/shared/index.ts`; Zod supplies `_zod.def` access behind a `getZodDef` choke point (fragile by design), Valibot supplies `type`/`entries`/`item`/`wrapped`/`pipe`. Unions keep the single non-`literal` branch else throw, `record`/unknown throw, and no adapter emits `kind: "unknown"` — custom kinds stay a render-time `onMissingField` concern.

## Considered Options

- Independent per-adapter walkers (duplicated optional/union/meta-merge logic and diverging error messages).

## Consequences

New validators only implement `AdapterPrimitives`; optional-unwrap (outer `meta` wins), union, and error-shape behavior stay consistent across adapters.
