import type { ControllerRenderProps } from "react-hook-form";

import type { FieldMeta } from "../hooks/use-form";

type StringFieldRenderProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean | undefined;
  placeholder: string | undefined;
  type: React.HTMLInputTypeAttribute;
  isTextarea: boolean;
  ref: ControllerRenderProps["ref"];
};

type StringFieldProps = {
  field: ControllerRenderProps;
  meta: FieldMeta | undefined;
  disabled: boolean | undefined;
  checks?: string[];
  children: (props: StringFieldRenderProps) => React.ReactNode;
};

function resolveInputType(
  component: string | undefined,
  checks?: string[],
): React.HTMLInputTypeAttribute {
  if (component === "password") return "password";
  if (checks?.includes("email")) return "email";
  if (checks?.includes("url")) return "url";
  return "text";
}

function StringField({
  field,
  meta,
  disabled,
  checks,
  children,
}: StringFieldProps) {
  const component = meta?.component;
  const isTextarea = component === "textarea";
  const inputType = resolveInputType(component, checks);

  return children({
    disabled,
    isTextarea,
    onBlur: field.onBlur,
    onChange: (value: string) => field.onChange(value),
    placeholder: meta?.placeholder,
    ref: field.ref,
    type: isTextarea ? "text" : inputType,
    value: field.value ?? "",
  });
}

export type { StringFieldProps, StringFieldRenderProps };
export { StringField };
