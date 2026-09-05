import type { ZodType } from "zod";
import type {
	$ZodArrayDef,
	$ZodCheckDef,
	$ZodCheckGreaterThanDef,
	$ZodCheckLessThanDef,
	$ZodCheckMaxLengthDef,
	$ZodCheckMinLengthDef,
	$ZodEnumDef,
	$ZodObjectDef,
	$ZodOptionalDef,
	$ZodTypeDef,
	$ZodUnionDef,
} from "zod/v4/core";

import type { ConstraintAcc } from "#/adapters/shared";
import {
	createConstraintAcc,
	finalizeConstraints,
	isFieldMeta,
	makeFieldDef,
	mergeMeta,
} from "#/adapters/shared";
import { createFormError } from "#/errors";
import type { FieldCheck, FieldDef, FieldMeta, SchemaTree } from "#/types";

const SUPPORTED_TYPES = [
	"string",
	"number",
	"boolean",
	"enum",
	"array",
	"object",
	"date",
] as const;

/** Single choke point for Zod's private internals. */
function getZodDef(schema: ZodType): $ZodTypeDef | undefined {
	return schema._zod.def;
}

function getType(schema: ZodType): string {
	return getZodDef(schema)?.type ?? "";
}

function getMeta(schema: ZodType): FieldMeta | undefined {
	const result = typeof schema.meta === "function" ? schema.meta() : undefined;
	return isFieldMeta(result) ? result : undefined;
}

function getFormat(
	def: $ZodTypeDef | $ZodCheckDef | undefined,
): string | undefined {
	if (!def || !("format" in def)) return undefined;
	const format = (def as { format?: unknown }).format;
	return typeof format === "string" ? format : undefined;
}

type Constraints = {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
};

function collectConstraints(
	def: $ZodTypeDef | undefined,
	process: (cd: $ZodCheckDef, acc: ConstraintAcc) => void,
): Constraints {
	const acc = createConstraintAcc();
	for (const check of def?.checks ?? []) {
		const cd = check._zod.def;
		if (cd) process(cd, acc);
	}
	return finalizeConstraints(acc);
}

function deriveLengthConstraints(def: $ZodTypeDef | undefined): Constraints {
	return collectConstraints(def, (cd, acc) => {
		if (cd.check === "min_length") {
			const minimum = (cd as $ZodCheckMinLengthDef).minimum;
			if (minimum != null) {
				acc.min = minimum;
				acc.checks.push({ type: "min", value: minimum });
			}
		} else if (cd.check === "max_length") {
			const maximum = (cd as $ZodCheckMaxLengthDef).maximum;
			if (maximum != null) {
				acc.max = maximum;
				acc.checks.push({ type: "max", value: maximum });
			}
		}
	});
}

function deriveNumberConstraints(def: $ZodTypeDef | undefined): Constraints {
	return collectConstraints(def, (cd, acc) => {
		if (cd.check === "greater_than") {
			const { inclusive, value } = cd as $ZodCheckGreaterThanDef;
			if (inclusive && typeof value === "number") acc.min = value;
			else if (typeof value === "number")
				acc.checks.push({ type: "gt", value });
		} else if (cd.check === "greater_than_equal") {
			const { value } = cd as $ZodCheckGreaterThanDef;
			if (typeof value === "number") acc.min = value;
		} else if (cd.check === "less_than") {
			const { inclusive, value } = cd as $ZodCheckLessThanDef;
			if (inclusive && typeof value === "number") acc.max = value;
			else if (typeof value === "number")
				acc.checks.push({ type: "lt", value });
		} else if (cd.check === "less_than_equal") {
			const { value } = cd as $ZodCheckLessThanDef;
			if (typeof value === "number") acc.max = value;
		} else {
			const format = getFormat(cd);
			if (format) acc.checks.push({ type: format });
		}
	});
}

function resolveStringKind(def: $ZodTypeDef | undefined): string {
	const format = getFormat(def);
	if (format === "email" || format === "url") return format;
	return "string";
}

type Resolved = Omit<FieldDef, "optional" | "meta">;

function resolveType(
	schema: ZodType,
	type: string,
	def: $ZodTypeDef | undefined,
	fieldPath: string,
): Resolved {
	switch (type) {
		case "string":
			return { ...deriveLengthConstraints(def), kind: resolveStringKind(def) };
		case "number":
			return { ...deriveNumberConstraints(def), kind: "number" };
		case "boolean":
			return { kind: "boolean" };
		case "enum": {
			const entries =
				def && "entries" in def
					? ((def as $ZodEnumDef).entries as unknown as Record<string, string>)
					: undefined;
			return { kind: "enum", ...(entries && { entries }) };
		}
		case "array": {
			const element =
				def && "element" in def
					? (((def as $ZodArrayDef).element as unknown as ZodType) ?? undefined)
					: undefined;
			if (!element) return { kind: "array" };
			const elementDef = buildFieldDefInner(element, false, `${fieldPath}[]`);
			return {
				...deriveLengthConstraints(def),
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
				`Unsupported Zod type: record (field "${fieldPath}")`,
				[
					`The "record" type is not supported by the form builder.`,
					`Supported Zod types: ${SUPPORTED_TYPES.join(", ")}.`,
					`Consider using z.array() or z.object() instead, or remove this field from the schema.`,
				],
			);
		default:
			throw createFormError(
				`Unsupported Zod type: ${type || "(unknown)"} (field "${fieldPath}")`,
				[`Supported Zod types: ${SUPPORTED_TYPES.join(", ")}.`],
			);
	}
}

function pickUnionOption(
	options: readonly ZodType[],
	fieldPath: string,
): ZodType {
	const nonLiteral = options.filter((o) => getType(o) !== "literal");
	if (nonLiteral.length === 1) return nonLiteral[0] as ZodType;
	if (nonLiteral.length === 0) {
		throw createFormError(`Unsupported union in field "${fieldPath}"`, [
			`The union has no non-literal option to render as a field.`,
			`Use a single field type with an optional literal (e.g. z.string().optional().or(z.literal(""))), or pick one branch.`,
		]);
	}
	throw createFormError(`Ambiguous union in field "${fieldPath}"`, [
		`The union has ${nonLiteral.length} non-literal options; the form builder cannot guess which one to render.`,
		`Narrow the schema to a single branch for this field.`,
	]);
}

function buildFieldDefInner(
	schema: ZodType,
	optional = false,
	fieldPath = "<root>",
): FieldDef {
	const def = getZodDef(schema);
	const type = def?.type ?? "";
	const meta = getMeta(schema);

	let result: FieldDef;
	if (type === "optional") {
		const innerType =
			def && "innerType" in def
				? (((def as $ZodOptionalDef).innerType as unknown as ZodType) ??
					undefined)
				: undefined;
		if (!innerType) {
			throw createFormError(
				`Optional type has no inner type (field "${fieldPath}")`,
				[
					`This usually indicates a malformed Zod schema.`,
					`Ensure the field is defined as z.someType().optional().`,
				],
			);
		}
		const inner = buildFieldDefInner(innerType, true, fieldPath);
		result = makeFieldDef(inner, true, mergeMeta(inner.meta, meta));
	} else if (type === "union") {
		const options =
			def && "options" in def
				? (((def as $ZodUnionDef).options as unknown as readonly ZodType[]) ??
					[])
				: [];
		if (options.length === 0) {
			throw createFormError(
				`Union type has no options (field "${fieldPath}")`,
				[
					`The union type was defined with an empty options array.`,
					`Ensure z.union() has at least one option, e.g. z.union([z.string(), z.number()]).`,
				],
			);
		}
		const picked = pickUnionOption(options, fieldPath);
		const inner = buildFieldDefInner(picked, optional, fieldPath);
		// Preserve outer optionality: an optional union stays optional even if
		// the picked branch is required.
		const mergedOptional = optional || inner.optional;
		result = makeFieldDef(inner, mergedOptional, mergeMeta(inner.meta, meta));
	} else {
		result = makeFieldDef(
			resolveType(schema, type, def, fieldPath),
			optional,
			meta,
		);
	}

	return result;
}

function buildFieldMapInner(
	schema: ZodType | undefined,
	parentPath: string,
): SchemaTree {
	const def = schema ? getZodDef(schema) : undefined;
	const shape =
		def && "shape" in def
			? ((def as $ZodObjectDef).shape as unknown as Record<string, ZodType>)
			: undefined;
	if (!shape) return {};
	const map: SchemaTree = {};
	for (const [key, fieldSchema] of Object.entries(shape)) {
		const fieldPath = parentPath ? `${parentPath}.${key}` : key;
		map[key] = buildFieldDefInner(fieldSchema, false, fieldPath);
	}
	return map;
}

export function buildFieldMap(schema: ZodType | undefined): SchemaTree {
	return buildFieldMapInner(schema, "");
}
