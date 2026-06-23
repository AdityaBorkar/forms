import type { ControllerRenderProps } from "react-hook-form";

import type { FieldMeta } from "../hooks/use-form";

type NumberFieldRenderProps = {
  value: string;
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  disabled: boolean | undefined;
  placeholder: string | undefined;
  ref: ControllerRenderProps["ref"];
};

type NumberFieldProps = {
  field: ControllerRenderProps;
  meta: FieldMeta | undefined;
  disabled: boolean | undefined;
  children: (props: NumberFieldRenderProps) => React.ReactNode;
};

function NumberField({ field, meta, disabled, children }: NumberFieldProps) {
  return children({
    disabled,
    onBlur: field.onBlur,
    onChange: (value: string | undefined) => {
      field.onChange(
        value === "" || value === undefined ? undefined : Number(value),
      );
    },
    placeholder: meta?.placeholder,
    ref: field.ref,
    value: field.value ?? "",
  });
}

export type { NumberFieldProps, NumberFieldRenderProps };
export { NumberField };
