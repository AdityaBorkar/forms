import type { Context } from "react";
import { useContext } from "react";
import { Controller, useFormContext as useRhfContext } from "react-hook-form";

import type {
  FieldComponentMap,
  FieldDef,
  FieldMap,
  FieldRenderProps,
  FormContextValue,
} from "@/types";

export type SmartFieldProps = {
  name: string;
  disabled?: boolean;
  config?: Record<string, unknown>;
};

function isNumeric(segment: string): boolean {
  return segment.length > 0 && /^\d+$/.test(segment);
}

export function resolveFieldDef(
  fieldMap: FieldMap,
  name: string,
): FieldDef | undefined {
  const segments = name.split(".");
  let def: FieldDef | undefined = fieldMap[segments[0] ?? ""];
  if (!def) return undefined;
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    if (isNumeric(segment)) continue;
    const next: FieldDef | undefined = def.fields?.[segment];
    if (!next) return undefined;
    def = next;
  }
  return def;
}

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
            checks: def.checks,
            config,
            disabled,
            entries: def.entries,
            error: fieldState.error?.message,
            fields: def.fields,
            max: def.max,
            meta: def.meta,
            min: def.min,
            name,
            onBlur: field.onBlur,
            onChange: field.onChange,
            optional: def.optional,
            ref: field.ref,
            required: def.required,
            value: field.value,
          };
          return <Component {...renderProps} />;
        }}
      />
    );
  }

  return SmartField;
}
