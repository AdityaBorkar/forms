import { useMemo } from "react";
import type {
  DefaultValues,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import type { FieldMap, SchemaAdapter, UseFormOptions } from "@/types";

export type FormContextInstance<TValues extends FieldValues = FieldValues> =
  UseFormReturn<TValues> & {
    fieldMap: FieldMap;
  };

export type FormInstance<TValues extends FieldValues = FieldValues> =
  FormContextInstance<TValues> & {
    onSubmit: (values: TValues) => void;
    onInvalid?: (errors: Record<string, unknown>) => void;
  };

export function createUseForm<TSchema>(adapter: SchemaAdapter<TSchema>) {
  return function useForm<TValues extends FieldValues = FieldValues>(
    options: UseFormOptions<TSchema, TValues>,
  ): FormInstance<TValues> {
    const {
      schema,
      onSubmit,
      onInvalid,
      defaultValues,
      validationMode = "onBlur",
    } = options;

    const fieldMap = useMemo(() => adapter.buildFieldMap(schema), [schema]);
    const defaults = useMemo(
      () => adapter.buildDefaults(schema, defaultValues),
      [schema, defaultValues],
    );
    const resolver = useMemo(() => adapter.createResolver(schema), [schema]);

    const methods = useRhfForm<TValues>({
      defaultValues: defaults as DefaultValues<TValues>,
      mode: validationMode,
      resolver: resolver as never,
      reValidateMode: "onChange",
    }) as unknown as UseFormReturn<TValues>;

    return {
      ...methods,
      fieldMap,
      onInvalid,
      onSubmit,
    };
  };
}
