import type { Context } from "react";
import { useContext } from "react";
import type { FieldValues } from "react-hook-form";
import { useFormContext as useRhfContext } from "react-hook-form";

import { createFormError } from "#/core/errors.ts";
import type { FormContextInstance, FormContextValue } from "#/types";

export function useFormContextValue(
	FormContext: Context<FormContextValue | null>,
	caller: "SmartField" | "SmartFieldArray" | "useFormContext",
): FormContextValue {
	const ctx = useContext(FormContext);
	if (!ctx) {
		throw createFormError(`${caller} must be used within a <Form>`, [
			"Wrap your component with the <Form> component returned by createFormSystem().",
			`Make sure both <${caller}> and <Form> come from the same createFormSystem() call.`,
		]);
	}
	return ctx;
}

export function createUseFormContext(
	FormContext: Context<FormContextValue | null>,
): <
	TValues extends FieldValues = FieldValues,
>() => FormContextInstance<TValues> {
	return function useFormContext<
		TValues extends FieldValues = FieldValues,
	>(): FormContextInstance<TValues> {
		const rhf = useRhfContext<TValues>();
		const { fieldMap } = useFormContextValue(FormContext, "useFormContext");
		return { ...rhf, fieldMap };
	};
}
