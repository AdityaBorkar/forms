import type { ControllerRenderProps } from "react-hook-form";

import type { FieldMeta } from "../hooks/use-form";

type BooleanFieldRenderProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
  disabled: boolean | undefined;
  label: string;
  variant: "switch" | "checkbox";
  ref: ControllerRenderProps["ref"];
};

type BooleanFieldProps = {
  field: ControllerRenderProps;
  meta: FieldMeta | undefined;
  disabled: boolean | undefined;
  label: string;
  children: (props: BooleanFieldRenderProps) => React.ReactNode;
};

function BooleanField({
  field,
  meta,
  disabled,
  label,
  children,
}: BooleanFieldProps) {
  const variant = meta?.component === "checkbox" ? "checkbox" : "switch";

  return children({
    checked: field.value ?? false,
    disabled,
    label,
    onBlur: field.onBlur,
    onChange: (checked: boolean) => field.onChange(checked),
    ref: field.ref,
    variant,
  });
}

export type { BooleanFieldProps, BooleanFieldRenderProps };
export { BooleanField };
