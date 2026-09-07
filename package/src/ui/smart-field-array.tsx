import type { ComponentType, Context, ReactElement, ReactNode } from "react";
import {
	useFieldArray,
	useFormContext as useRhfContext,
} from "react-hook-form";

import { devWarn, missingField, shouldWarnOnMissing } from "#/core/errors.ts";
import { useFormContextValue } from "#/core/form-context";
import { resolveFieldDef } from "#/core/resolve-field-def";
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
 * `SmartField`'s default policy); warn mode (or production) warns and lets
 * `useFieldArray` carry on so a misnamed array never takes down a live form.
 * Called in the outer component so invalid names fail before subscribing.
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
		if (shouldWarnOnMissing(onMissingField)) {
			devWarn(`SmartFieldArray: could not find array field "${name}"`, [
				"The field was not found in the schema or has an unsupported type.",
				"Check that the name prop matches an array key in your object schema.",
			]);
			return;
		}
		throw error;
	}
	if (kind !== "array") {
		missingField(
			`SmartFieldArray can only be used with array fields (field "${name}" is kind "${kind}")`,
			[
				`Check that "${name}" is an array in your schema.`,
				"For non-array fields, render a <SmartField> instead.",
			],
			onMissingField,
		);
	}
}

function ArrayFieldInner({ name, children }: SmartFieldArrayProps): ReactNode {
	const rhf = useRhfContext();
	const { fields, append, remove, update, move } = useFieldArray({
		control: rhf.control,
		name,
	});

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

	function SmartFieldArray({
		name,
		children,
	}: SmartFieldArrayProps): ReactElement {
		const { fieldMap } = useFormContextValue(FormContext, "SmartFieldArray");
		assertArrayField(fieldMap, name, onMissingField);
		return <ArrayFieldInner name={name}>{children}</ArrayFieldInner>;
	}

	return Object.assign(SmartFieldArray, {
		displayName: "SmartFieldArray",
	});
}
