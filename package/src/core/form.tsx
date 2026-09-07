import type {
	Context,
	ReactElement,
	ReactNode,
	SubmitEventHandler,
} from "react";
import { useCallback, useMemo } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { FormProvider } from "react-hook-form";

import { createFormError } from "#/core/errors.ts";
import type { FormContextValue, FormInstance } from "#/types";

export type FormProps<TValues extends FieldValues = FieldValues> = {
	form: FormInstance<TValues>;
	className?: string;
	children?: ReactNode;
};

export function createForm(
	FormContext: Context<FormContextValue | null>,
): <TValues extends FieldValues = FieldValues>(
	props: FormProps<TValues>,
) => ReactElement {
	function Form<TValues extends FieldValues = FieldValues>({
		form,
		className,
		children,
	}: FormProps<TValues>): ReactElement {
		if (!form) {
			throw createFormError("<Form> requires a form prop", [
				"Pass the object returned by useForm(), e.g. <Form form={form}>.",
				"Make sure <Form> and useForm come from the same createFormSystem() call.",
			]);
		}
		const { fieldMap, onSubmit, onInvalid, onSubmitError, ...rhfMethods } =
			form;

		const contextValue = useMemo(() => ({ fieldMap }), [fieldMap]);

		const handleSubmit: SubmitEventHandler = useCallback(
			(event) => {
				event.preventDefault();
				const result = rhfMethods.handleSubmit(onSubmit, onInvalid)(event);
				void Promise.resolve(result).catch((error: unknown) => {
					const message =
						error instanceof Error ? error.message : String(error);
					rhfMethods.setError("root.serverError" as FieldPath<TValues>, {
						message,
						type: "server",
					});
					onSubmitError?.(error);
				});
			},
			[
				rhfMethods.handleSubmit,
				rhfMethods.setError,
				onSubmit,
				onInvalid,
				onSubmitError,
			],
		);

		return (
			<FormContext value={contextValue}>
				<FormProvider {...rhfMethods}>
					<form className={className} onSubmit={handleSubmit}>
						{children}
					</form>
				</FormProvider>
			</FormContext>
		);
	}

	return Form;
}
