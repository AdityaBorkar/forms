import type { ComponentType, Context, ReactElement } from "react";
import { useMemo } from "react";
import { useController } from "react-hook-form";

import { useFormContextValue } from "#/core/form-context";
import { resolveFieldDef } from "#/core/resolve-field-def";
import { createFormError, devWarn, isProduction } from "#/errors";
import type {
	FieldComponentMap,
	FieldComponentProps,
	FieldDef,
	FormContextValue,
	OnMissingField,
} from "#/types";

export type SmartFieldProps = {
	name: string;
	disabled?: boolean;
	config?: Record<string, unknown>;
};

export function createSmartField(
	FormContext: Context<FormContextValue | null>,
	fieldComponents: FieldComponentMap,
	options?: { onMissingField?: OnMissingField },
): ComponentType<SmartFieldProps> {
	const onMissingField = options?.onMissingField ?? "throw";

	function SmartField({
		name,
		disabled,
		config,
	}: SmartFieldProps): ReactElement | null {
		const { fieldMap } = useFormContextValue(FormContext, "SmartField");

		// Hot path: split + regex + tree walk once per (fieldMap, name).
		const resolved = useMemo((): { def: FieldDef } | { error: Error } => {
			try {
				return { def: resolveFieldDef(fieldMap, name) };
			} catch (error) {
				return {
					error:
						error instanceof Error
							? error
							: createFormError(`No field definition found for "${name}"`),
				};
			}
		}, [fieldMap, name]);

		if ("error" in resolved) {
			if (onMissingField === "warn" || isProduction()) {
				devWarn(`SmartField: could not render field "${name}"`, [
					"The field was not found in the schema or has an unsupported type.",
					"SmartField will render nothing for this field.",
					"Check that the name prop matches a key in your object schema.",
				]);
				return null;
			}
			throw resolved.error;
		}

		const def = resolved.def;
		const Component = fieldComponents[def.kind];
		if (!Component) {
			const message = `No component registered for field kind "${def.kind}" (field "${name}")`;
			const availableKinds = Object.keys(fieldComponents);
			const details = [
				availableKinds.length
					? `Available component kinds: ${availableKinds.join(", ")}`
					: "No components have been registered.",
				`Add a component for kind "${def.kind}" to the fieldComponents map passed to createFormSystem().`,
			];
			if (onMissingField === "warn" || isProduction()) {
				devWarn(message, details);
				return null;
			}
			throw createFormError(message, details);
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

	return Object.assign(SmartField, { displayName: "SmartField" });
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
