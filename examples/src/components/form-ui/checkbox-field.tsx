import type { FieldComponentProps } from "@adistack/forms/core";
import { type ChangeEvent, useCallback } from "react";

import { Label } from "@/components/ui/label";
import { FieldShell } from "./field-shell";

export function CheckboxField({
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
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked),
    [onChange],
  );
  return (
    <FieldShell
      description={meta?.description}
      error={error}
      name={name}
      required={required}
    >
      <div className="flex items-center gap-2">
        <input
          checked={value === true}
          className="size-4 rounded border border-input accent-primary"
          disabled={disabled}
          id={name}
          name={name}
          onBlur={onBlur}
          onChange={handleChange}
          ref={ref}
          type="checkbox"
        />
        {meta?.label ? <Label inputId={name}>{meta.label}</Label> : null}
      </div>
    </FieldShell>
  );
}
