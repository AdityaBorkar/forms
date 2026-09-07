import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/components/form-zod";

const schema = z.object({
	email: z.email().meta({ label: "Email" }),
	message: z.string().min(10).meta({
		description: "At least 10 characters.",
		label: "Message",
	}),
	name: z.string().min(1).meta({ label: "Name" }),
});

/**
 * 10 · Server submit — the form POSTs to `POST /api/submit/contact`
 * and the API route echoes the payload back as `{ ok, received }`.
 */
export function ServerSubmitForm() {
	return (
		<ExampleForm
			description="Client validates first, then the server echoes the payload back."
			schema={schema}
			submitLabel="Send to server"
			submitTo="/api/submit/contact"
			title="10 · Server submit"
		>
			<SmartField name="name" />
			<SmartField name="email" />
			<SmartField name="message" />
		</ExampleForm>
	);
}
