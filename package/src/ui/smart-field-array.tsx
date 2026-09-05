import type { ComponentType, Context, ReactElement, ReactNode } from "react";
import {
	useFieldArray,
	useFormContext as useRhfContext,
} from "react-hook-form";

import { useFormContextValue } from "#/core/form-context";
import { resolveFieldDef } from "#/core/resolve-field-def";
import { createFormError, devWarn, isProduction } from "#/errors";
import type { FormContextValue, OnMissingField, SchemaTree } from "#/types";

export type FieldArrayRow = Record<string, unknown> & { id: string };

export type SmartFieldArrayRenderProps = {
	fields: FieldArrayRow[];
	append: (value: Record<string, unknown>) => void;
	remove: (index: number) => void;
	update: (index: number, value: Record<string, unknown>) => void;
	move: (from: number, to: number) => void;
};

export type SmartFieldArrayProps = {
	name: string;
	children: (props: SmartFieldArrayRenderProps) => ReactNode;
};

/**
 * Validate that `name` resolves to an array field. Dev throws fast (matching
 * `SmartField`'s default policy); production warns and lets `useFieldArray`
 * carry on so a misnamed array never takes down a live form.
 */
function assertArrayField(
	fieldMap: SchemaTree,
	name: string,
	onMissingField: OnMissingField,
): void {
	let kind: string;
	try {
		kind = resolveFieldDef(fieldMap, name).kind;
	} catch (error) {
		if (onMissingField === "warn" || isProduction()) {
			devWarn(`SmartFieldArray: could not find array field "${name}"`, [
				"The field was not found in the schema or has an unsupported type.",
				"Check that the name prop matches an array key in your object schema.",
			]);
			return;
		}
		throw error;
	}
	if (kind !== "array") {
		const message = `SmartFieldArray can only be used with array fields (field "${name}" is kind "${kind}")`;
		const details = [
			`Check that "${name}" is an array in your schema.`,
			"For non-array fields, render a <SmartField> instead.",
		];
		if (onMissingField === "warn" || isProduction()) {
			devWarn(message, details);
			return;
		}
		throw createFormError(message, details);
	}
}

function ArrayFieldInner({
	name,
	children,
	fieldMap,
	onMissingField,
}: SmartFieldArrayProps & {
	fieldMap: SchemaTree;
	onMissingField: OnMissingField;
}): ReactNode {
	const rhf = useRhfContext();
	const { fields, append, remove, update, move } = useFieldArray({
		control: rhf.control,
		name,
	});

	assertArrayField(fieldMap, name, onMissingField);

	return children({
		append,
		fields: fields as FieldArrayRow[],
		move,
		remove,
		update,
	});
}

export function createSmartFieldArray(
	FormContext: Context<FormContextValue | null>,
	options?: { onMissingField?: OnMissingField },
): ComponentType<SmartFieldArrayProps> {
	const onMissingField = options?.onMissingField ?? "throw";

	function BoundSmartFieldArray({
		name,
		children,
	}: SmartFieldArrayProps): ReactElement {
		const { fieldMap } = useFormContextValue(FormContext, "SmartFieldArray");
		return (
			<ArrayFieldInner
				fieldMap={fieldMap}
				name={name}
				onMissingField={onMissingField}
			>
				{children}
			</ArrayFieldInner>
		);
	}

	return Object.assign(BoundSmartFieldArray, {
		displayName: "SmartFieldArray",
	});
}
