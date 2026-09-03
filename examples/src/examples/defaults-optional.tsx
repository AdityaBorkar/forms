import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/lib/form-zod";

const schema = z.object({
	name: z.string().min(1).meta({ label: "Name" }),
	// `.optional()` flips `def.optional` — the `*` marker disappears and the
	// adapter emits `undefined` as the default instead of `""`.
	nickname: z.string().optional().meta({
		description: "Optional — omit it and the default stays undefined.",
		label: "Nickname",
		placeholder: "Ada",
	}),
	notifyEmail: z.email().optional().meta({ label: "Notification email" }),
});

/**
 * 7 · Optional fields & defaults — `buildDefaults` derives a default per
 * kind (`""`, `0`, `false`, first enum entry, `[]`, …) and deep-merges your
 * `defaultValues` over them. Here `name` arrives pre-filled while
 * `nickname` stays `undefined` until typed.
 */
export function DefaultsOptionalForm() {
	return (
		<ExampleForm
			defaultValues={{ name: "Ada Lovelace" }}
			description="Optional fields lose the * marker; defaultValues merge over adapter-derived defaults."
			schema={schema}
			title="7 · Optional fields & defaults"
		>
			<SmartField name="name" />
			<SmartField name="nickname" />
			<SmartField name="notifyEmail" />
		</ExampleForm>
	);
}
