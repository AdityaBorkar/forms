import type React from "react";
import type { Resolver } from "react-hook-form";

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

export type FieldRenderProps = FieldDef & {
  name: string;
  value: unknown;
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
  React.ComponentType<FieldRenderProps>
>;

export type SchemaAdapter<TSchema = unknown> = {
  buildFieldMap(schema: TSchema): FieldMap;
  buildDefaults(
    schema: TSchema,
    fieldMap: FieldMap,
    overrides?: Record<string, unknown>,
  ): Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: adapter cannot know TValues — produces a generic RHF resolver
  createResolver(schema: TSchema): Resolver<any>;
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
