import type { Context } from "react";
import { useContext } from "react";

import { createFormError } from "#/errors";
import type { FormContextValue } from "#/types";

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
