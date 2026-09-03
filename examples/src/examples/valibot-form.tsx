import { useState } from "react";
import * as v from "valibot";

import {
	useValibotForm,
	ValibotForm,
	ValibotSmartField,
} from "#/components/form-valibot";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

const schema = v.object({
	bio: v.pipe(
		v.string(),
		v.maxLength(200),
		v.metadata({
			component: "textarea",
			placeholder: "Tell us about yourself",
		}),
		v.title("Bio"),
	),
	name: v.pipe(v.string(), v.minLength(1), v.title("Full name")),
	notifications: v.pipe(
		v.boolean(),
		v.metadata({ component: "switch" }),
		v.title("Email notifications"),
	),
	role: v.pipe(
		v.picklist(["admin", "member", "guest"]),
		v.title("Role"),
		v.description("Picklist maps to the enum widget."),
	),
});

/**
 * 9 · Valibot adapter — swap `zodAdapter` for `valibotAdapter` in
 * `createFormSystem` and everything else stays the same. Labels come from
 * `v.title()`, hints from `v.description()`, widget overrides from
 * `v.metadata({ component })`.
 */
export function ValibotFormExample() {
	const [result, setResult] = useState<unknown>(null);
	const form = useValibotForm({
		defaultValues: { notifications: false },
		onSubmit: (values) => setResult(values),
		schema,
	});
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>9 · Valibot adapter</CardTitle>
				<CardDescription>
					Same widgets, same APIs — only the schema adapter changed.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ValibotForm className="grid gap-4" form={form}>
					<ValibotSmartField name="name" />
					<ValibotSmartField name="bio" />
					<ValibotSmartField name="role" />
					<ValibotSmartField name="notifications" />
					<Button type="submit">Submit</Button>
				</ValibotForm>
				{result !== null ? (
					<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(result, null, 2)}
					</pre>
				) : null}
			</CardContent>
		</Card>
	);
}
