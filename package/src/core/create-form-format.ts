import { createContext } from "react";

import type {
  FieldComponentMap,
  FormContextValue,
  SchemaAdapter,
} from "@/types";
import { createSmartField } from "@/ui/smart-field";
import { SmartFieldArray } from "@/ui/smart-field-array";

import { createForm } from "./form";
import { createUseForm } from "./use-form";
import { createUseFormContext } from "./use-form-context";

export function createFormFormat<TSchema = unknown>(options: {
  fieldMap: FieldComponentMap;
  schemaResolver: SchemaAdapter<TSchema>;
}) {
  const { fieldMap: fieldComponents, schemaResolver } = options;

  const FormContext = createContext<FormContextValue | null>(null);

  const useForm = createUseForm<TSchema>(schemaResolver);
  const useFormContext = createUseFormContext(FormContext);
  const Form = createForm(FormContext);
  const SmartField = createSmartField(FormContext, fieldComponents);

  return {
    Form,
    SmartField,
    SmartFieldArray,
    useForm,
    useFormContext,
  };
}
