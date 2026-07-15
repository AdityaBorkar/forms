import { createContext } from "react";

import { createFormError } from "@/errors";
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

export function createFormSystem<TSchema>({
  fieldComponents,
  schemaResolver,
}: {
  fieldComponents: FieldComponentMap;
  schemaResolver: SchemaAdapter<TSchema>;
}) {
  // biome-ignore lint/suspicious/noUnnecessaryConditions: runtime guard for developer misuse
  if (!schemaResolver) {
    throw createFormError("createFormSystem requires a schemaResolver", [
      "Pass a schema adapter, e.g. zodAdapter from @adistack/forms/adapters/zod.",
    ]);
  }
  // biome-ignore lint/suspicious/noUnnecessaryConditions: runtime guard for developer misuse
  if (!fieldComponents || Object.keys(fieldComponents).length === 0) {
    throw createFormError(
      "createFormSystem requires at least one field component",
      [
        "Pass a fieldComponents map, e.g. { string: TextInput, number: NumberInput, ... }.",
      ],
    );
  }

  const useForm = createUseForm<TSchema>(schemaResolver);
  const FormContext = createContext<FormContextValue | null>(null);
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
