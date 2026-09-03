import { useMemo } from "react";
import type {
	DefaultValues,
	FieldErrors,
	FieldValues,
	Resolver,
	UseFormReturn,
} from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import type { SchemaAdapter, SchemaTree, UseFormOptions } from "@/types";

export type FormInstance<TValues extends FieldValues = FieldValues> =
	UseFormReturn<TValues, unknown, TValues> & {
		fieldMap: SchemaTree;
		onSubmit: (values: TValues) => void;
		onInvalid?: (errors: FieldErrors<TValues>) => void;
	};

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
			// biome-ignore lint/correctness/useExhaustiveDependencies: schemaResolver is a stable factory closure
			[schema],
		);
		const defaults = useMemo(
			() => schemaResolver.buildDefaults(fieldMap, defaultValues),
			// biome-ignore lint/correctness/useExhaustiveDependencies: schemaResolver is a stable factory closure
			[fieldMap, defaultValues],
		);
		const resolver = useMemo(
			() => schemaResolver.createResolver(schema),
			// biome-ignore lint/correctness/useExhaustiveDependencies: schemaResolver is a stable factory closure
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
