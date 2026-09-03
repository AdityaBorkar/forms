import type {
	ComponentType,
	Context,
	ReactElement,
	ReactNode,
	SubmitEventHandler,
} from "react";
import { FormProvider } from "react-hook-form";

import type { FormContextValue } from "@/types";
import type { FormInstance } from "./use-form";

export type FormProps = {
	form: FormInstance;
	className?: string;
	children?: ReactNode;
};

export function createForm(
	FormContext: Context<FormContextValue | null>,
): ComponentType<FormProps> {
	function Form({ form, className, children }: FormProps): ReactElement {
		const handleSubmit: SubmitEventHandler = (event) => {
			event.preventDefault();
			form.handleSubmit(form.onSubmit, form.onInvalid)(event);
		};

		return (
			<FormContext value={{ fieldMap: form.fieldMap }}>
				<FormProvider {...form}>
					{/* biome-ignore lint/performance/noJsxPropsBind: handler closes over the per-render form instance, so useCallback would not stabilize it */}
					<form className={className} onSubmit={handleSubmit}>
						{children}
					</form>
				</FormProvider>
			</FormContext>
		);
	}

	return Form;
}
