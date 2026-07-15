import type { FieldComponentProps } from "@adistack/forms";
import { type ChangeEvent, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { FieldShell } from "./field-shell";

export function TextField({
  name,
  value,
  onChange,
  onBlur,
  ref,
  error,
  disabled,
  meta,
  required,
  kind,
}: FieldComponentProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    [onChange],
  );
  const type =
    kind === "email"
      ? "email"
      : kind === "url"
        ? "url"
        : kind === "password"
          ? "password"
          : "text";
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
        type={type}
        value={String(value ?? "")}
      />
    </FieldShell>
  );
}
