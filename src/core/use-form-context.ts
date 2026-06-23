import type { Context } from "react";
import { useContext } from "react";
import type { FieldValues } from "react-hook-form";
import { useFormContext as useRhfContext } from "react-hook-form";

import type { FormContextValue } from "./types";
import type { FormContextInstance } from "./use-form";

export function createUseFormContext(
  FormContext: Context<FormContextValue | null>,
) {
  return function useFormContext<
    TValues extends FieldValues = FieldValues,
  >(): FormContextInstance<TValues> {
    const rhf = useRhfContext<TValues>();
    const ctx = useContext(FormContext);
    if (!ctx) {
      throw new Error("useFormContext must be used within a Form");
    }
    return {
      ...(rhf as object),
      fieldMap: ctx.fieldMap,
    } as FormContextInstance<TValues>;
  };
}
