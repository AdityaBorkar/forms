import type { Context } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useFormContext as useRhfContext } from "react-hook-form";

import type { FormContextValue, SchemaTree } from "@/types";
import { useFormContextValue } from "./form-context";

export type FormContextInstance<TValues extends FieldValues = FieldValues> =
	UseFormReturn<TValues> & {
		fieldMap: SchemaTree;
	};

export function createUseFormContext(
	FormContext: Context<FormContextValue | null>,
): <
	TValues extends FieldValues = FieldValues,
>() => FormContextInstance<TValues> {
	return function useFormContext<
		TValues extends FieldValues = FieldValues,
	>(): FormContextInstance<TValues> {
		const rhf = useRhfContext<TValues>();
		const ctx = useFormContextValue(FormContext, "useFormContext");
		return {
			...rhf,
			fieldMap: ctx.fieldMap,
		};
	};
}
