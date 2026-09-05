import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/components/form-zod";

const schema = z.object({
	name: z.string().min(1).meta({ label: "Name" }),
	// `.optional()` flips `def.optional` — the `*` marker disappears and the
	// field stays `undefined` until typed (no auto-derived `""`).
	nickname: z.string().optional().meta({
		description: "Optional — omit it and the value stays undefined.",
		label: "Nickname",
		placeholder: "Ada",
	}),
	notifyEmail: z.email().optional().meta({ label: "Notification email" }),
});

/**
 * 7 · Optional fields & defaults — no per-kind defaults are derived.
 * `defaultValues` pass straight through to RHF. Here `name` arrives
 * pre-filled while `nickname` stays `undefined` until typed.
 */
export function DefaultsOptionalForm() {
	return (
		<ExampleForm
			defaultValues={{ name: "Ada Lovelace" }}
			description="Optional fields lose the * marker; defaultValues pass straight through to RHF."
			schema={schema}
			title="7 · Optional fields & defaults"
		>
			<SmartField name="name" />
			<SmartField name="nickname" />
			<SmartField name="notifyEmail" />
		</ExampleForm>
	);
}
