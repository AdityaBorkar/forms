import type React from "react";
import type {
	DefaultValues,
	FieldErrors,
	FieldValues,
	Resolver,
	UseFormReturn,
} from "react-hook-form";

export type FieldMeta = {
	label?: string;
	placeholder?: string;
	description?: string;
	component?: string;
	[key: string]: unknown;
};

export type KnownFieldKind =
	| "string"
	| "email"
	| "url"
	| "password"
	| "textarea"
	| "combobox"
	| "number"
	| "slider"
	| "boolean"
	| "checkbox"
	| "switch"
	| "enum"
	| "array"
	| "object"
	| "date";

export type FieldKind = KnownFieldKind | (string & {});

export type KnownFieldCheckType =
	| "min"
	| "max"
	| "gt"
	| "lt"
	| "email"
	| "url"
	| "integer"
	| "safe_integer";

export type FieldCheckType = KnownFieldCheckType | (string & {});

export type FieldCheck = {
	type: FieldCheckType;
	value?: unknown;
};

export type FieldDef = {
	kind: FieldKind;
	optional: boolean;
	meta?: FieldMeta;
	checks?: Array<FieldCheck>;
	entries?: Record<string, string>;
	elementFields?: SchemaTree;
	elementDef?: FieldDef;
	min?: number;
	max?: number;
};

export type SchemaTree = Record<string, FieldDef>;

export type FieldComponentProps<
	TValue = unknown,
	TConfig = Record<string, unknown>,
> = {
	def: FieldDef;
	name: string;
	value?: TValue;
	onChange: (value: TValue) => void;
	onBlur: () => void;
	ref: React.RefCallback<HTMLElement>;
	error?: string;
	disabled?: boolean;
	config?: TConfig;
};

export type FieldKindValueMap = {
	string: string;
	email: string;
	url: string;
	password: string;
	textarea: string;
	combobox: string;
	number: number;
	slider: number;
	boolean: boolean;
	checkbox: boolean;
	switch: boolean;
	enum: string;
	date: Date | undefined;
	array: unknown[];
	object: Record<string, unknown>;
};

export type ComboboxConfig = {
	options: string[];
};

export function defineFieldComponent<
	TValue = unknown,
	TConfig = Record<string, unknown>,
>(
	component: React.ComponentType<FieldComponentProps<TValue, TConfig>>,
): React.ComponentType<FieldComponentProps<TValue, TConfig>> {
	return component;
}

export type FieldComponentMap = Record<
	string,
	// biome-ignore lint/suspicious/noExplicitAny: the map must accept widgets typed via defineFieldComponent<TValue, TConfig>; `any` gives the needed bivariance. Safety comes from define-time generics.
	React.ComponentType<FieldComponentProps<any, any>>
>;

export function defineFieldComponents<T extends FieldComponentMap>(map: T): T {
	return map;
}

export type SchemaAdapter<TSchema, TValues = unknown> = {
	buildFieldMap(schema: TSchema): SchemaTree;
	createResolver(schema: TSchema): Resolver;
	/** Phantom output type — never read at runtime. Enables `useForm` inference. */
	readonly _infer?: TValues;
};

/**
 * Structural Standard Schema output inference (zero runtime, zero new deps).
 * Zod v4 (`z.infer`) and Valibot (`v.InferOutput`) both expose
 * `~standard.types.output`, so one conditional covers every adapter.
 * Falls back to `unknown` for non-conforming schemas.
 */
export type InferFormValues<TSchema> = TSchema extends {
	"~standard": { types?: { output?: infer TOut } };
}
	? TOut
	: unknown;

export type ValidationMode =
	| "onBlur"
	| "onChange"
	| "onSubmit"
	| "onTouched"
	| "all";

export type ReValidateMode = "onChange" | "onBlur" | "onSubmit";

export type FormContextValue = {
	fieldMap: SchemaTree;
};

export type FormContextInstance<TValues extends FieldValues = FieldValues> =
	UseFormReturn<TValues> & {
		fieldMap: SchemaTree;
	};

export type FormInstance<TValues extends FieldValues = FieldValues> =
	UseFormReturn<TValues, unknown, TValues> & {
		fieldMap: SchemaTree;
		onSubmit: (values: TValues) => void | Promise<void>;
		onInvalid?: (errors: FieldErrors<TValues>) => void;
		/**
		 * Called when `onSubmit` itself throws or rejects (e.g. a failed server
		 * request). Validation failures still go to `onInvalid`. `<Form>` also
		 * records the failure as a `root.serverError` field error.
		 */
		onSubmitError?: (error: unknown) => void;
	};

export type UseFormOptions<
	TSchema,
	TValues extends FieldValues = FieldValues,
> = {
	schema: TSchema;
	onSubmit: (values: TValues) => void | Promise<void>;
	onInvalid?: (errors: FieldErrors<TValues>) => void;
	/** Called when `onSubmit` throws or rejects. Validation failures still go to `onInvalid`. */
	onSubmitError?: (error: unknown) => void;
	defaultValues?: DefaultValues<TValues>;
	validationMode?: ValidationMode;
	reValidateMode?: ReValidateMode;
};

/** Missing field/kind policy: `"throw"` throws in dev (default), `"warn"` renders `null` with a dev warning. Production always warns + renders `null`. */
export type OnMissingField = "throw" | "warn";
