import { useState } from "react";
import z from "zod";

import {
	Form,
	SmartField,
	useForm,
	useFormContext,
} from "#/components/form-zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

const schema = z.object({
	username: z
		.string()
		.min(1)
		.meta({ label: "Username", placeholder: "try “taken”" }),
});

/** Reads the form-level error `<Form>` records when `onSubmit` throws. */
function ServerErrorBanner() {
	const {
		formState: { errors },
	} = useFormContext();
	const message = (
		errors as unknown as { root?: { serverError?: { message?: string } } }
	).root?.serverError?.message;
	if (!message) return null;
	return (
		<p
			className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm"
			role="alert"
		>
			{message}
		</p>
	);
}

/** Submit button with async pending state from `formState.isSubmitting`. */
function SubmitButton() {
	const {
		formState: { isSubmitting },
	} = useFormContext();
	return (
		<Button disabled={isSubmitting} type="submit">
			{isSubmitting ? "Saving…" : "Save"}
		</Button>
	);
}

/**
 * 11 · Submit errors — a throwing `onSubmit` is caught by `<Form>`,
 * routed to `onSubmitError` and recorded as a `root.serverError` field
 * error. Validation failures still go to `onInvalid`, never here.
 */
export function SubmitErrorsForm() {
	const [caught, setCaught] = useState<string | null>(null);
	const [result, setResult] = useState<unknown>(null);
	const form = useForm({
		onInvalid: () => setCaught(null),
		onSubmit: async (values) => {
			setCaught(null);
			setResult(null);
			await new Promise((resolve) => setTimeout(resolve, 400));
			if (values.username === "taken") {
				throw new Error('Username "taken" is already taken.');
			}
			setResult(values);
		},
		onSubmitError: (error) =>
			setCaught(error instanceof Error ? error.message : String(error)),
		schema,
	});
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>11 · Submit errors</CardTitle>
				<CardDescription>
					Submit “taken” to fail async; anything else succeeds. Empty submit
					hits onInvalid instead.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form className="grid gap-4" form={form}>
					<SmartField name="username" />
					<ServerErrorBanner />
					<SubmitButton />
				</Form>
				{caught !== null ? (
					<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify({ onSubmitError: caught }, null, 2)}
					</pre>
				) : null}
				{result !== null ? (
					<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(result, null, 2)}
					</pre>
				) : null}
			</CardContent>
		</Card>
	);
}
