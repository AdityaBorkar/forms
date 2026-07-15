import type { FieldComponentProps } from "@adistack/forms";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldShell } from "./field-shell";

export function SwitchField({
  name,
  value,
  onChange,
  error,
  disabled,
  meta,
  required,
}: FieldComponentProps) {
  return (
    <FieldShell
      description={meta?.description}
      error={error}
      name={name}
      required={required}
    >
      <div className="flex items-center gap-3">
        <Switch
          checked={value === true}
          disabled={disabled}
          id={name}
          onCheckedChange={onChange}
        />
        {meta?.label ? <Label inputId={name}>{meta.label}</Label> : null}
      </div>
    </FieldShell>
  );
}
