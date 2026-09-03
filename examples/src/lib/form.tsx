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
	ComboboxField,
	DateField,
	NumberField,
	SelectField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from "#/components/form-ui";

/**
 * Shared form system for every Zod example. One `createFormSystem` call per
 * app is the norm — the `fieldComponents` map is closed over, so each `kind`
 * (including `meta.component` overrides like `password` / `textarea` /
 * `slider` / `switch` / `combobox`) always renders the same widget.
 */
const fieldComponents: FieldComponentMap = {
	boolean: CheckboxField,
	checkbox: CheckboxField,
	combobox: ComboboxField,
	date: DateField,
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
