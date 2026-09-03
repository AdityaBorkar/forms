import { useMemo } from "react";
import type { DefaultValues, FieldValues, Resolver } from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import type { FormInstance, SchemaAdapter, UseFormOptions } from "@/types";

export function createUseForm<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
): <TValues extends FieldValues = FieldValues>(
	options: UseFormOptions<TSchema, TValues>,
) => FormInstance<TValues> {
	return function useForm<TValues extends FieldValues = FieldValues>(
		options: UseFormOptions<TSchema, TValues>,
	): FormInstance<TValues> {
		const {
			schema,
			onSubmit,
			onInvalid,
			defaultValues,
			validationMode = "onBlur",
			reValidateMode = "onChange",
		} = options;

		const fieldMap = useMemo(
			() => schemaResolver.buildFieldMap(schema),
			[schema],
		);
		const defaults = useMemo(
			() => schemaResolver.buildDefaults(fieldMap, defaultValues),
			[fieldMap, defaultValues],
		);
		const resolver = useMemo(
			() => schemaResolver.createResolver(schema),
			[schema],
		);

		const methods = useRhfForm<TValues, unknown, TValues>({
			defaultValues: defaults as DefaultValues<TValues>,
			mode: validationMode,
			resolver: resolver as Resolver<TValues, unknown, TValues>,
			reValidateMode,
		});

		return useMemo(
			() =>
				({
					...methods,
					fieldMap,
					onInvalid,
					onSubmit,
				}) as FormInstance<TValues>,
			[methods, fieldMap, onInvalid, onSubmit],
		);
	};
}
