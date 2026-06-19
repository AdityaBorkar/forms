import type { ControllerRenderProps } from "react-hook-form";
import { Controller, useFormContext as useRhfContext } from "react-hook-form";

import { Label } from "@/components/ui/label";

import { useFormContext } from "./context";
import { BooleanField } from "./field-components/boolean-field";
import type {
  ComboboxConfig,
  ComboboxOption,
} from "./field-components/combobox-field";
import { ComboboxField } from "./field-components/combobox-field";
import { EnumField } from "./field-components/enum-field";
import type { FieldArrayConfig } from "./field-components/field-array";
import { FieldArray } from "./field-components/field-array";
import { NumberField } from "./field-components/number-field";
import { StringField } from "./field-components/string-field";
import type { FieldDef } from "./use-form";
import { unwrapOptional } from "./use-form";

type FieldConfig = ComboboxConfig<ComboboxOption> | FieldArrayConfig;

type FieldProps = {
  name: string;
  disabled?: boolean;
  config?: FieldConfig;
  overrides?: (props: {
    field: ControllerRenderProps;
    config: FieldConfig | undefined;
    error?: string;
    disabled?: boolean;
  }) => React.ReactNode;
};

function FieldShell({
  label,
  error,
  description,
  children,
}: {
  label: string;
  error?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
      {description && !error && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}

function Field({ name, disabled, config, overrides }: FieldProps) {
  const { fieldMap } = useFormContext();
  const { control } = useRhfContext();

  const fieldDef = fieldMap[name];
  if (!fieldDef) return null;

  const resolved = unwrapOptional(fieldDef);
  const label = resolved.meta?.label ?? name;

  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;

        if (overrides) {
          return (
            <FieldShell
              description={resolved.meta?.description}
              error={error}
              label={label}
            >
              {overrides({ config, disabled, error, field })}
            </FieldShell>
          );
        }

        if (resolved.kind === "array") {
          return (
            <FieldShell error={error} label={label}>
              <FieldArray
                config={config as FieldArrayConfig | undefined}
                control={control}
                disabled={disabled}
                elementFields={resolved.element}
                meta={resolved.meta}
                name={name}
              />
            </FieldShell>
          );
        }

        return (
          <FieldShell
            description={resolved.meta?.description}
            error={error}
            label={label}
          >
            {renderField(resolved, field, disabled, config)}
          </FieldShell>
        );
      }}
    />
  );
}

function renderField(
  def: FieldDef,
  field: ControllerRenderProps,
  disabled: boolean | undefined,
  config: FieldConfig | undefined,
): React.ReactNode {
  if (def.meta?.component === "combobox") {
    return (
      <ComboboxField
        config={config as ComboboxConfig<ComboboxOption> | undefined}
        disabled={disabled}
        field={field}
        meta={def.meta}
      />
    );
  }

  switch (def.kind) {
    case "string":
      return (
        <StringField
          checks={def.checks}
          disabled={disabled}
          field={field}
          meta={def.meta}
        />
      );
    case "number":
      return <NumberField disabled={disabled} field={field} meta={def.meta} />;
    case "boolean":
      return (
        <BooleanField
          disabled={disabled}
          field={field}
          label={def.meta?.label ?? ""}
          meta={def.meta}
        />
      );
    case "enum":
      return (
        <EnumField
          disabled={disabled}
          entries={def.entries}
          field={field}
          meta={def.meta}
        />
      );
    default:
      return null;
  }
}

export type { FieldConfig, FieldProps };
export { Field };
