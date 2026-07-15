import type { Context } from "react";
import { useContext } from "react";
import { useFormContext as useRhfContext } from "react-hook-form";

import { resolveFieldDef } from "@/core/resolve-field-def";
import { createFormError, devWarn } from "@/errors";
import type {
  FieldComponentMap,
  FieldComponentProps,
  FieldDef,
  FormContextValue,
} from "@/types";

export type SmartFieldProps = {
  name: string;
  disabled?: boolean;
  config?: Record<string, unknown>;
};

export function createSmartField(
  FormContext: Context<FormContextValue | null>,
  fieldComponents: FieldComponentMap,
) {
  function SmartField({ name, disabled, config }: SmartFieldProps) {
    const rhf = useRhfContext();
    const ctx = useContext(FormContext);

    if (!ctx) {
      throw createFormError("SmartField must be used within a <Form>", [
        "Wrap your component with the <Form> component returned by createFormSystem().",
        "Make sure both <SmartField> and <Form> come from the same createFormSystem() call.",
      ]);
    }

    let def: FieldDef;
    try {
      def = resolveFieldDef(ctx.fieldMap, name);
    } catch {
      devWarn(`SmartField: could not render field "${name}"`, [
        "The field was not found in the schema or has an unsupported type.",
        "SmartField will render nothing for this field.",
        "Check that the name prop matches a key in your Zod object schema.",
      ]);
      return null;
    }

    const Component = fieldComponents[def.kind];
    if (!Component) {
      const availableKinds = Object.keys(fieldComponents);
      devWarn(
        `No component registered for field kind "${def.kind}" (field "${name}")`,
        [
          availableKinds.length
            ? `Available component kinds: ${availableKinds.join(", ")}`
            : "No components have been registered.",
          `Add a component for kind "${def.kind}" to the fieldComponents map passed to createFormSystem().`,
        ],
      );
      return null;
    }

    const { ref, onChange, onBlur } = rhf.register(name);
    const { error } = rhf.getFieldState(name, rhf.formState);

    const renderProps: FieldComponentProps = {
      ...def,
      config,
      disabled,
      error: error?.message,
      name,
      onBlur: () =>
        onBlur({ target: { name, value: rhf.getValues(name) }, type: "blur" }),
      onChange: (value: unknown) =>
        onChange({ target: { name, value }, type: "change" }),
      ref,
    };

    return <Component {...renderProps} />;
  }

  return SmartField;
}
