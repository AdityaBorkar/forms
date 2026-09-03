import type {
	Context,
	ReactElement,
	ReactNode,
	SubmitEventHandler,
} from "react";
import { useCallback, useMemo } from "react";
import type { FieldValues } from "react-hook-form";
import { FormProvider } from "react-hook-form";

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
		const { fieldMap, onSubmit, onInvalid: _onInvalid, ...rhfMethods } = form;

		const contextValue = useMemo(() => ({ fieldMap }), [fieldMap]);

		const handleSubmit: SubmitEventHandler = useCallback(
			(event) => {
				event.preventDefault();
				form.handleSubmit(form.onSubmit, form.onInvalid)(event);
			},
			[form],
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

	return Form as <TValues extends FieldValues = FieldValues>(
		props: FormProps<TValues>,
	) => ReactElement;
}
