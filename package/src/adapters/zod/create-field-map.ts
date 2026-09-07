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

import type { ConstraintAcc, Constraints } from "#/adapters/shared";
import { createFieldMapEngine, isFieldMeta } from "#/adapters/shared";
import { createFormError } from "#/core/errors.ts";
import type { FieldMeta, SchemaTree } from "#/types";

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

function collectConstraints(
	def: $ZodTypeDef | undefined,
	process: (cd: $ZodCheckDef, acc: ConstraintAcc) => void,
): Constraints {
	const acc: ConstraintAcc = { checks: [] };
	for (const check of def?.checks ?? []) {
		const cd = check._zod.def;
		if (cd) process(cd, acc);
	}
	return acc;
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

const engine = createFieldMapEngine<ZodType>({
	adapterName: "Zod",
	getArrayItem: (schema) => {
		const def = getZodDef(schema);
		return def && "element" in def
			? ((def as $ZodArrayDef).element as unknown as ZodType)
			: undefined;
	},
	getEnumEntries: (schema) => {
		const def = getZodDef(schema);
		return def && "entries" in def
			? ((def as $ZodEnumDef).entries as unknown as Record<string, string>)
			: undefined;
	},
	getLengthConstraints: (schema) => deriveLengthConstraints(getZodDef(schema)),
	getMeta,
	getNumberConstraints: (schema) => deriveNumberConstraints(getZodDef(schema)),
	getObjectEntries: (schema) => {
		const def = getZodDef(schema);
		return def && "shape" in def
			? ((def as $ZodObjectDef).shape as unknown as Record<string, ZodType>)
			: undefined;
	},
	getStringKind: (schema) => resolveStringKind(getZodDef(schema)),
	getType,
	getUnionOptions: (schema, fieldPath) => {
		if (getType(schema) !== "union") return null;
		const def = getZodDef(schema);
		const options =
			def && "options" in def
				? ((def as $ZodUnionDef).options as unknown as readonly ZodType[])
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
		return [...options];
	},
	isLiteral: (schema) => getType(schema) === "literal",
	supportedTypes: SUPPORTED_TYPES,
	unwrapOptional: (schema, fieldPath) => {
		if (getType(schema) !== "optional") return null;
		const def = getZodDef(schema);
		const innerType =
			def && "innerType" in def
				? ((def as $ZodOptionalDef).innerType as unknown as ZodType)
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
		return { forcesOptional: true, inner: innerType };
	},
});

export function createFieldMap(schema: ZodType | undefined): SchemaTree {
	return engine.createFieldMap(schema);
}
