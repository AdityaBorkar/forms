import type { FieldComponentProps } from "@adistack/forms";
import { type ChangeEvent, useCallback, useId } from "react";

import { Input } from "#/components/ui/input";
import { FieldShell } from "./field-shell";

/**
 * Free-text input with a suggestion list. Options come from the field's
 * `entries` (enum-backed) or from the `config` prop:
 * `<SmartField config={{ options: [...] }} name="..." />`.
 */
export function ComboboxField({
	def,
	name,
	value,
	onChange,
	onBlur,
	ref,
	error,
	disabled,
	config,
}: FieldComponentProps) {
	const listId = useId();
	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
		[onChange],
	);
	const meta = def.meta;
	const fromEntries = def.entries ? Object.keys(def.entries) : [];
	const fromConfig = Array.isArray(config?.options)
		? (config.options as unknown[]).map(String)
		: [];
	const options = fromEntries.length > 0 ? fromEntries : fromConfig;
	return (
		<FieldShell
			description={meta?.description}
			error={error}
			label={meta?.label}
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
				placeholder={meta?.placeholder ?? "Type or pick…"}
				ref={ref}
				type="text"
				value={String(value ?? "")}
			/>
			<datalist id={listId}>
				{options.map((option) => (
					<option key={option} value={option} />
				))}
			</datalist>
		</FieldShell>
	);
}
