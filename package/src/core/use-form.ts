import { useCallback, useMemo, useRef } from "react";
import type {
	DefaultValues,
	FieldErrors,
	FieldValues,
	Resolver,
} from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import type {
	FormInstance,
	InferFormValues,
	SchemaAdapter,
	SchemaTree,
	UseFormOptions,
} from "#/types";

export type InferredValues<S> =
	InferFormValues<S> extends FieldValues ? InferFormValues<S> : FieldValues;

function getCachedFieldMap<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
	cache: WeakMap<object, SchemaTree>,
	schema: TSchema,
): SchemaTree {
	if (typeof schema === "object" && schema !== null) {
		const hit = cache.get(schema);
		if (hit) return hit;
		const fieldMap = schemaResolver.buildFieldMap(schema);
		cache.set(schema, fieldMap);
		return fieldMap;
	}
	return schemaResolver.buildFieldMap(schema);
}

function getCachedResolver<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
	cache: WeakMap<object, Resolver>,
	schema: TSchema,
): Resolver {
	if (typeof schema === "object" && schema !== null) {
		const hit = cache.get(schema);
		if (hit) return hit;
		const resolver = schemaResolver.createResolver(schema);
		cache.set(schema, resolver);
		return resolver;
	}
	return schemaResolver.createResolver(schema);
}

export function createUseForm<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
): <const S extends TSchema, TValues extends FieldValues = InferredValues<S>>(
	options: UseFormOptions<S, TValues>,
) => FormInstance<TValues> {
	// Per-factory caches: shared across every useForm call with the same schema
	// object (GC-safe — entries vanish with their schema key). Pair with
	// hoisted `schema` objects for O(1) hits instead of per-render walks.
	const fieldMapCache = new WeakMap<object, SchemaTree>();
	const resolverCache = new WeakMap<object, Resolver>();

	return function useForm<
		const S extends TSchema,
		TValues extends FieldValues = InferredValues<S>,
	>(options: UseFormOptions<S, TValues>): FormInstance<TValues> {
		const {
			schema,
			onSubmit,
			onInvalid,
			defaultValues,
			validationMode = "onBlur",
			reValidateMode = "onChange",
		} = options;

		const fieldMap = useMemo(
			() => getCachedFieldMap(schemaResolver, fieldMapCache, schema),
			[schema],
		);
		const defaults = useMemo(
			() => schemaResolver.buildDefaults(fieldMap, defaultValues),
			[fieldMap, defaultValues],
		);
		const resolver = useMemo(
			() => getCachedResolver(schemaResolver, resolverCache, schema),
			[schema],
		);

		const methods = useRhfForm<TValues, unknown, TValues>({
			defaultValues: defaults as DefaultValues<TValues>,
			mode: validationMode,
			resolver: resolver as Resolver<TValues, unknown, TValues>,
			reValidateMode,
		});

		// Latest-ref stabilization: inline onSubmit/onInvalid no longer churn
		// the returned `form` identity (and downstream FormProvider renders).
		const onSubmitRef = useRef(onSubmit);
		onSubmitRef.current = onSubmit;
		const onInvalidRef = useRef(onInvalid);
		onInvalidRef.current = onInvalid;
		const stableOnSubmit = useCallback(
			(values: TValues) => onSubmitRef.current(values),
			[],
		);
		const stableOnInvalid = useCallback(
			(errors: FieldErrors<TValues>) => onInvalidRef.current?.(errors),
			[],
		);

		return useMemo(
			() =>
				({
					...methods,
					fieldMap,
					onInvalid: stableOnInvalid,
					onSubmit: stableOnSubmit,
				}) as FormInstance<TValues>,
			[methods, fieldMap, stableOnInvalid, stableOnSubmit],
		);
	};
}
