import type { Context } from "react";
import { useContext } from "react";
import { useFormContext as useRhfContext } from "react-hook-form";

import { resolveFieldDef } from "@/core/field-map";
import type {
  FieldComponentMap,
  FieldComponentProps,
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
      throw new Error("SmartField must be used within a Form");
    }

    const def = resolveFieldDef(ctx.fieldMap, name);

    const Component = fieldComponents[def.kind];
    if (!Component) return null;

    const { ref, onChange, onBlur } = rhf.register(name);
    const { error } = rhf.getFieldState(name);

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
