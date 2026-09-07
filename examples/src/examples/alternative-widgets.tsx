import {
	type ComboboxConfig,
	createFormSystem,
	defineFieldComponent,
	defineFieldComponents,
	type FieldComponentProps,
} from "@adistack/forms";
import { zodAdapter } from "@adistack/forms/adapters/zod";
import { type ChangeEvent, useCallback, useId, useState } from "react";
import type { FieldValues } from "react-hook-form";
import type { ZodType } from "zod";
import z from "zod";

import {
	DateField,
	SelectField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from "#/components/form-ui";
import { FieldShell } from "#/components/form-ui/field-shell";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";

// One map per look: here `string` renders a textarea, `number` a slider
// driven by `def.min`/`def.max`, and `boolean` a switch. Validation is
// untouched — only the widget for each base kind changes.
const widgetsComponents = defineFieldComponents({
	boolean: SwitchField,
	date: DateField,
	email: TextField,
	enum: SelectField,
	number: SliderField,
	string: TextareaField,
	url: TextField,
});

const widgetsSystem = createFormSystem({
	fieldComponents: widgetsComponents,
	schemaResolver: zodAdapter,
});

const widgetsSchema = z.object({
	bio: z.string().max(200).meta({
		label: "Bio",
		placeholder: "A few sentences…",
	}),
	notifications: z.boolean().meta({ label: "Email notifications" }),
	rating: z.number().min(0).max(10).meta({
		description: "Slider bounds come from def.min / def.max.",
		label: "Rating",
	}),
	role: z.enum(["admin", "member", "guest"]).meta({ label: "Role" }),
});

// Combobox needs per-field options, typed via `ComboboxConfig` (`TConfig`).
// The widget is authored narrow from the start — `value: string`,
// `config: ComboboxConfig` — so `defineFieldComponent` checks the contract
// at registration. A second system maps `string` to the combobox instead
// of the textarea: one `fieldComponents` map covers one look, so
// alternative looks get their own `createFormSystem` call and coexist on
// the same page.
function CityCombobox({
	def,
	name,
	value,
	onChange,
	onBlur,
	ref,
	error,
	disabled,
	config,
}: FieldComponentProps<string, ComboboxConfig>) {
	const listId = useId();
	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
		[onChange],
	);
	return (
		<FieldShell
			description={def.meta?.description}
			error={error}
			label={def.meta?.label}
			name={name}
			required={!def.optional}
		>
			<Input
				disabled={disabled}
				id={name}
				list={listId}
				name={name}
				onBlur={onBlur}
				onChange={handleChange}
				placeholder={def.meta?.placeholder ?? "Type or pick…"}
				ref={ref}
				type="text"
				value={value ?? ""}
			/>
			<datalist id={listId}>
				{config?.options.map((option) => (
					<option key={option} value={option} />
				))}
			</datalist>
		</FieldShell>
	);
}

const ComboboxString = defineFieldComponent<string, ComboboxConfig>(
	CityCombobox,
);

const comboSystem = createFormSystem({
	fieldComponents: defineFieldComponents({ string: ComboboxString }),
	schemaResolver: zodAdapter,
});

const comboSchema = z.object({
	city: z.string().min(1).meta({ label: "City", placeholder: "Type or pick…" }),
});

const {
	Form: WidgetsForm,
	SmartField: WidgetsSmartField,
	useForm: useWidgetsForm,
} = widgetsSystem;
const {
	Form: ComboForm,
	SmartField: ComboSmartField,
	useForm: useComboForm,
} = comboSystem;

/**
 * 12 · Alternative widgets — swap any base kind for another widget
 * (`TextareaField`, `SliderField`, `SwitchField`, `ComboboxField`) via a
 * local `fieldComponents` map. `defineFieldComponents` pins the map;
 * `defineFieldComponent<TValue, TConfig>` pins `config` per widget.
 */
export function AlternativeWidgetsForm() {
	const [widgetsResult, setWidgetsResult] = useState<unknown>(null);
	const [comboResult, setComboResult] = useState<unknown>(null);
	const widgetsForm = useWidgetsForm({
		defaultValues: { notifications: true, rating: 7 },
		onSubmit: (values: FieldValues) => setWidgetsResult(values),
		schema: widgetsSchema as ZodType<FieldValues, FieldValues>,
	});
	const comboForm = useComboForm({
		onSubmit: (values: FieldValues) => setComboResult(values),
		schema: comboSchema as ZodType<FieldValues, FieldValues>,
	});
	return (
		<div className="grid w-full max-w-md gap-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>12a · Widget swaps</CardTitle>
					<CardDescription>
						Textarea for strings, slider for numbers, switch for booleans.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<WidgetsForm className="grid gap-4" form={widgetsForm}>
						<WidgetsSmartField name="bio" />
						<WidgetsSmartField name="rating" />
						<WidgetsSmartField name="notifications" />
						<WidgetsSmartField name="role" />
						<Button type="submit">Submit</Button>
					</WidgetsForm>
					{widgetsResult !== null ? (
						<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
							{JSON.stringify(widgetsResult, null, 2)}
						</pre>
					) : null}
				</CardContent>
			</Card>
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>12b · Combobox + config</CardTitle>
					<CardDescription>
						Options arrive via SmartField config, typed as ComboboxConfig.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ComboForm className="grid gap-4" form={comboForm}>
						<ComboSmartField
							config={{ options: ["Berlin", "Paris", "Tokyo", "New York"] }}
							name="city"
						/>
						<Button type="submit">Submit</Button>
					</ComboForm>
					{comboResult !== null ? (
						<pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
							{JSON.stringify(comboResult, null, 2)}
						</pre>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
