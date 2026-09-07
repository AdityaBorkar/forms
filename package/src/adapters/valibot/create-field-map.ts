import type {
	ArraySchema,
	DescriptionAction,
	Enum,
	EnumSchema,
	ExactOptionalSchema,
	GenericPipeItem,
	GenericSchema,
	GtValueAction,
	LengthAction,
	LengthInput,
	LtValueAction,
	MaxLengthAction,
	MaxValueAction,
	MetadataAction,
	MinLengthAction,
	MinValueAction,
	NullableSchema,
	NullishSchema,
	ObjectEntries,
	ObjectSchema,
	OptionalSchema,
	PicklistOptions,
	PicklistSchema,
	SchemaWithPipe,
	TitleAction,
	UnionOptions,
	UnionSchema,
	ValueInput,
} from "valibot";

import type { ConstraintAcc } from "#/adapters/shared";
import { isFieldMeta, makeFieldDef } from "#/adapters/shared";
import { createFormError } from "#/core/errors.ts";
import type { FieldCheck, FieldDef, FieldMeta, SchemaTree } from "#/types";

const SUPPORTED_TYPES = [
	"string",
	"number",
	"boolean",
	"picklist",
	"enum",
	"array",
	"object",
	"date",
] as const;

/** Only these wrappers allow `undefined`. `nullable` alone does not. */
const OPTIONAL_WRAPPERS = ["optional", "nullish", "exact_optional"] as const;

type Constraints = {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
};

function getPipe(schema: GenericSchema): readonly GenericPipeItem[] {
	if (!("pipe" in schema)) return [];
	const piped = schema as SchemaWithPipe<
		readonly [GenericSchema, ...GenericPipeItem[]]
	>;
	return Array.isArray(piped.pipe) ? piped.pipe : [];
}

function getMeta(schema: GenericSchema): FieldMeta | undefined {
	let meta: FieldMeta | undefined;
	for (const item of getPipe(schema)) {
		if (item.kind !== "metadata") continue;
		if (item.type === "metadata") {
			const metadata = (
				item as MetadataAction<unknown, Record<string, unknown>>
			).metadata;
			if (isFieldMeta(metadata)) meta = { ...(meta ?? {}), ...metadata };
		} else if (item.type === "title") {
			const title = (item as TitleAction<unknown, string>).title;
			if (typeof title === "string")
				meta = { ...(meta ?? {}), label: title, title };
		} else if (item.type === "description") {
			const description = (item as DescriptionAction<unknown, string>)
				.description;
			if (typeof description === "string")
				meta = { ...(meta ?? {}), description };
		}
	}
	return meta && Object.keys(meta).length ? meta : undefined;
}

function collectConstraints(
	pipe: readonly GenericPipeItem[],
	process: (action: GenericPipeItem, acc: ConstraintAcc) => void,
): Constraints {
	const acc = { checks: [] };
	for (const action of pipe) {
		if (action.kind !== "validation") continue;
		process(action, acc);
	}
	return acc;
}

function deriveLengthConstraints(
	pipe: readonly GenericPipeItem[],
): Constraints {
	return collectConstraints(pipe, (action, acc) => {
		if (action.type === "min_length") {
			const requirement = (
				action as MinLengthAction<LengthInput, number, undefined>
			).requirement;
			if (typeof requirement === "number") {
				acc.min = requirement;
				acc.checks.push({ type: "min", value: requirement });
			}
		} else if (action.type === "max_length") {
			const requirement = (
				action as MaxLengthAction<LengthInput, number, undefined>
			).requirement;
			if (typeof requirement === "number") {
				acc.max = requirement;
				acc.checks.push({ type: "max", value: requirement });
			}
		} else if (action.type === "length") {
			const requirement = (
				action as LengthAction<LengthInput, number, undefined>
			).requirement;
			if (typeof requirement === "number") {
				acc.min = requirement;
				acc.max = requirement;
				acc.checks.push({ type: "min", value: requirement });
				acc.checks.push({ type: "max", value: requirement });
			}
		} else if (action.type === "non_empty") {
			if (acc.min === undefined) {
				acc.min = 1;
				acc.checks.push({ type: "min", value: 1 });
			}
		} else if (action.type === "email" || action.type === "rfc_email") {
			acc.checks.push({ type: "email" });
		} else if (action.type === "url") {
			acc.checks.push({ type: "url" });
		}
	});
}

function deriveNumberConstraints(
	pipe: readonly GenericPipeItem[],
): Constraints {
	return collectConstraints(pipe, (action, acc) => {
		if (action.type === "min_value") {
			const requirement = (
				action as MinValueAction<ValueInput, ValueInput, undefined>
			).requirement;
			if (typeof requirement === "number") acc.min = requirement;
		} else if (action.type === "max_value") {
			const requirement = (
				action as MaxValueAction<ValueInput, ValueInput, undefined>
			).requirement;
			if (typeof requirement === "number") acc.max = requirement;
		} else if (action.type === "gt_value") {
			const requirement = (
				action as GtValueAction<ValueInput, ValueInput, undefined>
			).requirement;
			if (typeof requirement === "number")
				acc.checks.push({ type: "gt", value: requirement });
		} else if (action.type === "lt_value") {
			const requirement = (
				action as LtValueAction<ValueInput, ValueInput, undefined>
			).requirement;
			if (typeof requirement === "number")
				acc.checks.push({ type: "lt", value: requirement });
		} else if (action.type === "integer" || action.type === "safe_integer") {
			acc.checks.push({ type: action.type });
		}
	});
}

function resolveStringKind(pipe: readonly GenericPipeItem[]): string {
	const formats = pipe
		.filter((action) => action.kind === "validation")
		.map((action) => action.type);
	if (formats.includes("email") || formats.includes("rfc_email"))
		return "email";
	if (formats.includes("url")) return "url";
	return "string";
}

function resolveEnumEntries(
	schema: GenericSchema,
): Record<string, string> | undefined {
	if ("enum" in schema) {
		const enumObj = (schema as EnumSchema<Enum, undefined>).enum;
		if (enumObj && typeof enumObj === "object") {
			const entries: Record<string, string> = {};
			for (const [key, value] of Object.entries(enumObj)) {
				entries[key] = String(value);
			}
			return entries;
		}
	}
	if ("options" in schema) {
		const options = (schema as PicklistSchema<PicklistOptions, undefined>)
			.options;
		if (Array.isArray(options)) {
			const entries: Record<string, string> = {};
			for (const option of options) {
				if (typeof option === "string" || typeof option === "number") {
					entries[String(option)] = String(option);
				}
			}
			if (Object.keys(entries).length) return entries;
		}
	}
	return undefined;
}

type Resolved = Omit<FieldDef, "optional" | "meta">;

function resolveType(
	schema: GenericSchema,
	type: string,
	pipe: readonly GenericPipeItem[],
	fieldPath: string,
): Resolved {
	switch (type) {
		case "string":
			return {
				...deriveLengthConstraints(pipe),
				kind: resolveStringKind(pipe),
			};
		case "number":
			return { ...deriveNumberConstraints(pipe), kind: "number" };
		case "boolean":
			return { kind: "boolean" };
		case "picklist":
		case "enum": {
			const entries = resolveEnumEntries(schema);
			return { kind: "enum", ...(entries && { entries }) };
		}
		case "array": {
			const item =
				"item" in schema
					? (schema as ArraySchema<GenericSchema, undefined>).item
					: undefined;
			if (!item) return { kind: "array" };
			const elementDef = createFieldDefInner(item, false, `${fieldPath}[]`);
			return {
				...deriveLengthConstraints(pipe),
				elementDef,
				kind: "array",
			};
		}
		case "object":
			return {
				elementFields: createFieldMapInner(schema, fieldPath),
				kind: "object",
			};
		case "date":
			return { kind: "date" };
		case "record":
			throw createFormError(
				`Unsupported Valibot type: record (field "${fieldPath}")`,
				[
					`The "record" type is not supported by the form builder.`,
					`Supported Valibot types: ${SUPPORTED_TYPES.join(", ")}.`,
					`Consider using v.array() or v.object() instead, or remove this field from the schema.`,
				],
			);
		default:
			throw createFormError(
				`Unsupported Valibot type: ${type || "(unknown)"} (field "${fieldPath}")`,
				[`Supported Valibot types: ${SUPPORTED_TYPES.join(", ")}.`],
			);
	}
}

function isSchema(value: unknown): value is GenericSchema {
	return typeof value === "object" && value !== null;
}

function pickUnionOption(
	schemas: GenericSchema[],
	fieldPath: string,
): GenericSchema {
	const nonLiteral = schemas.filter((o) => o.type !== "literal");
	if (nonLiteral.length === 1) return nonLiteral[0] as GenericSchema;
	if (nonLiteral.length === 0) {
		throw createFormError(`Unsupported union in field "${fieldPath}"`, [
			`The union has no non-literal option to render as a field.`,
			`Use a single field type with an optional literal, or pick one branch.`,
		]);
	}
	throw createFormError(`Ambiguous union in field "${fieldPath}"`, [
		`The union has ${nonLiteral.length} non-literal options; the form builder cannot guess which one to render.`,
		`Narrow the schema to a single branch for this field.`,
	]);
}

function createFieldDefInner(
	schema: GenericSchema,
	optional = false,
	fieldPath = "<root>",
): FieldDef {
	const type = schema.type;
	const meta = getMeta(schema);

	let result: FieldDef;
	const forcesOptional = (OPTIONAL_WRAPPERS as readonly string[]).includes(
		type,
	);
	if (forcesOptional || type === "nullable") {
		const wrapped =
			"wrapped" in schema
				? (
						schema as
							| OptionalSchema<GenericSchema, undefined>
							| NullishSchema<GenericSchema, undefined>
							| NullableSchema<GenericSchema, undefined>
							| ExactOptionalSchema<GenericSchema, undefined>
					).wrapped
				: undefined;
		if (!wrapped) {
			throw createFormError(
				`Optional wrapper has no wrapped schema (field "${fieldPath}")`,
				[
					`This usually indicates a malformed Valibot schema.`,
					`Ensure the field is defined as v.optional(v.someType()).`,
				],
			);
		}
		const inner = createFieldDefInner(
			wrapped,
			forcesOptional || optional,
			fieldPath,
		);
		// `nullable` alone preserves outer optionality (`null` is a value, not
		// absence); optional wrappers force `optional: true`.
		const mergedOptional = forcesOptional || optional || inner.optional;
		result = makeFieldDef(inner, mergedOptional, { ...inner.meta, ...meta });
	} else if (type === "union") {
		const options =
			"options" in schema
				? (schema as UnionSchema<UnionOptions, undefined>).options
				: [];
		const schemas = (Array.isArray(options) ? options : []).filter(isSchema);
		if (schemas.length === 0) {
			throw createFormError(
				`Union type has no options (field "${fieldPath}")`,
				[
					`The union type was defined with an empty options array.`,
					`Ensure v.union() has at least one option, e.g. v.union([v.string(), v.number()]).`,
				],
			);
		}
		const picked = pickUnionOption(schemas, fieldPath);
		const inner = createFieldDefInner(picked, optional, fieldPath);
		const mergedOptional = optional || inner.optional;
		result = makeFieldDef(inner, mergedOptional, { ...inner.meta, ...meta });
	} else {
		result = makeFieldDef(
			resolveType(schema, type, getPipe(schema), fieldPath),
			optional,
			meta,
		);
	}

	return result;
}

function createFieldMapInner(
	schema: GenericSchema | undefined,
	parentPath: string,
): SchemaTree {
	if (!schema || !("entries" in schema)) return {};
	const entries = (schema as ObjectSchema<ObjectEntries, undefined>).entries;
	if (!entries || typeof entries !== "object") return {};
	const map: SchemaTree = {};
	for (const [key, fieldSchema] of Object.entries(entries)) {
		const fieldPath = parentPath ? `${parentPath}.${key}` : key;
		map[key] = createFieldDefInner(
			fieldSchema as GenericSchema,
			false,
			fieldPath,
		);
	}
	return map;
}

export function createFieldMap(schema: GenericSchema | undefined): SchemaTree {
	return createFieldMapInner(schema, "");
}
