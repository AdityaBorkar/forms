import type { DefaultValues, FieldValues } from "react-hook-form";

import type { FieldDef, SchemaTree } from "#/types";

export function deriveDefault(def: FieldDef): unknown {
	if (def.optional) return undefined;
	switch (def.kind) {
		case "string":
		case "email":
		case "url":
		case "password":
		case "textarea":
		case "combobox":
			return "";
		case "number":
		case "slider":
			return 0;
		case "boolean":
		case "checkbox":
		case "switch":
			return false;
		case "enum":
			return def.entries ? Object.values(def.entries)[0] : undefined;
		case "array":
			return [];
		case "object": {
			if (!def.elementFields) return undefined;
			const obj: Record<string, unknown> = {};
			for (const [key, nested] of Object.entries(def.elementFields)) {
				obj[key] = deriveDefault(nested);
			}
			return obj;
		}
		default:
			return undefined;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
	base: Record<string, unknown>,
	overrides?: Record<string, unknown>,
): Record<string, unknown> {
	if (!overrides) return base;
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(overrides)) {
		const prev = out[key];
		out[key] =
			isPlainObject(prev) && isPlainObject(value)
				? deepMerge(prev, value)
				: value;
	}
	return out;
}

export function buildDefaults(
	fieldMap: SchemaTree,
	overrides?: Record<string, unknown>,
): DefaultValues<FieldValues> {
	const defaults: Record<string, unknown> = {};
	for (const [key, def] of Object.entries(fieldMap)) {
		defaults[key] = deriveDefault(def);
	}
	return deepMerge(defaults, overrides) as DefaultValues<FieldValues>;
}

/**
 * Merge row overrides onto a derived default. Plain-object pairs deep-merge
 * (consistent with `buildDefaults`); anything else prefers `overrides` when
 * provided, else the derived `base`. Used by `SmartFieldArray.appendDefault`.
 */
export function mergeDefaults(
	base: unknown,
	overrides?: Record<string, unknown>,
): unknown {
	if (overrides === undefined) return base;
	if (isPlainObject(base) && isPlainObject(overrides)) {
		return deepMerge(base, overrides);
	}
	return overrides;
}
