import type { ConstraintAcc } from "@/adapters/shared";
import {
	createConstraintAcc,
	finalizeConstraints,
	makeFieldDef,
	mergeMeta,
} from "@/adapters/shared";
import { createFormError } from "@/errors";
import type { FieldCheck, FieldDef, FieldMeta, SchemaTree } from "@/types";

type ZodCheckDef = {
	check?: string;
	format?: string;
	minimum?: number;
	maximum?: number;
	value?: unknown;
	inclusive?: boolean;
};

type ZodCheck = { _zod?: { def?: ZodCheckDef } };

type ZodDef = {
	type?: string;
	format?: string;
	checks?: ZodCheck[];
	innerType?: ZodSchema;
	element?: ZodSchema;
	entries?: Record<string, string>;
	shape?: Record<string, ZodSchema>;
	options?: readonly ZodSchema[];
	keyType?: ZodSchema;
	valueType?: ZodSchema;
	values?: unknown[];
};

type ZodSchema = { _zod?: { def?: ZodDef }; meta?: () => unknown };

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
function getZodDef(schema: ZodSchema): ZodDef | undefined {
	return schema._zod?.def;
}

function getType(schema: ZodSchema): string {
	return getZodDef(schema)?.type ?? "";
}

function isFieldMeta(value: unknown): value is FieldMeta {
	return typeof value === "object" && value !== null;
}

function getMeta(schema: ZodSchema): FieldMeta | undefined {
	const result = typeof schema.meta === "function" ? schema.meta() : undefined;
	return isFieldMeta(result) ? result : undefined;
}

function collectConstraints(
	def: ZodDef | undefined,
	process: (cd: ZodCheckDef, acc: ConstraintAcc) => void,
): { checks?: FieldCheck[]; max?: number; min?: number } {
	const acc = createConstraintAcc();
	for (const check of def?.checks ?? []) {
		const cd = check._zod?.def;
		if (cd) process(cd, acc);
	}
	return finalizeConstraints(acc);
}

function deriveLengthConstraints(def: ZodDef | undefined): {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
} {
	return collectConstraints(def, (cd, acc) => {
		if (cd.check === "min_length" && cd.minimum != null) {
			acc.min = cd.minimum;
			acc.checks.push({ type: "min", value: cd.minimum });
		} else if (cd.check === "max_length" && cd.maximum != null) {
			acc.max = cd.maximum;
			acc.checks.push({ type: "max", value: cd.maximum });
		} else if (cd.format) {
			acc.checks.push({ type: cd.format });
		}
	});
}

function deriveNumberConstraints(def: ZodDef | undefined): {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
} {
	return collectConstraints(def, (cd, acc) => {
		if (cd.check === "greater_than") {
			if (cd.inclusive && typeof cd.value === "number") acc.min = cd.value;
			else if (typeof cd.value === "number")
				acc.checks.push({ type: "gt", value: cd.value });
		} else if (
			cd.check === "greater_than_equal" &&
			typeof cd.value === "number"
		) {
			acc.min = cd.value;
		} else if (cd.check === "less_than") {
			if (cd.inclusive && typeof cd.value === "number") acc.max = cd.value;
			else if (typeof cd.value === "number")
				acc.checks.push({ type: "lt", value: cd.value });
		} else if (cd.check === "less_than_equal" && typeof cd.value === "number") {
			acc.max = cd.value;
		} else if (cd.format) {
			acc.checks.push({ type: cd.format });
		}
	});
}

function resolveStringKind(def: ZodDef | undefined): string {
	const formats = [
		def?.format,
		...(def?.checks ?? []).map((c) => c._zod?.def?.format),
	];
	if (formats.includes("email")) return "email";
	if (formats.includes("url")) return "url";
	return "string";
}

type Resolved = Omit<FieldDef, "optional" | "meta">;

function resolveType(
	schema: ZodSchema,
	type: string,
	def: ZodDef | undefined,
	fieldPath: string,
): Resolved {
	switch (type) {
		case "string":
			return { ...deriveLengthConstraints(def), kind: resolveStringKind(def) };
		case "number":
			return { ...deriveNumberConstraints(def), kind: "number" };
		case "boolean":
			return { kind: "boolean" };
		case "enum":
			return { kind: "enum", ...(def?.entries && { entries: def.entries }) };
		case "array": {
			const element = def?.element;
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
	options: readonly ZodSchema[],
	fieldPath: string,
): ZodSchema {
	const nonLiteral = options.filter((o) => getType(o) !== "literal");
	if (nonLiteral.length === 1) return nonLiteral[0] as ZodSchema;
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
	schema: ZodSchema,
	optional = false,
	fieldPath = "<root>",
): FieldDef {
	const def = getZodDef(schema);
	const type = def?.type ?? "";
	const meta = getMeta(schema);

	let result: FieldDef;
	if (type === "optional") {
		if (!def?.innerType) {
			throw createFormError(
				`Optional type has no inner type (field "${fieldPath}")`,
				[
					`This usually indicates a malformed Zod schema.`,
					`Ensure the field is defined as z.someType().optional().`,
				],
			);
		}
		const inner = buildFieldDefInner(def.innerType, true, fieldPath);
		result = makeFieldDef(inner, true, mergeMeta(inner.meta, meta));
	} else if (type === "union") {
		const options = def?.options ?? [];
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
	schema: ZodSchema | undefined,
	parentPath: string,
): SchemaTree {
	const shape = schema ? getZodDef(schema)?.shape : undefined;
	if (!shape) return {};
	const map: SchemaTree = {};
	for (const [key, fieldSchema] of Object.entries(shape)) {
		const fieldPath = parentPath ? `${parentPath}.${key}` : key;
		map[key] = buildFieldDefInner(fieldSchema, false, fieldPath);
	}
	return map;
}

export function buildFieldMap(schema: ZodSchema | undefined): SchemaTree {
	return buildFieldMapInner(schema, "");
}
