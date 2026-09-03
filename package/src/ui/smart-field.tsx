import type { ComponentType, Context, ReactElement } from "react";
import { useController } from "react-hook-form";

import { useFormContextValue } from "@/core/form-context";
import { resolveFieldDef } from "@/core/resolve-field-def";
import { devWarn } from "@/errors";
import type {
	FieldComponentMap,
	FieldComponentProps,
	FieldDef,
	FormContextValue,
} from "@/types";

export type SmartFieldProps = {
	name: string;
	disabled?: boolean;
	config?: Record<string, unknown>;
};

export function createSmartField(
	FormContext: Context<FormContextValue | null>,
	fieldComponents: FieldComponentMap,
): ComponentType<SmartFieldProps> {
	function SmartField({
		name,
		disabled,
		config,
	}: SmartFieldProps): ReactElement | null {
		const { fieldMap } = useFormContextValue(FormContext, "SmartField");

		let def: FieldDef;
		try {
			def = resolveFieldDef(fieldMap, name);
		} catch {
			devWarn(`SmartField: could not render field "${name}"`, [
				"The field was not found in the schema or has an unsupported type.",
				"SmartField will render nothing for this field.",
				"Check that the name prop matches a key in your object schema.",
			]);
			return null;
		}

		const Component = fieldComponents[def.kind];
		if (!Component) {
			const availableKinds = Object.keys(fieldComponents);
			devWarn(
				`No component registered for field kind "${def.kind}" (field "${name}")`,
				[
					availableKinds.length
						? `Available component kinds: ${availableKinds.join(", ")}`
						: "No components have been registered.",
					`Add a component for kind "${def.kind}" to the fieldComponents map passed to createFormSystem().`,
				],
			);
			return null;
		}

		return (
			<ControlledField
				Component={Component}
				config={config}
				def={def}
				disabled={disabled}
				name={name}
			/>
		);
	}

	return SmartField;
}

function ControlledField({
	Component,
	def,
	name,
	disabled,
	config,
}: {
	Component: FieldComponentMap[string];
	def: FieldDef;
	name: string;
	disabled?: boolean;
	config?: Record<string, unknown>;
}): ReactElement {
	const {
		field: { value, onChange, onBlur, ref },
		fieldState: { error },
	} = useController({ disabled, name });

	const renderProps: FieldComponentProps = {
		config,
		def,
		disabled,
		error: error?.message,
		name,
		onBlur,
		onChange,
		ref,
		...(value !== undefined && { value: value as unknown }),
	};

	return <Component {...renderProps} />;
}
