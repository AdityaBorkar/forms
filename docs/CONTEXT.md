# Forms Context

Schema-driven React forms: the validation schema drives validation, default
values, and rendering. Details live in [ARCHITECTURE.md](./ARCHITECTURE.md);
the full API reference lives in [GLOSSARY.md](./GLOSSARY.md).

## Language

### Schema derivation

**SchemaTree**:
The metadata tree an adapter derives from a schema.
_Avoid_: field map (as a generic phrase), schema tree (lowercase)

**FieldDef**:
One field's resolved metadata (kind, optionality, constraints, nesting).
_Avoid_: field definition (verbose), field config

**Kind**:
The single dispatch string on a FieldDef that selects a UI component.
_Avoid_: type, variant, widget

**Component override**:
A `meta.component` value that replaces the adapter's base kind.
_Avoid_: custom kind, kind override (ambiguous)

**Adapter**:
The boundary that translates one validation library into a SchemaTree,
defaults, and a resolver.
_Avoid_: resolver (too narrow), parser, bridge

### UI dispatch

**FieldComponentMap**:
The kind-to-component table supplied once at factory time.
_Avoid_: field map (collides with SchemaTree), component registry (verbose)

**SmartField**:
The component that resolves one dotted path and renders its mapped component.
_Avoid_: smart input, auto field, controlled field

**SmartFieldArray**:
The repeatable-rows wrapper around an array path.
_Avoid_: field list, dynamic fields, array field

**Form**:
The provider component that binds a FormInstance to React context.
_Avoid_: form wrapper, form provider (collides with RHF)

### Runtime

**FormSystem**:
The closed factory result: Form, SmartField, SmartFieldArray, useForm,
useFormContext.
_Avoid_: form factory, form instance (singular form), form kit

**FieldMap**:
The SchemaTree carried in React context (`FormContextValue.fieldMap`).
_Avoid_: schema tree (when meaning the context value), field components
