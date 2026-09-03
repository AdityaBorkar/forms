import { createFormSystem, type FieldComponentProps } from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";
import type { ZodType } from "zod";
import z from "zod";

import { TextareaField, TextField } from "#/components/form-ui";
import { FieldShell } from "#/components/form-ui/field-shell";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

/**
 * A custom widget registered under its own kind. It receives the standard
 * `FieldComponentProps` (`def`, `value`, `onChange`, `error`, …) so any
 * React component can become a field.
 */
function StarsField({
	def,
	name,
	value,
	onChange,
	error,
	disabled,
}: FieldComponentProps) {
	const current = typeof value === "number" ? value : 0;
	return (
		<FieldShell
			description={def.meta?.description}
			error={error}
			label={def.meta?.label}
			name={name}
			required={!def.optional}
		>
			<div className="flex gap-1">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						aria-label={`${star} star${star > 1 ? "s" : ""}`}
						className={
							star <= current ? "text-amber-400" : "text-muted-foreground/40"
						}
						disabled={disabled}
						key={star}
						onClick={() => onChange(star)}
						type="button"
					>
						<span className="text-2xl">★</span>
					</button>
				))}
			</div>
		</FieldShell>
	);
}

// A local form system: same Zod adapter, extended widget map. Schemas opt
// into the custom widget with `meta({ component: "stars" })` — validation
// stays a plain number, only the UI changes.
const customSystem = createFormSystem({
	fieldComponents: {
		stars: StarsField,
		string: TextField,
		textarea: TextareaField,
	},
	schemaResolver: zodAdapter,
});

const schema = z.object({
	feedback: z.string().max(200).meta({
		component: "textarea",
		label: "Feedback",
		placeholder: "What did you think?",
	}),
	score: z.number().min(1).max(5).meta({
		component: "stars",
		description: "Pick 1–5 stars.",
		label: "Score",
	}),
	title: z.string().min(1).meta({ label: "Title" }),
});

/**
 * 5 · Custom field component — register your own widget in the
 * `fieldComponents` map (here a 5-star rating) and select it per field
 * with `meta.component`. No changes to validation or core are needed.
 */
export function CustomComponentForm() {
	const [result, setResult] = useState<unknown>(null);
	const form = customSystem.useForm({
		defaultValues: { score: 3 },
		onSubmit: (values: FieldValues) => setResult(values),
		schema: schema as ZodType<FieldValues, FieldValues>,
	});
	const { SmartField: CustomSmartField, Form: CustomForm } = customSystem;
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>5 · Custom field component</CardTitle>
				<CardDescription>
					A local form system with a custom ★ rating widget selected via
					meta.component.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<CustomForm className="grid gap-4" form={form}>
					<CustomSmartField name="title" />
					<CustomSmartField name="score" />
					<CustomSmartField name="feedback" />
					<Button type="submit">Submit</Button>
				</CustomForm>
				{result !== null ? (
					<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(result, null, 2)}
					</pre>
				) : null}
			</CardContent>
		</Card>
	);
}
