import { createFormSystem } from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";
import type { ZodType } from "zod";
import z from "zod";

import { TextField } from "#/components/form-ui";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

// `onMissingField: "warn"` renders `null` with a dev-only warning instead
// of throwing: unknown names and unregistered kinds degrade to gaps while
// the rest of the form keeps working. The default `"throw"` fails fast in
// dev (production always warns + renders `null`).
const warnSystem = createFormSystem({
	fieldComponents: { string: TextField },
	onMissingField: "warn",
	schemaResolver: zodAdapter,
});

const schema = z.object({
	age: z.number().meta({ label: "Age" }),
	name: z.string().min(1).meta({ label: "Name" }),
});

const {
	Form: WarnForm,
	SmartField: WarnSmartField,
	useForm: useWarnForm,
} = warnSystem;

/**
 * 14 · Missing fields — with `onMissingField: "warn"`, `nope` (unknown
 * name) and `age` (no `number` widget registered) render nothing while
 * `name` keeps working. Watch the dev console for the warnings.
 */
export function MissingFieldForm() {
	const [result, setResult] = useState<unknown>(null);
	const form = useWarnForm({
		onSubmit: (values: FieldValues) => setResult(values),
		schema: schema as ZodType<FieldValues, FieldValues>,
	});
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>14 · Missing fields</CardTitle>
				<CardDescription>
					Unknown names and unregistered kinds warn and render null — the valid
					fields still submit.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<WarnForm className="grid gap-4" form={form}>
					<WarnSmartField name="name" />
					<WarnSmartField name="nope" />
					<WarnSmartField name="age" />
					<Button type="submit">Submit</Button>
				</WarnForm>
				{result !== null ? (
					<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(result, null, 2)}
					</pre>
				) : null}
			</CardContent>
		</Card>
	);
}
