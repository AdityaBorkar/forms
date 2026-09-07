import type { ReValidateMode, ValidationMode } from "@adistack/forms";
import { useState } from "react";
import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField } from "#/components/form-zod";

const schema = z.object({
	email: z.email().meta({ label: "Email", placeholder: "ada@example.com" }),
	name: z.string().min(3).meta({
		description: "At least 3 characters — try submitting, then typing.",
		label: "Name",
	}),
});

const MODES: ValidationMode[] = [
	"onBlur",
	"onChange",
	"onSubmit",
	"onTouched",
	"all",
];
const RE_MODES: ReValidateMode[] = ["onChange", "onBlur", "onSubmit"];

/**
 * 6 · Validation modes — `useForm({ validationMode, reValidateMode })`
 * maps straight onto react-hook-form. Switching modes remounts the form
 * (via `key`) so the new mode takes effect from a clean state.
 * `onInvalid` fires with the field errors on every rejected submit.
 */
export function ValidationModesForm() {
	const [mode, setMode] = useState<ValidationMode>("onBlur");
	const [reMode, setReMode] = useState<ReValidateMode>("onChange");
	return (
		<div className="grid w-full max-w-md gap-4">
			<div className="grid gap-2">
				<p className="font-medium text-sm">validationMode (first validation)</p>
				<div className="flex flex-wrap gap-1">
					{MODES.map((m) => (
						<button
							className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
								m === mode
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-card hover:bg-accent"
							}`}
							key={m}
							onClick={() => setMode(m)}
							type="button"
						>
							{m}
						</button>
					))}
				</div>
				<p className="font-medium text-sm">reValidateMode (after submit)</p>
				<div className="flex flex-wrap gap-1">
					{RE_MODES.map((m) => (
						<button
							className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
								m === reMode
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-card hover:bg-accent"
							}`}
							key={m}
							onClick={() => setReMode(m)}
							type="button"
						>
							{m}
						</button>
					))}
				</div>
			</div>
			<ExampleForm
				description={`Validating ${mode} / re-validating ${reMode}. Rejected submits appear below via onInvalid.`}
				key={`${mode}-${reMode}`}
				reValidateMode={reMode}
				schema={schema}
				title="6 · Validation modes"
				validationMode={mode}
			>
				<SmartField name="name" />
				<SmartField name="email" />
			</ExampleForm>
		</div>
	);
}
