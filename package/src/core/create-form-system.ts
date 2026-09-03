import type { ComponentType, ReactElement } from "react";
import { createContext } from "react";
import type { FieldValues } from "react-hook-form";

import { createFormError } from "@/errors";
import type {
	FieldComponentMap,
	FormContextInstance,
	FormContextValue,
	FormInstance,
	SchemaAdapter,
	UseFormOptions,
} from "@/types";
import type { SmartFieldProps } from "@/ui/smart-field";
import { createSmartField } from "@/ui/smart-field";
import type { SmartFieldArrayProps } from "@/ui/smart-field-array";
import { createSmartFieldArray } from "@/ui/smart-field-array";
import type { FormProps } from "./form";
import { createForm } from "./form";
import { createUseForm } from "./use-form";
import { createUseFormContext } from "./use-form-context";

export type CreateFormSystemOptions<TSchema> = {
	fieldComponents: FieldComponentMap;
	schemaResolver: SchemaAdapter<TSchema>;
};

export type FormSystem<TSchema> = {
	Form: <TValues extends FieldValues = FieldValues>(
		props: FormProps<TValues>,
	) => ReactElement;
	SmartField: ComponentType<SmartFieldProps>;
	SmartFieldArray: ComponentType<SmartFieldArrayProps>;
	useForm: <TValues extends FieldValues = FieldValues>(
		options: UseFormOptions<TSchema, TValues>,
	) => FormInstance<TValues>;
	useFormContext: <
		TValues extends FieldValues = FieldValues,
	>() => FormContextInstance<TValues>;
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
	for (const [kind, Component] of Object.entries(fieldComponents)) {
		if (typeof Component !== "function") {
			throw createFormError(`Invalid component registered for kind "${kind}"`, [
				`Expected a React component, received ${typeof Component}.`,
				`Check the fieldComponents map passed to createFormSystem().`,
			]);
		}
	}

	const useForm = createUseForm<TSchema>(schemaResolver);
	const FormContext = createContext<FormContextValue | null>(null);
	const useFormContext = createUseFormContext(FormContext);
	const Form = createForm(FormContext);
	const SmartField = createSmartField(FormContext, fieldComponents);
	const SmartFieldArray = createSmartFieldArray(FormContext);

	return {
		Form,
		SmartField,
		SmartFieldArray,
		useForm,
		useFormContext,
	};
}
