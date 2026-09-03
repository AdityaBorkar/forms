import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/lib/form-zod";

const schema = z.object({
	address: z.object({
		city: z.string().min(1).meta({ label: "City" }),
		street: z.string().min(1).meta({ label: "Street" }),
		zip: z.string().min(1).meta({ label: "ZIP code" }),
	}),
	name: z.string().min(1).meta({ label: "Full name" }),
});

/**
 * 2 · Nested fields — nested `z.object` schemas resolve via dotted names.
 * `resolveFieldDef` walks `elementFields`, skipping numeric segments, so
 * `address.street` finds the street definition inside the address object.
 */
export function NestedForm() {
	return (
		<ExampleForm
			description="Nested objects resolve via dotted field names — address.street, address.city…"
			schema={schema}
			title="2 · Nested fields"
		>
			<SmartField name="name" />
			<SmartField name="address.street" />
			<SmartField name="address.city" />
			<SmartField name="address.zip" />
		</ExampleForm>
	);
}
