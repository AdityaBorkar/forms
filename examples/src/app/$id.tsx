import type { ComponentType } from "react";

import { RootLayout } from "#/components/docs/root-layout.tsx";
import { SourcePanel } from "#/components/docs/source-layout.tsx";
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
		file: "array-form.tsx",
		slug: "array-form",
		title: "Array Fields",
	},
	{
		component: FieldKindsForm,
		description: "Every widget, one schema.",
		file: "field-kinds.tsx",
		slug: "field-kinds",
		title: "Every Field Kind",
	},
	{
		component: CustomComponentForm,
		description: "Your own widget via meta.component.",
		file: "custom-component.tsx",
		slug: "custom-component",
		title: "Custom Component",
	},
	{
		component: ValidationModesForm,
		description: "Modes + onInvalid.",
		file: "validation-modes.tsx",
		slug: "validation-modes",
		title: "Validation Modes",
	},
	{
		component: DefaultsOptionalForm,
		description: "Optional + defaultValues merge.",
		file: "defaults-optional.tsx",
		slug: "defaults-optional",
		title: "Defaults & Optional",
	},
	{
		component: FormContextForm,
		description: "watch/reset, disabled, config.",
		file: "form-context.tsx",
		slug: "form-context",
		title: "useFormContext",
	},
	{
		component: ValibotFormExample,
		description: "Same UI, Valibot schemas.",
		file: "valibot-form.tsx",
		slug: "valibot-form",
		title: "Valibot Adapter",
	},
	{
		component: ServerSubmitForm,
		description: "POST to the API, echo demo.",
		file: "server-submit.tsx",
		slug: "server-submit",
		title: "Server Submit",
	},
];

export default function Page({ params }: { params: { id: string[] } }) {
	const [id] = params.id;
	const Example =
		params.id.length === 1 ? EXAMPLES.find((ex) => ex.slug === id) : undefined;

	if (!Example) {
		return (
			<div className="w-full max-w-md text-center">
				<h1 className="mb-1 font-semibold text-2xl">Page not found</h1>
				<p className="mb-6 text-muted-foreground text-sm">
					This route has no `src/app/…/page.tsx`.
				</p>
				<a
					className="rounded-md border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary"
					href="/"
				>
					Back to examples
				</a>
			</div>
		);
	}
	return (
		<RootLayout className="w-full max-w-2xl p-8">
			<Example.component />
			<SourcePanel exampleId={id} />
		</RootLayout>
	);
}
