import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { Controller, useFormContext as useRhfContext } from "react-hook-form";

import { useFormContext } from "../context";
import type { FieldDef } from "../hooks/use-form";
import { unwrapOptional } from "../hooks/use-form";
import type { BooleanFieldRenderProps } from "./boolean-field";
import { BooleanField } from "./boolean-field";
import type {
  ComboboxConfig,
  ComboboxFieldRenderProps,
  ComboboxOption,
} from "./combobox-field";
import { ComboboxField } from "./combobox-field";
import type { EnumFieldRenderProps } from "./enum-field";
import { EnumField } from "./enum-field";
import type { FieldArrayConfig, FieldArrayRenderProps } from "./field-array";
import { FieldArray } from "./field-array";
import type { NumberFieldRenderProps } from "./number-field";
import { NumberField } from "./number-field";
import type { StringFieldRenderProps } from "./string-field";
import { StringField } from "./string-field";

type FieldConfig = ComboboxConfig<ComboboxOption> | FieldArrayConfig;

type FieldRenderProps =
  | {
      kind: "string";
      render: (
        fn: (props: StringFieldRenderProps) => React.ReactNode,
      ) => React.ReactNode;
    }
  | {
      kind: "number";
      render: (
        fn: (props: NumberFieldRenderProps) => React.ReactNode,
      ) => React.ReactNode;
    }
  | {
      kind: "boolean";
      render: (
        fn: (props: BooleanFieldRenderProps) => React.ReactNode,
      ) => React.ReactNode;
    }
  | {
      kind: "enum";
      render: (
        fn: (props: EnumFieldRenderProps) => React.ReactNode,
      ) => React.ReactNode;
    }
  | {
      kind: "combobox";
      render: (
        fn: (props: ComboboxFieldRenderProps) => React.ReactNode,
      ) => React.ReactNode;
    }
  | {
      kind: "array";
      render: (
        fn: (props: FieldArrayRenderProps) => React.ReactNode,
      ) => React.ReactNode;
    };

type FieldShellProps = {
  label: string;
  error?: string;
  description?: string;
  children: React.ReactNode;
};

type FieldProps = {
  name: string;
  disabled?: boolean;
  config?: FieldConfig;
  children: (props: {
    label: string;
    error?: string;
    description?: string;
    fieldProps: FieldRenderProps;
  }) => React.ReactNode;
};

function FieldShell({ label, error, description, children }: FieldShellProps) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error && <span role="alert">{error}</span>}
      {description && !error && <small>{description}</small>}
    </div>
  );
}

function buildFieldProps(
  def: FieldDef,
  field: ControllerRenderProps,
  disabled: boolean | undefined,
  config: FieldConfig | undefined,
  control: UseFormReturn["control"],
): FieldRenderProps {
  if (def.meta?.component === "combobox") {
    return {
      kind: "combobox",
      render: (children) => (
        <ComboboxField
          config={config as ComboboxConfig<ComboboxOption> | undefined}
          disabled={disabled}
          field={field}
          meta={def.meta}
        >
          {children}
        </ComboboxField>
      ),
    };
  }

  switch (def.kind) {
    case "string":
      return {
        kind: "string",
        render: (children) => (
          <StringField
            checks={def.checks}
            disabled={disabled}
            field={field}
            meta={def.meta}
          >
            {children}
          </StringField>
        ),
      };
    case "number":
      return {
        kind: "number",
        render: (children) => (
          <NumberField disabled={disabled} field={field} meta={def.meta}>
            {children}
          </NumberField>
        ),
      };
    case "boolean":
      return {
        kind: "boolean",
        render: (children) => (
          <BooleanField
            disabled={disabled}
            field={field}
            label={def.meta?.label ?? ""}
            meta={def.meta}
          >
            {children}
          </BooleanField>
        ),
      };
    case "enum":
      return {
        kind: "enum",
        render: (children) => (
          <EnumField
            disabled={disabled}
            entries={def.entries}
            field={field}
            meta={def.meta}
          >
            {children}
          </EnumField>
        ),
      };
    case "array":
      return {
        kind: "array",
        render: (children) => (
          <FieldArray
            config={config as FieldArrayConfig | undefined}
            control={control}
            disabled={disabled}
            elementFields={def.element}
            meta={def.meta}
            name={field.name}
          >
            {children}
          </FieldArray>
        ),
      };
    default:
      return { kind: "string", render: () => null };
  }
}

function Field({ name, disabled, config, children }: FieldProps) {
  const { fieldMap } = useFormContext();
  const { control } = useRhfContext();

  const fieldDef = fieldMap[name];
  if (!fieldDef) return null;

  const resolved = unwrapOptional(fieldDef);
  const label = resolved.meta?.label ?? name;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const fieldProps = buildFieldProps(
          resolved,
          field,
          disabled,
          config,
          control,
        );

        return (
          <>
            {children({
              description: resolved.meta?.description,
              error,
              fieldProps,
              label,
            })}
          </>
        );
      }}
    />
  );
}

export type { FieldConfig, FieldProps, FieldRenderProps, FieldShellProps };
export { Field, FieldShell };
