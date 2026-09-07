# Factory closes over components and adapter

`createFormSystem({ fieldComponents, schemaResolver, onMissingField })` validates its inputs once and closes over them; `Form`, `SmartField`, `SmartFieldArray`, `useForm`, and `useFormContext` all share one React context. We trade runtime swappability for encapsulation and fail-fast misuse errors — form systems are configured once at module level.

## Considered Options

- Provider with components in context (swappable at runtime, but leaks config and defers errors to render).
- Per-component adapter props (flexible, but repeats wiring on every field).

## Consequences

`SmartField`/`SmartFieldArray`/`useFormContext` throw outside the factory's `<Form>`; mismatched factory pairs fail fast instead of rendering subtly wrong fields.
