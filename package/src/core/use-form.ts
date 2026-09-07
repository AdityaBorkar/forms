import { useCallback, useMemo, useRef } from "react";
import type {
	DefaultValues,
	FieldErrors,
	FieldValues,
	Resolver,
} from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import { createFormError } from "#/core/errors.ts";
import type {
	FormInstance,
	InferFormValues,
	SchemaAdapter,
	SchemaTree,
	UseFormOptions,
} from "#/types";

export type InferredValues<S> =
	InferFormValues<S> extends FieldValues ? InferFormValues<S> : FieldValues;

function runAdapterStep<T>(stage: string, hint: string, fn: () => T): T {
	try {
		return fn();
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.startsWith("[@adistack/forms]")
		) {
			throw error;
		}
		throw createFormError(stage, [
			hint,
			error instanceof Error ? error.message : String(error),
		]);
	}
}

/**
 * Cross-instance cache: `useMemo([schema])` already avoids rebuilds within one
 * hook instance, while this `WeakMap` shares the built field map / resolver
 * across mounts that reuse the same schema object. Non-object schemas bypass
 * the cache (adapters always receive objects in practice).
 */
function getOrBuild<T>(
	cache: WeakMap<object, T>,
	schema: unknown,
	build: () => T,
): T {
	if (typeof schema === "object" && schema !== null) {
		const hit = cache.get(schema);
		if (hit !== undefined) return hit;
		const value = build();
		cache.set(schema, value);
		return value;
	}
	return build();
}

function useStableCallback<Args extends unknown[], R>(
	fn: ((...args: Args) => R) | undefined,
): (...args: Args) => R | undefined {
	const ref = useRef(fn);
	ref.current = fn;
	return useCallback((...args: Args) => ref.current?.(...args), []);
}

export function createUseForm<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
): <const S extends TSchema, TValues extends FieldValues = InferredValues<S>>(
	options: UseFormOptions<S, TValues>,
) => FormInstance<TValues> {
	const fieldMapCache = new WeakMap<object, SchemaTree>();
	const resolverCache = new WeakMap<object, Resolver>();

	return function useForm<
		const S extends TSchema,
		TValues extends FieldValues = InferredValues<S>,
	>(options: UseFormOptions<S, TValues>): FormInstance<TValues> {
		// biome-ignore lint/suspicious/noUnnecessaryConditions: runtime guard for developer misuse
		if (!options) {
			throw createFormError("useForm requires an options object", [
				"Call useForm({ schema, onSubmit, ... }).",
			]);
		}
		const {
			schema,
			onSubmit,
			onInvalid,
			onSubmitError,
			defaultValues,
			validationMode = "onBlur",
			reValidateMode = "onChange",
		} = options;

		if (schema === null || schema === undefined) {
			throw createFormError("useForm requires a schema", [
				"Pass the validation schema, e.g. useForm({ schema: mySchema, onSubmit }).",
				"Make sure the schema matches the adapter passed to createFormSystem().",
			]);
		}
		if (typeof onSubmit !== "function") {
			throw createFormError("useForm requires an onSubmit handler", [
				"Pass a submit handler, e.g. useForm({ schema, onSubmit: (values) => ... }).",
				`Received ${typeof onSubmit}.`,
			]);
		}

		const fieldMap = useMemo(
			() =>
				getOrBuild(fieldMapCache, schema, () =>
					runAdapterStep(
						"useForm could not build the field map from your schema",
						"Check that the schema matches the adapter (e.g. a Zod object for zodAdapter).",
						() => schemaResolver.createFieldMap(schema),
					),
				),
			[schema],
		);
		const resolver = useMemo(
			() =>
				getOrBuild(resolverCache, schema, () =>
					runAdapterStep(
						"useForm could not create the form resolver from your schema",
						"Check that the schema is a valid schema for the adapter.",
						() => schemaResolver.createResolver(schema),
					),
				),
			[schema],
		);

		const methods = useRhfForm<TValues, unknown, TValues>({
			defaultValues: defaultValues as DefaultValues<TValues> | undefined,
			mode: validationMode,
			resolver: resolver as Resolver<TValues, unknown, TValues>,
			reValidateMode,
		});

		const stableOnSubmit = useStableCallback<[TValues], void | Promise<void>>(
			onSubmit,
		);
		const stableOnInvalid = useStableCallback<[FieldErrors<TValues>], void>(
			onInvalid,
		);
		const stableOnSubmitError = useStableCallback<[unknown], void>(
			onSubmitError,
		);

		return useMemo(
			() =>
				({
					...methods,
					fieldMap,
					onInvalid: stableOnInvalid,
					onSubmit: stableOnSubmit,
					onSubmitError: stableOnSubmitError,
				}) as FormInstance<TValues>,
			[methods, fieldMap, stableOnInvalid, stableOnSubmit, stableOnSubmitError],
		);
	};
}
