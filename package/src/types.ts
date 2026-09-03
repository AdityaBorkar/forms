import type React from "react";
import type {
	DefaultValues,
	FieldErrors,
	FieldValues,
	Resolver,
} from "react-hook-form";

export type FieldMeta = {
	label?: string;
	placeholder?: string;
	description?: string;
	/** Override the resolved kind to dispatch a custom component. */
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

/** Resolved field kind. Known kinds get autocomplete; custom kinds stay allowed. */
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
	/** True when the value may be `undefined`. Single source of truth — derive "required" as `!optional`. */
	optional: boolean;
	meta?: FieldMeta;
	checks?: Array<FieldCheck>;
	entries?: Record<string, string>;
	/** Child fields for `object` kinds and for `array` kinds whose element is an object. */
	elementFields?: SchemaTree;
	/**
	 * Element definition for `array` kinds.
	 * Present whenever the array element type is known, including primitives
	 * (e.g. `z.array(z.string())` yields an `elementDef` of kind `string`).
	 */
	elementDef?: FieldDef;
	min?: number;
	max?: number;
};

export type SchemaTree = Record<string, FieldDef>;

export type FieldComponentProps = {
	def: FieldDef;
	name: string;
	value?: unknown;
	onChange: (value: unknown) => void;
	onBlur: () => void;
	ref: React.RefCallback<HTMLElement>;
	error?: string;
	disabled?: boolean;
	config?: Record<string, unknown>;
};

export type FieldComponentMap = Record<
	string,
	React.ComponentType<FieldComponentProps>
>;

export type SchemaAdapter<TSchema> = {
	buildFieldMap(schema: TSchema): SchemaTree;
	buildDefaults(
		fieldMap: SchemaTree,
		overrides?: Record<string, unknown>,
	): DefaultValues<FieldValues>;
	createResolver(schema: TSchema): Resolver;
};

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

export type UseFormOptions<
	TSchema,
	TValues extends FieldValues = FieldValues,
> = {
	schema: TSchema;
	onSubmit: (values: TValues) => void;
	onInvalid?: (errors: FieldErrors<TValues>) => void;
	defaultValues?: DefaultValues<TValues>;
	validationMode?: ValidationMode;
	reValidateMode?: ReValidateMode;
};
