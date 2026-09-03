import type { FieldComponentProps } from "@adistack/forms";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { FieldShell } from "./field-shell";

export function SelectField({
	def,
	name,
	value,
	onChange,
	onBlur,
	error,
	disabled,
}: FieldComponentProps) {
	const meta = def.meta;
	const entries = def.entries;
	const options = entries ? Object.entries(entries) : [];
	return (
		<FieldShell
			description={meta?.description}
			error={error}
			label={meta?.label}
			name={name}
			required={!def.optional}
		>
			<Select
				disabled={disabled}
				onValueChange={onChange}
				value={typeof value === "string" ? value : String(value ?? "")}
			>
				<SelectTrigger className="w-full" id={name} onBlur={onBlur}>
					<SelectValue placeholder={meta?.placeholder ?? "Select…"} />
				</SelectTrigger>
				<SelectContent>
					{options.map(([key, label]) => (
						<SelectItem key={key} value={key}>
							{String(label)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldShell>
	);
}
