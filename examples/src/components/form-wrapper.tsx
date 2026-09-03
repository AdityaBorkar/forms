import type { ReValidateMode, ValidationMode } from "@adistack/forms";
import { type ReactNode, useState } from "react";
import type { FieldErrors, FieldValues } from "react-hook-form";
import type { ZodType } from "zod";

import { Form, useForm } from "#/components/form-zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

type SubmitOutcome =
	| { status: "local"; values: unknown }
	| { status: "server"; values: unknown }
	| { status: "server-error"; values: unknown }
	| { status: "invalid"; values: FieldErrors };

export function ExampleForm({
	children,
	defaultValues,
	description,
	schema,
	title,
	validationMode,
	reValidateMode,
	submitTo,
	submitLabel = "Submit",
}: {
	children: ReactNode;
	defaultValues?: Record<string, unknown>;
	description: string;
	schema: ZodType<FieldValues, FieldValues>;
	title: string;
	validationMode?: ValidationMode;
	reValidateMode?: ReValidateMode;
	/**
	 * When set, submit POSTs the values as JSON to this API endpoint
	 * (e.g. `/api/submit/contact`) instead of echoing them locally.
	 */
	submitTo?: string;
	submitLabel?: string;
}) {
	const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
	const [pending, setPending] = useState(false);

	const form = useForm({
		...(defaultValues !== undefined && { defaultValues }),
		...(reValidateMode !== undefined && { reValidateMode }),
		...(validationMode !== undefined && { validationMode }),
		onInvalid: (errors) => setOutcome({ status: "invalid", values: errors }),
		onSubmit: (values) => {
			if (!submitTo) {
				setOutcome({ status: "local", values });
				return;
			}
			setPending(true);
			fetch(submitTo, {
				body: JSON.stringify(values),
				headers: { "content-type": "application/json" },
				method: "POST",
			})
				.then(async (res) => {
					const body: unknown = await res.json().catch(() => null);
					if (res.ok) setOutcome({ status: "server", values: body });
					else setOutcome({ status: "server-error", values: body });
				})
				.catch((error: unknown) =>
					setOutcome({ status: "server-error", values: String(error) }),
				)
				.finally(() => setPending(false));
		},
		schema,
	});

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<Form className="grid gap-4" form={form}>
					{children}
					<Button disabled={pending} type="submit">
						{pending ? "Sending…" : submitLabel}
					</Button>
				</Form>
				{outcome !== null ? (
					<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(outcome, null, 2)}
					</pre>
				) : null}
			</CardContent>
		</Card>
	);
}
