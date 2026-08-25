import { useMemo } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import type { SchemaAdapter, SchemaTree, UseFormOptions } from "@/types";

export type FormContextInstance = UseFormReturn<FieldValues> & {
	fieldMap: SchemaTree;
};

export type FormInstance<TValues extends FieldValues = FieldValues> =
	FormContextInstance & {
		onSubmit: (values: TValues) => void;
		onInvalid?: (errors: Record<string, unknown>) => void;
	};

export function createUseForm<TSchema>(adapter: SchemaAdapter<TSchema>) {
	return function useForm<TValues extends FieldValues = FieldValues>(
		options: UseFormOptions<TSchema, TValues>,
	): FormInstance<TValues> {
		const {
			schema,
			onSubmit,
			onInvalid,
			defaultValues,
			validationMode = "onBlur",
		} = options;

		const fieldMap = useMemo(() => adapter.buildFieldMap(schema), [schema]);
		const defaults = useMemo(
			() => adapter.buildDefaults(schema, fieldMap, defaultValues),
			[schema, fieldMap, defaultValues],
		);
		const resolver = useMemo(() => adapter.createResolver(schema), [schema]);

		const methods = useRhfForm({
			defaultValues: defaults,
			mode: validationMode,
			resolver,
			reValidateMode: "onChange",
		});

		return {
			...methods,
			fieldMap,
			onInvalid,
			onSubmit,
		};
	};
}
