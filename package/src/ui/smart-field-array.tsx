import type { ComponentType, Context, ReactElement, ReactNode } from "react";
import {
	useFieldArray,
	useFormContext as useRhfContext,
} from "react-hook-form";

import { useFormContextValue } from "@/core/form-context";
import type { FormContextValue } from "@/types";

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

function BaseSmartFieldArray({
	name,
	children,
}: SmartFieldArrayProps): ReactNode {
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
): ComponentType<SmartFieldArrayProps> {
	function BoundSmartFieldArray({
		name,
		children,
	}: SmartFieldArrayProps): ReactElement {
		useFormContextValue(FormContext, "SmartFieldArray");
		return <BaseSmartFieldArray name={name}>{children}</BaseSmartFieldArray>;
	}

	return BoundSmartFieldArray;
}

export function SmartFieldArray({
	name,
	children,
}: SmartFieldArrayProps): ReactNode {
	return <BaseSmartFieldArray name={name}>{children}</BaseSmartFieldArray>;
}
