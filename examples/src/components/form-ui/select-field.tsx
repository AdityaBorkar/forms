import type { FieldRenderProps } from "@adistack/forms/core";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FieldShell } from "./field-shell";

export function SelectField({
  name,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  meta,
  required,
  entries,
}: FieldRenderProps) {
  const options = entries ? Object.entries(entries) : [];
  return (
    <FieldShell
      description={meta?.description}
      error={error}
      label={meta?.label}
      name={name}
      required={required}
    >
      <Select
        disabled={disabled}
        onValueChange={onChange}
        value={String(value ?? "")}
      >
        <SelectTrigger className="w-full" id={name} onBlur={onBlur}>
          <SelectValue placeholder={meta?.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
