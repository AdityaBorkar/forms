import { createContext, useContext } from "react";

import type { FieldMap } from "./hooks/use-form";

type FormContextValue = {
  fieldMap: FieldMap;
  formId: string;
};

const FormContext = createContext<FormContextValue | null>(null);

function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error("useFormContext: Field must be used within a Form");
  }
  return ctx;
}

export type { FormContextValue };
export { FormContext, useFormContext };
