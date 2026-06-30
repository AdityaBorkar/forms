import type { Context } from "react";
import { useContext } from "react";
import { Controller, useFormContext as useRhfContext } from "react-hook-form";

import { resolveFieldDef } from "@/core/field-map";
import type {
  FieldComponentMap,
  FieldRenderProps,
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
    if (!def) return null;

    const Component = fieldComponents[def.kind];
    if (!Component) return null;

    return (
      <Controller
        control={rhf.control}
        name={name}
        // biome-ignore lint/performance/noJsxPropsBind: Controller render API requires inline function
        render={({ field, fieldState }) => {
          const renderProps: FieldRenderProps = {
            ...def,
            config,
            disabled,
            error: fieldState.error?.message,
            name,
            onBlur: field.onBlur,
            onChange: field.onChange,
            ref: field.ref,
            value: field.value,
          };
          return <Component {...renderProps} />;
        }}
      />
    );
  }

  return SmartField;
}
