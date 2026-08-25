import type { Context, ReactNode, SubmitEventHandler } from "react";
import { FormProvider } from "react-hook-form";

import type { FormContextValue } from "@/types";
import type { FormInstance } from "./use-form";

export type FormProps = {
	form: FormInstance;
	className?: string;
	children?: ReactNode;
};

export function createForm(FormContext: Context<FormContextValue | null>) {
	function Form({ form, className, children }: FormProps) {
		const handleSubmit: SubmitEventHandler = (event) => {
			event.preventDefault();
			form.handleSubmit(form.onSubmit, form.onInvalid)(event);
		};

		return (
			<FormContext value={{ fieldMap: form.fieldMap }}>
				<FormProvider {...form}>
					{/* biome-ignore lint/performance/noJsxPropsBind: handleSubmit is a stable reference from the closure */}
					<form className={className} onSubmit={handleSubmit}>
						{children}
					</form>
				</FormProvider>
			</FormContext>
		);
	}

	return Form;
}
