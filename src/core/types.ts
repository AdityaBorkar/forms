import type React from "react";

export type FieldMeta = {
  label?: string;
  placeholder?: string;
  description?: string;
  component?: string;
  [key: string]: unknown;
};

export type FieldCheck = {
  type: string;
  value?: unknown;
};

export type FieldDef = {
  kind: string;
  optional: boolean;
  meta?: FieldMeta;
  checks?: Array<FieldCheck>;
  entries?: Record<string, string>;
  fields?: FieldMap;
  min?: number;
  max?: number;
  required?: boolean;
};

export type FieldMap = Record<string, FieldDef>;

export type FieldRenderProps = {
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  ref: React.Ref<any>;
  error?: string;
  disabled?: boolean;
  optional: boolean;
  meta?: FieldMeta;
  checks?: Array<FieldCheck>;
  entries?: Record<string, string>;
  fields?: FieldMap;
  min?: number;
  max?: number;
  required?: boolean;
  config?: Record<string, unknown>;
};

export type FieldComponentMap = Record<
  string,
  React.ComponentType<FieldRenderProps>
>;

export type ResolverResult = {
  values?: unknown;
  errors?: Record<string, { type: string; message: string }>;
};

export type SchemaAdapter<TSchema = unknown> = {
  buildFieldMap(schema: TSchema): FieldMap;
  buildDefaults(
    schema: TSchema,
    overrides?: Record<string, unknown>,
  ): Record<string, unknown>;
  createResolver(schema: TSchema): unknown;
};

export type ValidationMode = "onBlur" | "onChange" | "onSubmit" | "all";

export type FormContextValue = {
  fieldMap: FieldMap;
};

export type UseFormOptions<
  TSchema = unknown,
  TValues = Record<string, unknown>,
> = {
  schema: TSchema;
  onSubmit: (values: TValues) => void;
  onInvalid?: (errors: Record<string, unknown>) => void;
  defaultValues?: Record<string, unknown>;
  validationMode?: ValidationMode;
};
