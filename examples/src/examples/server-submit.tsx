import { useState } from "react";
import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { Button } from "#/components/ui/button";
import { SmartField } from "#/lib/form";

const schema = z.object({
	email: z.email().meta({ label: "Email" }),
	message: z.string().min(10).meta({
		component: "textarea",
		description: "At least 10 characters — the server enforces this too.",
		label: "Message",
	}),
	name: z.string().min(1).meta({ label: "Name" }),
});

/**
 * 10 · Server submit (Elysia) — the form POSTs to `POST /api/submit/contact`
 * where the Elysia 2 app re-validates with the same Zod schema and answers
 * `{ ok, received }` (or RFC 9457 `problem+json` on failure). The second
 * button sends a deliberately invalid payload to show the server's 422.
 */
export function ServerSubmitForm() {
	const [rawResult, setRawResult] = useState<unknown>(null);
	const [rawPending, setRawPending] = useState(false);

	async function sendInvalid() {
		setRawPending(true);
		try {
			const res = await fetch("/api/submit/contact", {
				body: JSON.stringify({ email: "not-an-email", message: "short" }),
				headers: { "content-type": "application/json" },
				method: "POST",
			});
			setRawResult({
				body: await res.json().catch(() => null),
				status: res.status,
			});
		} catch (error: unknown) {
			setRawResult({ error: String(error) });
		} finally {
			setRawPending(false);
		}
	}

	return (
		<div className="grid w-full max-w-md gap-4">
			<ExampleForm
				description="Client validates first, then the Elysia server validates again and echoes the payload."
				schema={schema}
				submitLabel="Send to server"
				submitTo="/api/submit/contact"
				title="10 · Server submit (Elysia)"
			>
				<SmartField name="name" />
				<SmartField name="email" />
				<SmartField name="message" />
			</ExampleForm>
			<div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
				<p className="mb-2 text-muted-foreground text-sm">
					Skip client validation and let the server reject the payload:
				</p>
				<Button
					disabled={rawPending}
					onClick={sendInvalid}
					type="button"
					variant="outline"
				>
					{rawPending ? "Sending…" : "Send invalid payload"}
				</Button>
				{rawResult !== null ? (
					<pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
						{JSON.stringify(rawResult, null, 2)}
					</pre>
				) : null}
			</div>
		</div>
	);
}
