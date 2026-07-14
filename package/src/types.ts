import type React from "react";
import type { Resolver } from "react-hook-form";

export type FieldMeta = {
  label?: string;
  placeholder?: string;
  description?: string;
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
  elementFields?: SchemaTree;
  min?: number;
  max?: number;
  required?: boolean;
};

export type SchemaTree = Record<string, FieldDef>;

export type FieldComponentProps = FieldDef & {
  name: string;
  value?: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  // biome-ignore lint/suspicious/noExplicitAny: mirrors react-hook-form's Ref type
  ref: React.Ref<any>;
  error?: string;
  disabled?: boolean;
  config?: Record<string, unknown>;
};

export type FieldComponentMap = Record<
  string,
  React.ComponentType<FieldComponentProps>
>;

export type SchemaAdapter<TSchema = unknown> = {
  buildFieldMap(schema: TSchema): SchemaTree;
  buildDefaults(
    schema: TSchema,
    fieldMap: SchemaTree,
    overrides?: Record<string, unknown>,
  ): Record<string, unknown>;
  createResolver(schema: TSchema): Resolver;
};

export type ValidationMode = "onBlur" | "onChange" | "onSubmit" | "all";

export type FormContextValue = {
  fieldMap: SchemaTree;
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
