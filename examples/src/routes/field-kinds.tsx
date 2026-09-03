import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/lib/form";

const schema = z.object({
	acceptTerms: z
		.boolean()
		.meta({ component: "checkbox", label: "I accept the terms" }),
	// Number bounds feed the slider widget (`def.min` / `def.max`).
	age: z.number().min(0).max(120).meta({ label: "Age" }),
	bio: z.string().max(200).meta({
		component: "textarea",
		label: "Bio",
		placeholder: "Tell us about yourself",
	}),
	// Free text with suggestions, via `meta.component: "combobox"`.
	city: z.string().meta({
		component: "combobox",
		label: "City",
		placeholder: "Type or pick…",
	}),
	// String formats: `z.email()` / `z.url()` dispatch the email/url kinds.
	email: z.email().meta({ label: "Email" }),
	notifications: z
		.boolean()
		.meta({ component: "switch", label: "Email notifications" }),
	// `meta.component` overrides the widget without changing validation.
	password: z.string().min(8).meta({
		component: "password",
		description: "At least 8 characters.",
		label: "Password",
	}),
	rating: z.number().min(0).max(10).meta({
		component: "slider",
		description: "Rate it 0–10.",
		label: "Rating",
	}),
	// Enum entries drive the select options.
	role: z.enum(["admin", "member", "guest"]).meta({ label: "Role" }),
	// Native date input bound to a `Date` value.
	startDate: z.date().meta({ label: "Start date" }),
	// Three boolean flavours, one schema type.
	subscribe: z.boolean().meta({ label: "Subscribe to newsletter" }),
	username: z
		.string()
		.min(1)
		.meta({ label: "Username", placeholder: "pick a handle" }),
	website: z.url().meta({ label: "Website", placeholder: "https://…" }),
});

/**
 * 4 · Every field kind — one schema exercising all dispatched widgets:
 * string/email/url/password/textarea, number/slider, boolean/checkbox/
 * switch, enum/combobox and date. `required *` markers derive from
 * `!def.optional`.
 */
export function FieldKindsForm() {
	return (
		<ExampleForm
			defaultValues={{ notifications: false, rating: 5 }}
			description="Every dispatched widget in one place — formats, meta.component overrides, enum select, combobox and date."
			schema={schema}
			title="4 · Every field kind"
		>
			<SmartField name="username" />
			<SmartField name="email" />
			<SmartField name="website" />
			<SmartField name="password" />
			<SmartField name="bio" />
			<SmartField name="age" />
			<SmartField name="rating" />
			<SmartField name="role" />
			<SmartField
				config={{ options: ["Berlin", "Paris", "Tokyo", "New York"] }}
				name="city"
			/>
			<SmartField name="startDate" />
			<SmartField name="subscribe" />
			<SmartField name="acceptTerms" />
			<SmartField name="notifications" />
		</ExampleForm>
	);
}
