import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/lib/form";

const schema = z.object({
	email: z.email().meta({ label: "Email", placeholder: "ada@example.com" }),
	name: z.string().min(1).meta({ label: "Name", placeholder: "Ada Lovelace" }),
});

/**
 * 1 · Simple form — two fields rendered straight from a Zod schema.
 * `useForm({ schema })` builds the field map, defaults and resolver;
 * each `<SmartField name>` resolves its definition and widget by itself.
 */
export function SimpleForm() {
	return (
		<ExampleForm
			description="Two fields rendered straight from a Zod schema — no manual wiring."
			schema={schema}
			title="1 · Simple form"
		>
			<SmartField name="name" />
			<SmartField name="email" />
		</ExampleForm>
	);
}
