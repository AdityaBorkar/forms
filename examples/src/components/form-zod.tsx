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
	DateField,
	NumberField,
	SelectField,
	TextField,
} from "#/components/form-ui";

/**
 * Shared form system for every Zod example. One `createFormSystem` call per
 * app is the norm — the `fieldComponents` map is closed over, so each base
 * `kind` always renders the same widget.
 */
const fieldComponents: FieldComponentMap = {
	boolean: CheckboxField,
	date: DateField,
	email: TextField,
	enum: SelectField,
	number: NumberField,
	string: TextField,
	url: TextField,
};

const system: FormSystem<ZodType<FieldValues, FieldValues>> = createFormSystem({
	fieldComponents,
	schemaResolver: zodAdapter,
});

export const { SmartField, SmartFieldArray, Form, useForm, useFormContext } =
	system;
