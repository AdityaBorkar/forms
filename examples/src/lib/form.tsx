import {
	createFormSystem,
	type FieldComponentMap,
	type FormSystem,
} from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";
import type { FieldValues } from "react-hook-form";
import type { ZodType } from "zod";

import {
	CheckboxField,
	NumberField,
	SelectField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from "@/components/form-ui";

const fieldComponents: FieldComponentMap = {
	boolean: CheckboxField,
	checkbox: CheckboxField,
	email: TextField,
	enum: SelectField,
	number: NumberField,
	password: TextField,
	slider: SliderField,
	string: TextField,
	switch: SwitchField,
	textarea: TextareaField,
	unknown: TextField,
	url: TextField,
};

const system: FormSystem<ZodType<FieldValues, FieldValues>> = createFormSystem({
	fieldComponents,
	schemaResolver: zodAdapter,
});

export const { SmartField, SmartFieldArray, Form, useForm, useFormContext } =
	system;
