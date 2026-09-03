import {
	createFormSystem,
	type FieldComponentMap,
	type FormSystem,
} from "@adistack/forms";
import { valibotAdapter } from "@adistack/forms/adapters/valibot";
import type { GenericSchema } from "valibot";

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
} from "@/components/form-ui";

/**
 * Same widget map as the Zod system, but driven by the Valibot adapter.
 * Only the adapter changes — `SmartField`, `Form`, `SmartFieldArray` and
 * every other API stay identical.
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

const system: FormSystem<GenericSchema> = createFormSystem({
	fieldComponents,
	schemaResolver: valibotAdapter,
});

export const {
	SmartField: ValibotSmartField,
	SmartFieldArray: ValibotSmartFieldArray,
	Form: ValibotForm,
	useForm: useValibotForm,
	useFormContext: useValibotFormContext,
} = system;
