import type { FieldRenderProps } from "@adistack/forms/core";
import { type ChangeEvent, type ReactNode, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function FieldShell({
  children,
  description,
  error,
  label,
  name,
  required,
}: {
  children: ReactNode;
  description?: string;
  error?: string;
  label?: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {label ? (
        <Label htmlFor={name}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

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
}: FieldRenderProps) {
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
}: FieldRenderProps) {
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
}: FieldRenderProps) {
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
}: FieldRenderProps) {
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
        {meta?.label ? <Label htmlFor={name}>{meta.label}</Label> : null}
      </div>
    </FieldShell>
  );
}

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

export function SwitchField({
  name,
  value,
  onChange,
  error,
  disabled,
  meta,
  required,
}: FieldRenderProps) {
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
        {meta?.label ? <Label htmlFor={name}>{meta.label}</Label> : null}
      </div>
    </FieldShell>
  );
}

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
}: FieldRenderProps) {
  const handleChange = useCallback(
    (values: number[]) => onChange(values[0]),
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
