import type { FieldComponentProps } from "@adistack/forms";
import { type ChangeEvent, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { FieldShell } from "./field-shell";

function toInputValue(value: unknown): string {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		const year = value.getFullYear();
		const month = String(value.getMonth() + 1).padStart(2, "0");
		const day = String(value.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}
	return "";
}

export function DateField({
	def,
	name,
	value,
	onChange,
	onBlur,
	ref,
	error,
	disabled,
}: FieldComponentProps) {
	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const raw = event.target.value;
			onChange(raw === "" ? undefined : new Date(`${raw}T00:00:00`));
		},
		[onChange],
	);
	const meta = def.meta;
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
				name={name}
				onBlur={onBlur}
				onChange={handleChange}
				ref={ref}
				type="date"
				value={toInputValue(value)}
			/>
		</FieldShell>
	);
}
