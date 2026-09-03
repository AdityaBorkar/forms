import type { FieldComponentProps } from "@adistack/forms";
import { type ChangeEvent, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { FieldShell } from "./field-shell";

export function NumberField({
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
		(event: ChangeEvent<HTMLInputElement>) =>
			onChange(
				event.target.value === "" ? undefined : Number(event.target.value),
			),
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
				placeholder={meta?.placeholder}
				ref={ref}
				type="number"
				value={value === undefined || value === null ? "" : String(value)}
			/>
		</FieldShell>
	);
}
