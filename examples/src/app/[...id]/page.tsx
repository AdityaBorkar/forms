import type { ComponentType } from "react";

import { ArrayForm } from "#/examples/array-form";
import { CustomComponentForm } from "#/examples/custom-component";
import { DefaultsOptionalForm } from "#/examples/defaults-optional";
import { FieldKindsForm } from "#/examples/field-kinds";
import { FormContextForm } from "#/examples/form-context";
import { NestedForm } from "#/examples/nested-form";
import { ServerSubmitForm } from "#/examples/server-submit";
import { SimpleForm } from "#/examples/simple-form";
import { ValibotFormExample } from "#/examples/valibot-form";
import { ValidationModesForm } from "#/examples/validation-modes";
import NotFoundPage from "../not-found";

export type ExampleMeta = {
	/** Registry id — also the page path (`/<id>`). */
	id: string;
	label: string;
	/** Example component file, served raw by the `/api/sources` route. */
	file: string;
	/** Form-system file backing this example (`form.tsx` or `form-valibot.tsx`). */
	systemFile: string;
	description: string;
	component: ComponentType;
};

/**
 * The example registry lives here and only here — this catch-all route
 * is the single place that maps URL → example. The sidebar
 * (`../layout.tsx`), the index (`../page.tsx`) and the entry
 * (`#/frontend.tsx`) all import `EXAMPLES` from this file.
 */
export const EXAMPLES: ExampleMeta[] = [
	{
		component: SimpleForm,
		description: "Two fields, zero wiring.",
		file: "simple-form.tsx",
		id: "simple-form",
		label: "Simple Form",
		systemFile: "form.tsx",
	},
	{
		component: NestedForm,
		description: "Dotted names into objects.",
		file: "nested-form.tsx",
		id: "nested-form",
		label: "Nested Fields",
		systemFile: "form.tsx",
	},
	{
		component: ArrayForm,
		description: "Append, update, move, remove.",
		file: "array-form.tsx",
		id: "array-form",
		label: "Array Fields",
		systemFile: "form.tsx",
	},
	{
		component: FieldKindsForm,
		description: "Every widget, one schema.",
		file: "field-kinds.tsx",
		id: "field-kinds",
		label: "Every Field Kind",
		systemFile: "form.tsx",
	},
	{
		component: CustomComponentForm,
		description: "Your own widget via meta.component.",
		file: "custom-component.tsx",
		id: "custom-component",
		label: "Custom Component",
		systemFile: "form.tsx",
	},
	{
		component: ValidationModesForm,
		description: "Modes + onInvalid.",
		file: "validation-modes.tsx",
		id: "validation-modes",
		label: "Validation Modes",
		systemFile: "form.tsx",
	},
	{
		component: DefaultsOptionalForm,
		description: "Optional + defaultValues merge.",
		file: "defaults-optional.tsx",
		id: "defaults-optional",
		label: "Defaults & Optional",
		systemFile: "form.tsx",
	},
	{
		component: FormContextForm,
		description: "watch/reset, disabled, config.",
		file: "form-context.tsx",
		id: "form-context",
		label: "useFormContext",
		systemFile: "form.tsx",
	},
	{
		component: ValibotFormExample,
		description: "Same UI, Valibot schemas.",
		file: "valibot-form.tsx",
		id: "valibot-form",
		label: "Valibot Adapter",
		systemFile: "form-valibot.tsx",
	},
	{
		component: ServerSubmitForm,
		description: "POST to the API, echo demo.",
		file: "server-submit.tsx",
		id: "server-submit",
		label: "Server Submit",
		systemFile: "form.tsx",
	},
];

/**
 * Catch-all route — `/<id>` renders the matching example, anything else
 * renders the 404 page. (`params` mirrors the Next.js page signature;
 * `src/frontend.tsx` builds it from `window.location.pathname`.)
 */
export default function Page({ params }: { params: { id: string[] } }) {
	const [id] = params.id;
	const example =
		params.id.length === 1 ? EXAMPLES.find((ex) => ex.id === id) : undefined;
	if (!example) return <NotFoundPage />;
	const Example = example.component;
	return <Example />;
}
