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
	[key: string]: unknown;
};

export type KnownFieldKind =
	| "string"
	| "email"
	| "url"
	| "number"
	| "boolean"
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

type BaseFieldDef = {
	optional: boolean;
	meta?: FieldMeta;
};

export type StringFieldDef = BaseFieldDef & {
	kind: "string" | "email" | "url";
	checks?: Array<FieldCheck>;
	min?: number;
	max?: number;
	entries?: never;
	elementFields?: never;
	elementDef?: never;
};

export type NumberFieldDef = BaseFieldDef & {
	kind: "number";
	checks?: Array<FieldCheck>;
	min?: number;
	max?: number;
	entries?: never;
	elementFields?: never;
	elementDef?: never;
};

export type BooleanFieldDef = BaseFieldDef & {
	kind: "boolean";
	checks?: never;
	min?: never;
	max?: never;
	entries?: never;
	elementFields?: never;
	elementDef?: never;
};

export type EnumFieldDef = BaseFieldDef & {
	kind: "enum";
	entries?: Record<string, string>;
	checks?: never;
	min?: never;
	max?: never;
	elementFields?: never;
	elementDef?: never;
};

export type ArrayFieldDef = BaseFieldDef & {
	kind: "array";
	elementDef?: FieldDef;
	checks?: Array<FieldCheck>;
	min?: number;
	max?: number;
	entries?: never;
	elementFields?: never;
};

export type ObjectFieldDef = BaseFieldDef & {
	kind: "object";
	elementFields: SchemaTree;
	entries?: never;
	elementDef?: never;
	checks?: never;
	min?: never;
	max?: never;
};

export type DateFieldDef = BaseFieldDef & {
	kind: "date";
	checks?: never;
	min?: never;
	max?: never;
	entries?: never;
	elementFields?: never;
	elementDef?: never;
};

/** Custom kinds are leaf-or-container permissive so third-party adapters keep working. */
export type CustomFieldDef = BaseFieldDef & {
	kind: string;
	checks?: Array<FieldCheck>;
	min?: number;
	max?: number;
	entries?: Record<string, string>;
	elementFields?: SchemaTree;
	elementDef?: FieldDef;
};

export type FieldDef =
	| StringFieldDef
	| NumberFieldDef
	| BooleanFieldDef
	| EnumFieldDef
	| ArrayFieldDef
	| ObjectFieldDef
	| DateFieldDef
	| CustomFieldDef;

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
	number: number;
	boolean: boolean;
	enum: string;
	date: Date;
	array: unknown[];
	object: Record<string, unknown>;
};

export type ComboboxConfig = {
	options: string[];
};

/**
 * Identity helper that preserves `TValue`/`TConfig` inference for a field
 * widget. Zero runtime behavior by design — the value is the type-level
 * contract, so `defineFieldComponent<number>(MyInput)` stays checked while
 * `FieldComponentMap` remains bivariant at registration.
 */
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
	createFieldMap(schema: TSchema): SchemaTree;
	createResolver(schema: TSchema): Resolver;
	readonly _infer?: TValues;
};

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

type WithFieldMap = {
	fieldMap: SchemaTree;
};

export type FormContextValue = WithFieldMap;

export type FormContextInstance<TValues extends FieldValues = FieldValues> =
	UseFormReturn<TValues> & WithFieldMap;

export type FormInstance<TValues extends FieldValues = FieldValues> =
	UseFormReturn<TValues, unknown, TValues> &
		WithFieldMap & {
			onSubmit: (values: TValues) => void | Promise<void>;
			onInvalid?: (errors: FieldErrors<TValues>) => void;
			onSubmitError?: (error: unknown) => void;
		};

export type UseFormOptions<
	TSchema,
	TValues extends FieldValues = FieldValues,
> = {
	schema: TSchema;
	onSubmit: (values: TValues) => void | Promise<void>;
	onInvalid?: (errors: FieldErrors<TValues>) => void;
	onSubmitError?: (error: unknown) => void;
	defaultValues?: DefaultValues<TValues>;
	validationMode?: ValidationMode;
	reValidateMode?: ReValidateMode;
};

/** Missing field/kind policy: `"throw"` throws in dev (default), `"warn"` renders `null` with a dev warning. Production always warns + renders `null`. */
export type OnMissingField = "throw" | "warn";
