import type { ComponentType } from "react";

import { ArrayForm } from "./array-form.tsx";
import { CustomComponentForm } from "./custom-component.tsx";
import { DefaultsOptionalForm } from "./defaults-optional.tsx";
import { FieldKindsForm } from "./field-kinds.tsx";
import { FormContextForm } from "./form-context.tsx";
import { NestedForm } from "./nested-form.tsx";
import { ServerSubmitForm } from "./server-submit.tsx";
import { SimpleForm } from "./simple-form.tsx";
import { ValibotFormExample } from "./valibot-form.tsx";
import { ValidationModesForm } from "./validation-modes.tsx";

export type ExampleMeta = {
	slug: string;
	title: string;
	files: string[];
	description: string;
	component: ComponentType;
};

export const EXAMPLES: ExampleMeta[] = [
	{
		component: SimpleForm,
		description: "Two fields, zero wiring.",
		files: ["examples/simple-form.tsx", "components/form-zod.tsx"],
		slug: "simple-form",
		title: "Simple Form",
	},
	{
		component: NestedForm,
		description: "Dotted names into objects.",
		files: ["examples/nested-form.tsx", "components/form-zod.tsx"],
		slug: "nested-form",
		title: "Nested Fields",
	},
	{
		component: ArrayForm,
		description: "Append, update, move, remove.",
		files: ["examples/array-form.tsx", "components/form-zod.tsx"],
		slug: "array-form",
		title: "Array Fields",
	},
	{
		component: FieldKindsForm,
		description: "Every widget, one schema.",
		files: ["examples/field-kinds.tsx", "components/form-zod.tsx"],
		slug: "field-kinds",
		title: "Every Field Kind",
	},
	{
		component: CustomComponentForm,
		description: "Your own widget for a base kind.",
		files: ["examples/custom-component.tsx"],
		slug: "custom-component",
		title: "Custom Component",
	},
	{
		component: ValidationModesForm,
		description: "Modes + onInvalid.",
		files: ["examples/validation-modes.tsx", "components/form-zod.tsx"],
		slug: "validation-modes",
		title: "Validation Modes",
	},
	{
		component: DefaultsOptionalForm,
		description: "Optional + explicit defaultValues.",
		files: ["examples/defaults-optional.tsx", "components/form-zod.tsx"],
		slug: "defaults-optional",
		title: "Defaults & Optional",
	},
	{
		component: FormContextForm,
		description: "watch/reset, disabled, config.",
		files: ["examples/form-context.tsx", "components/form-zod.tsx"],
		slug: "form-context",
		title: "useFormContext",
	},
	{
		component: ValibotFormExample,
		description: "Same UI, Valibot schemas.",
		files: ["examples/valibot-form.tsx", "components/form-valibot.tsx"],
		slug: "valibot-form",
		title: "Valibot Adapter",
	},
	{
		component: ServerSubmitForm,
		description: "POST to the API, echo demo.",
		files: ["examples/server-submit.tsx", "components/form-wrapper.tsx"],
		slug: "server-submit",
		title: "Server Submit",
	},
];
