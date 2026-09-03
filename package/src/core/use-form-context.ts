import type { Context } from "react";
import type { FieldValues } from "react-hook-form";
import { useFormContext as useRhfContext } from "react-hook-form";

import type { FormContextInstance, FormContextValue } from "#/types";
import { useFormContextValue } from "./form-context";

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
