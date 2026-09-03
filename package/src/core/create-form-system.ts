import type { ComponentType } from "react";
import { createContext } from "react";
import type { FieldValues } from "react-hook-form";

import { createFormError } from "@/errors";
import type {
	FieldComponentMap,
	FormContextValue,
	SchemaAdapter,
	UseFormOptions,
} from "@/types";
import type { SmartFieldProps } from "@/ui/smart-field";
import { createSmartField } from "@/ui/smart-field";
import { SmartFieldArray } from "@/ui/smart-field-array";
import type { FormProps } from "./form";
import { createForm } from "./form";
import type { FormContextInstance, FormInstance } from "./use-form";
import { createUseForm } from "./use-form";
import { createUseFormContext } from "./use-form-context";

export type CreateFormSystemOptions<TSchema> = {
	fieldComponents: FieldComponentMap;
	schemaResolver: SchemaAdapter<TSchema>;
};

export type FormSystem<TSchema> = {
	Form: ComponentType<FormProps>;
	SmartField: ComponentType<SmartFieldProps>;
	SmartFieldArray: typeof SmartFieldArray;
	useForm: <TValues extends FieldValues = FieldValues>(
		options: UseFormOptions<TSchema, TValues>,
	) => FormInstance<TValues>;
	useFormContext: () => FormContextInstance;
};

export function createFormSystem<TSchema>({
	fieldComponents,
	schemaResolver,
}: CreateFormSystemOptions<TSchema>): FormSystem<TSchema> {
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
