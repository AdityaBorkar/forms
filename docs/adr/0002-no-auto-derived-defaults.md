# No auto-derived defaults; RHF owns defaultValues

`useForm({ defaultValues })` passes straight through to `react-hook-form`; adapters never guess `""`/`0`/`false`/first-enum-entry and array rows require explicit `append(value)`. Guessed defaults passed required validation without user input (`0`, pre-selected enum), so field components must handle `undefined` instead (`value ?? ""` / `checked === true`).

## Considered Options

- Per-kind `deriveDefault`/`buildDefaults` (convenient, but masked required-field UX and fought RHF ownership).

## Consequences

`defaultValues` is the only initial-value path; empty forms stay visibly empty until the user acts.
