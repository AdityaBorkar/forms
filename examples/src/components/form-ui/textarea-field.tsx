import type { FieldComponentProps } from "@adistack/forms";
import { type ChangeEvent, useCallback } from "react";

import { Textarea } from "@/components/ui/textarea";
import { FieldShell } from "./field-shell";

export function TextareaField({
  name,
  value,
  onChange,
  onBlur,
  ref,
  error,
  disabled,
  meta,
  required,
}: FieldComponentProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value),
    [onChange],
  );
  return (
    <FieldShell
      description={meta?.description}
      error={error}
      label={meta?.label}
      name={name}
      required={required}
    >
      <Textarea
        disabled={disabled}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={handleChange}
        placeholder={meta?.placeholder}
        ref={ref}
        value={String(value ?? "")}
      />
    </FieldShell>
  );
}
