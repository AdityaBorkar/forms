import type { Context, ReactNode, SubmitEventHandler } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

import type { FormContextValue } from "@/types";

import type { FormInstance } from "./use-form";

export type FormProps<TValues extends FieldValues = FieldValues> = {
  form: FormInstance<TValues>;
  className?: string;
  children?: ReactNode;
};

export function createForm(FormContext: Context<FormContextValue | null>) {
  function Form<TValues extends FieldValues = FieldValues>({
    form,
    className,
    children,
  }: FormProps<TValues>) {
    const handleSubmit: SubmitEventHandler = (event) => {
      event.preventDefault();
      form.handleSubmit(form.onSubmit as never, form.onInvalid as never)(event);
    };

    return (
      <FormContext value={{ fieldMap: form.fieldMap }}>
        <FormProvider {...(form as unknown as UseFormReturn<TValues>)}>
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
