import type { FormInstance } from "@adistack/forms";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";
import z from "zod";

import {
	Form,
	SmartField,
	useForm,
	useFormContext,
} from "#/components/form-zod";
import { Button } from "#/components/ui/button";

const schema = z.object({
	name: z.string().min(1).meta({ label: "Name", placeholder: "Ada Lovelace" }),
	role: z.enum(["admin", "member", "guest"]).meta({ label: "Role" }),
});

/**
 * Reads live form state without prop drilling. Anything rendered inside
 * `<Form>` can call `useFormContext()` for RHF methods plus `fieldMap`.
 */
function LivePreview() {
	const { watch, fieldMap } = useFormContext();
	const values = watch();
	return (
		<div className="rounded-md border border-border bg-muted/50 p-3 text-xs">
			<p className="mb-1 font-medium">Live preview (useFormContext + watch)</p>
			<pre className="overflow-auto">{JSON.stringify(values, null, 2)}</pre>
			<p className="mt-1 text-muted-foreground">
				Known fields: {Object.keys(fieldMap).join(", ")}
			</p>
		</div>
	);
}

/** Reset needs the same context — `reset()` restores your `defaultValues`. */
function ResetButton() {
	const { reset } = useFormContext();
	return (
		<Button onClick={() => reset()} type="button" variant="outline">
			Reset
		</Button>
	);
}

/**
 * 8 · useFormContext + disabled — deep components read form state
 * via `useFormContext()`, and `SmartField` accepts `disabled` (forwarded
 * to the widget and react-hook-form). For `config` pass-through, see the
 * alternative-widgets example.
 */
export function FormContextForm() {
	const [disabled, setDisabled] = useState(false);
	const [result, setResult] = useState<unknown>(null);
	const form = useForm({
		defaultValues: { role: "member" },
		onSubmit: (values) => setResult(values),
		schema,
	});
	return (
		<div className="grid w-full max-w-md gap-4">
			<label className="flex items-center gap-2 text-sm">
				<input
					checked={disabled}
					className="size-4 accent-primary"
					onChange={(event) => setDisabled(event.target.checked)}
					type="checkbox"
				/>
				Disable all fields
			</label>
			<ExampleFormShell
				description="watch() preview, reset() and a disabled toggle — all through context, no prop drilling."
				form={form}
				title="8 · useFormContext"
			>
				<SmartField disabled={disabled} name="name" />
				<SmartField disabled={disabled} name="role" />
				<LivePreview />
				<div className="flex gap-2">
					<Button type="submit">Submit</Button>
					<ResetButton />
				</div>
			</ExampleFormShell>
			{result !== null ? (
				<pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
					{JSON.stringify(result, null, 2)}
				</pre>
			) : null}
		</div>
	);
}

function ExampleFormShell<TValues extends FieldValues>({
	children,
	description,
	form,
	title,
}: {
	children: React.ReactNode;
	description: string;
	form: FormInstance<TValues>;
	title: string;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<h2 className="font-semibold text-lg">{title}</h2>
			<p className="mb-4 text-muted-foreground text-sm">{description}</p>
			<Form className="grid gap-4" form={form}>
				{children}
			</Form>
		</div>
	);
}
