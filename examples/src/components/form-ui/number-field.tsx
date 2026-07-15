import type { FieldComponentProps } from "@adistack/forms";
import { type ChangeEvent, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { FieldShell } from "./field-shell";

export function NumberField({
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
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange(
        event.target.value === "" ? undefined : Number(event.target.value),
      ),
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
      <Input
        disabled={disabled}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={handleChange}
        placeholder={meta?.placeholder}
        ref={ref}
        type="number"
        value={value === undefined || value === null ? "" : String(value)}
      />
    </FieldShell>
  );
}
