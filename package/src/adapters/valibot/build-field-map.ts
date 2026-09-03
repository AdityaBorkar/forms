import {
	createConstraintAcc,
	finalizeConstraints,
	makeFieldDef,
	mergeMeta,
} from "@/adapters/shared";
import { createFormError } from "@/errors";
import type { FieldCheck, FieldDef, FieldMeta, SchemaTree } from "@/types";

type ValibotPipeItem = {
	kind?: string;
	type?: string;
	requirement?: unknown;
	metadata?: unknown;
	title?: unknown;
	description?: unknown;
};

type ValibotSchema = {
	type?: string;
	entries?: { readonly [key: string]: ValibotSchema };
	item?: ValibotSchema;
	options?: readonly unknown[];
	wrapped?: ValibotSchema;
	enum?: { readonly [key: string]: unknown };
	pipe?: readonly ValibotPipeItem[];
};

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

function getType(schema: ValibotSchema): string {
	return schema.type ?? "";
}

function isFieldMeta(value: unknown): value is FieldMeta {
	return typeof value === "object" && value !== null;
}

function getPipe(schema: ValibotSchema): readonly ValibotPipeItem[] {
	return Array.isArray(schema.pipe) ? schema.pipe : [];
}

function getMeta(schema: ValibotSchema): FieldMeta | undefined {
	let meta: FieldMeta | undefined;
	for (const item of getPipe(schema)) {
		if (item?.kind !== "metadata") continue;
		if (item.type === "metadata" && isFieldMeta(item.metadata)) {
			meta = { ...(meta ?? {}), ...item.metadata };
		} else if (item.type === "title" && typeof item.title === "string") {
			meta = { ...(meta ?? {}), label: item.title, title: item.title };
		} else if (
			item.type === "description" &&
			typeof item.description === "string"
		) {
			meta = { ...(meta ?? {}), description: item.description };
		}
	}
	return meta && Object.keys(meta).length ? meta : undefined;
}

function collectConstraints(
	pipe: readonly ValibotPipeItem[],
	process: (
		action: ValibotPipeItem,
		acc: ReturnType<typeof createConstraintAcc>,
	) => void,
): { checks?: FieldCheck[]; max?: number; min?: number } {
	const acc = createConstraintAcc();
	for (const action of pipe) {
		if (action?.kind !== "validation") continue;
		process(action, acc);
	}
	return finalizeConstraints(acc);
}

function deriveLengthConstraints(pipe: readonly ValibotPipeItem[]): {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
} {
	return collectConstraints(pipe, (action, acc) => {
		const requirement = action.requirement;
		if (action.type === "min_length" && typeof requirement === "number") {
			acc.min = requirement;
			acc.checks.push({ type: "min", value: requirement });
		} else if (
			action.type === "max_length" &&
			typeof requirement === "number"
		) {
			acc.max = requirement;
			acc.checks.push({ type: "max", value: requirement });
		} else if (action.type === "length" && typeof requirement === "number") {
			acc.min = requirement;
			acc.max = requirement;
			acc.checks.push({ type: "min", value: requirement });
			acc.checks.push({ type: "max", value: requirement });
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

function deriveNumberConstraints(pipe: readonly ValibotPipeItem[]): {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
} {
	return collectConstraints(pipe, (action, acc) => {
		const requirement = action.requirement;
		if (action.type === "min_value" && typeof requirement === "number") {
			acc.min = requirement;
		} else if (action.type === "max_value" && typeof requirement === "number") {
			acc.max = requirement;
		} else if (action.type === "gt_value" && typeof requirement === "number") {
			acc.checks.push({ type: "gt", value: requirement });
		} else if (action.type === "lt_value" && typeof requirement === "number") {
			acc.checks.push({ type: "lt", value: requirement });
		} else if (action.type === "integer" || action.type === "safe_integer") {
			acc.checks.push({ type: action.type });
		}
	});
}

function resolveStringKind(pipe: readonly ValibotPipeItem[]): string {
	const formats = pipe
		.filter((action) => action?.kind === "validation")
		.map((action) => action.type);
	if (formats.includes("email") || formats.includes("rfc_email"))
		return "email";
	if (formats.includes("url")) return "url";
	return "string";
}

function resolveEnumEntries(
	schema: ValibotSchema,
): Record<string, string> | undefined {
	if (schema.enum && typeof schema.enum === "object") {
		const entries: Record<string, string> = {};
		for (const [key, value] of Object.entries(schema.enum)) {
			entries[key] = String(value);
		}
		return entries;
	}
	if (Array.isArray(schema.options)) {
		const entries: Record<string, string> = {};
		for (const option of schema.options) {
			if (typeof option === "string" || typeof option === "number") {
				entries[String(option)] = String(option);
			}
		}
		if (Object.keys(entries).length) return entries;
	}
	return undefined;
}

type Resolved = Omit<FieldDef, "optional" | "meta">;

function resolveType(
	schema: ValibotSchema,
	type: string,
	pipe: readonly ValibotPipeItem[],
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
			if (!schema.item) return { kind: "array" };
			const elementDef = buildFieldDefInner(
				schema.item,
				false,
				`${fieldPath}[]`,
			);
			return {
				...deriveLengthConstraints(pipe),
				elementDef,
				...(elementDef.elementFields && {
					elementFields: elementDef.elementFields,
				}),
				kind: "array",
			};
		}
		case "object":
			return {
				elementFields: buildFieldMapInner(schema, fieldPath),
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

function isSchema(value: unknown): value is ValibotSchema {
	return typeof value === "object" && value !== null;
}

function pickUnionOption(
	schemas: ValibotSchema[],
	fieldPath: string,
): ValibotSchema {
	const nonLiteral = schemas.filter((o) => getType(o) !== "literal");
	if (nonLiteral.length === 1) return nonLiteral[0] as ValibotSchema;
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

function buildFieldDefInner(
	schema: ValibotSchema,
	optional = false,
	fieldPath = "<root>",
): FieldDef {
	const type = getType(schema);
	const meta = getMeta(schema);

	let result: FieldDef;
	if (
		(OPTIONAL_WRAPPERS as readonly string[]).includes(type) ||
		type === "nullable"
	) {
		const forcesOptional = (OPTIONAL_WRAPPERS as readonly string[]).includes(
			type,
		);
		if (!schema.wrapped) {
			throw createFormError(
				`Optional wrapper has no wrapped schema (field "${fieldPath}")`,
				[
					`This usually indicates a malformed Valibot schema.`,
					`Ensure the field is defined as v.optional(v.someType()).`,
				],
			);
		}
		const inner = buildFieldDefInner(
			schema.wrapped,
			forcesOptional ? true : optional,
			fieldPath,
		);
		// `nullable` alone preserves outer optionality (`null` is a value, not
		// absence); optional wrappers force `optional: true`.
		const mergedOptional = forcesOptional ? true : optional || inner.optional;
		result = makeFieldDef(inner, mergedOptional, mergeMeta(inner.meta, meta));
	} else if (type === "union") {
		const options = Array.isArray(schema.options) ? schema.options : [];
		const schemas = options.filter(isSchema);
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
		const inner = buildFieldDefInner(picked, optional, fieldPath);
		const mergedOptional = optional || inner.optional;
		result = makeFieldDef(inner, mergedOptional, mergeMeta(inner.meta, meta));
	} else {
		result = makeFieldDef(
			resolveType(schema, type, getPipe(schema), fieldPath),
			optional,
			meta,
		);
	}

	return result;
}

function buildFieldMapInner(
	schema: ValibotSchema | undefined,
	parentPath: string,
): SchemaTree {
	const entries = schema?.entries;
	if (!entries || typeof entries !== "object") return {};
	const map: SchemaTree = {};
	for (const [key, fieldSchema] of Object.entries(entries)) {
		const fieldPath = parentPath ? `${parentPath}.${key}` : key;
		map[key] = buildFieldDefInner(fieldSchema, false, fieldPath);
	}
	return map;
}

export function buildFieldMap(schema: ValibotSchema | undefined): SchemaTree {
	return buildFieldMapInner(schema, "");
}
