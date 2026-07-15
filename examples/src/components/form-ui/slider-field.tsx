import type { FieldComponentProps } from "@adistack/forms";
import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";
import { FieldShell } from "./field-shell";

export function SliderField({
  name,
  value,
  onChange,
  error,
  disabled,
  meta,
  required,
  min,
  max,
}: FieldComponentProps) {
  const handleChange = useCallback(
    (value: number | readonly number[]) =>
      onChange(Array.isArray(value) ? value[0] : value),
    [onChange],
  );
  const numeric = typeof value === "number" ? value : 0;
  return (
    <FieldShell
      description={meta?.description}
      error={error}
      label={meta?.label}
      name={name}
      required={required}
    >
      <div className="flex items-center gap-4">
        <Slider
          className="flex-1"
          disabled={disabled}
          max={typeof max === "number" ? max : 100}
          min={typeof min === "number" ? min : 0}
          onValueChange={handleChange}
          value={[numeric]}
        />
        <output className="w-8 text-right text-sm tabular-nums">
          {numeric}
        </output>
      </div>
    </FieldShell>
  );
}
