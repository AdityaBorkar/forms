import { useCallback, useMemo, useRef } from "react";
import type {
	DefaultValues,
	FieldErrors,
	FieldValues,
	Resolver,
} from "react-hook-form";
import { useForm as useRhfForm } from "react-hook-form";

import { createFormError } from "#/errors";
import type {
	FormInstance,
	InferFormValues,
	ReValidateMode,
	SchemaAdapter,
	SchemaTree,
	UseFormOptions,
	ValidationMode,
} from "#/types";

export type InferredValues<S> =
	InferFormValues<S> extends FieldValues ? InferFormValues<S> : FieldValues;

const VALIDATION_MODES: readonly ValidationMode[] = [
	"onBlur",
	"onChange",
	"onSubmit",
	"onTouched",
	"all",
];

const RE_VALIDATE_MODES: readonly ReValidateMode[] = [
	"onChange",
	"onBlur",
	"onSubmit",
];

const FORM_ERROR_PREFIX = "[@adistack/forms]";

/**
 * Run one adapter step, adding form-system context when a custom adapter
 * throws a raw error. Errors the adapter already built with `createFormError`
 * (e.g. unsupported-type messages) pass through untouched.
 */
function runAdapterStep<T>(stage: string, hint: string, fn: () => T): T {
	try {
		return fn();
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(FORM_ERROR_PREFIX)) {
			throw error;
		}
		throw createFormError(stage, [
			hint,
			error instanceof Error ? error.message : String(error),
		]);
	}
}

function getCachedFieldMap<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
	cache: WeakMap<object, SchemaTree>,
	schema: TSchema,
): SchemaTree {
	if (typeof schema === "object" && schema !== null) {
		const hit = cache.get(schema);
		if (hit) return hit;
		const fieldMap = runAdapterStep(
			"useForm could not build the field map from your schema",
			"Check that the schema matches the adapter (e.g. a Zod object for zodAdapter).",
			() => schemaResolver.buildFieldMap(schema),
		);
		cache.set(schema, fieldMap);
		return fieldMap;
	}
	return runAdapterStep(
		"useForm could not build the field map from your schema",
		"Check that the schema matches the adapter (e.g. a Zod object for zodAdapter).",
		() => schemaResolver.buildFieldMap(schema),
	);
}

function getCachedResolver<TSchema>(
	schemaResolver: SchemaAdapter<TSchema>,
	cache: WeakMap<object, Resolver>,
	schema: TSchema,
): Resolver {
	if (typeof schema === "object" && schema !== null) {
		const hit = cache.get(schema);
		if (hit) return hit;
		const resolver = runAdapterStep(
			"useForm could not create the form resolver from your schema",
			"Check that the schema is a valid schema for the adapter.",
			() => schemaResolver.createResolver(schema),
		);
		cache.set(schema, resolver);
		return resolver;
	}
	return runAdapterStep(
		"useForm could not create the form resolver from your schema",
		"Check that the schema is a valid schema for the adapter.",
		() => schemaResolver.createResolver(schema),
	);
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
		// Fail fast on developer misuse with an actionable message instead of a
		// cryptic failure deep inside the adapter or react-hook-form. These
		// throws are deterministic per call site, so hook order is unaffected.
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
		if (!VALIDATION_MODES.includes(validationMode)) {
			throw createFormError(
				`Invalid validationMode "${validationMode as string}"`,
				[
					`Expected one of: ${VALIDATION_MODES.join(", ")}.`,
					"Pass it as useForm({ validationMode: ... }).",
				],
			);
		}
		if (!RE_VALIDATE_MODES.includes(reValidateMode)) {
			throw createFormError(
				`Invalid reValidateMode "${reValidateMode as string}"`,
				[
					`Expected one of: ${RE_VALIDATE_MODES.join(", ")}.`,
					"Pass it as useForm({ reValidateMode: ... }).",
				],
			);
		}

		const fieldMap = useMemo(
			() => getCachedFieldMap(schemaResolver, fieldMapCache, schema),
			[schema],
		);
		const defaults = useMemo(
			() =>
				runAdapterStep(
					"useForm could not derive default values from the field map",
					"Check that defaultValues matches the shape of your schema.",
					() => schemaResolver.buildDefaults(fieldMap, defaultValues),
				),
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

		// Latest-ref stabilization: inline onSubmit/onInvalid/onSubmitError no
		// longer churn the returned `form` identity (and downstream
		// FormProvider renders).
		const onSubmitRef = useRef(onSubmit);
		onSubmitRef.current = onSubmit;
		const onInvalidRef = useRef(onInvalid);
		onInvalidRef.current = onInvalid;
		const onSubmitErrorRef = useRef(onSubmitError);
		onSubmitErrorRef.current = onSubmitError;
		const stableOnSubmit = useCallback(
			(values: TValues) => onSubmitRef.current(values),
			[],
		);
		const stableOnInvalid = useCallback(
			(errors: FieldErrors<TValues>) => onInvalidRef.current?.(errors),
			[],
		);
		const stableOnSubmitError = useCallback((error: unknown) => {
			onSubmitErrorRef.current?.(error);
		}, []);

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
