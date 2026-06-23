import type { ControllerRenderProps } from "react-hook-form";

import type { FieldMeta } from "../hooks/use-form";

type EnumFieldRenderProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean | undefined;
  placeholder: string | undefined;
  options: { value: string; label: string }[];
};

type EnumFieldProps = {
  field: ControllerRenderProps;
  meta: FieldMeta | undefined;
  disabled: boolean | undefined;
  entries: Record<string, string> | undefined;
  children: (props: EnumFieldRenderProps) => React.ReactNode;
};

function EnumField({
  field,
  meta,
  disabled,
  entries,
  children,
}: EnumFieldProps) {
  const options = entries
    ? Object.entries(entries).map(([value, label]) => ({ label, value }))
    : [];

  return children({
    disabled,
    onChange: field.onChange,
    options,
    placeholder: meta?.placeholder,
    value: field.value,
  });
}

export type { EnumFieldProps, EnumFieldRenderProps };
export { EnumField };
