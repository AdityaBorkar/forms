import type { ComponentType, Context, ReactElement, ReactNode } from "react";
import { useCallback } from "react";
import {
	useFieldArray,
	useFormContext as useRhfContext,
} from "react-hook-form";

import { deriveDefault, mergeDefaults } from "#/adapters/shared";
import { useFormContextValue } from "#/core/form-context";
import { resolveFieldDef } from "#/core/resolve-field-def";
import { createFormError } from "#/errors";
import type { FormContextValue, SchemaTree } from "#/types";

export type FieldArrayRow = Record<string, unknown> & { id: string };

export type SmartFieldArrayRenderProps = {
	fields: FieldArrayRow[];
	append: (value: Record<string, unknown>) => void;
	/**
	 * Append a schema-derived default row, optionally merged with `overrides`.
	 * Derives from the array's `elementDef` — no row-shape duplication.
	 */
	appendDefault: (overrides?: Record<string, unknown>) => void;
	remove: (index: number) => void;
	update: (index: number, value: Record<string, unknown>) => void;
	move: (from: number, to: number) => void;
};

export type SmartFieldArrayProps = {
	name: string;
	children: (props: SmartFieldArrayRenderProps) => ReactNode;
};

function ArrayFieldInner({
	name,
	children,
	fieldMap,
}: SmartFieldArrayProps & {
	fieldMap: SchemaTree | null;
}): ReactNode {
	const rhf = useRhfContext();
	const { fields, append, remove, update, move } = useFieldArray({
		control: rhf.control,
		name,
	});

	// On click only (never on the render hot path): one resolveFieldDef walk +
	// one deriveDefault recursion over the row shape.
	const appendDefault = useCallback(
		(overrides?: Record<string, unknown>) => {
			if (!fieldMap) {
				throw createFormError(
					`appendDefault for array "${name}" needs the factory-bound SmartFieldArray inside <Form>`,
					[
						"The static SmartFieldArray has no schema context to derive a default row.",
						"Use the SmartFieldArray returned by createFormSystem(), or call append() with an explicit value.",
					],
				);
			}
			const def = resolveFieldDef(fieldMap, name);
			if (def.kind !== "array") {
				throw createFormError(
					`appendDefault can only be used with array fields (field "${name}" is kind "${def.kind}")`,
					[
						`Check that "${name}" is an array in your schema.`,
						"For non-array fields, render a <SmartField> instead.",
					],
				);
			}
			const elementDef = def.elementDef;
			if (!elementDef) {
				throw createFormError(
					`No element definition for array "${name}" — cannot derive a default row`,
					[
						"The array's element type is unknown to the schema adapter.",
						"Call append() with an explicit value instead.",
					],
				);
			}
			append(
				mergeDefaults(deriveDefault(elementDef), overrides) as Record<
					string,
					unknown
				> & { id?: string },
			);
		},
		[fieldMap, name, append],
	);

	return children({
		append,
		appendDefault,
		fields: fields as FieldArrayRow[],
		move,
		remove,
		update,
	});
}

function BaseSmartFieldArray({
	name,
	children,
}: SmartFieldArrayProps): ReactNode {
	return (
		<ArrayFieldInner fieldMap={null} name={name}>
			{children}
		</ArrayFieldInner>
	);
}

export function createSmartFieldArray(
	FormContext: Context<FormContextValue | null>,
): ComponentType<SmartFieldArrayProps> {
	function BoundSmartFieldArray({
		name,
		children,
	}: SmartFieldArrayProps): ReactElement {
		const { fieldMap } = useFormContextValue(FormContext, "SmartFieldArray");
		return (
			<ArrayFieldInner fieldMap={fieldMap} name={name}>
				{children}
			</ArrayFieldInner>
		);
	}

	return Object.assign(BoundSmartFieldArray, {
		displayName: "SmartFieldArray",
	});
}

export function SmartFieldArray({
	name,
	children,
}: SmartFieldArrayProps): ReactNode {
	return <BaseSmartFieldArray name={name}>{children}</BaseSmartFieldArray>;
}

SmartFieldArray.displayName = "SmartFieldArray";
