import { createFormError } from "#/core/errors.ts";
import type { FieldDef, SchemaTree } from "#/types";

function isNumeric(segment: string): boolean {
	return /^\d+$/.test(segment);
}

function nestedFieldNames(def: FieldDef): string[] {
	const direct =
		"elementFields" in def ? (def.elementFields ?? undefined) : undefined;
	if (direct) return Object.keys(direct);
	if (def.kind === "array") {
		const element = def.elementDef;
		const nested =
			element && "elementFields" in element
				? (element.elementFields ?? undefined)
				: undefined;
		if (nested) return Object.keys(nested);
	}
	return [];
}

function failSegment(
	name: string,
	segment: string,
	traversed: string,
	def: FieldDef,
): never {
	const available = nestedFieldNames(def);
	throw createFormError(`No field definition found for "${name}"`, [
		`Could not resolve segment "${segment}" at path "${traversed}".`,
		...(def.kind === "array"
			? [
					`Arrays require an explicit index — use "${traversed}.0.${segment}" instead of "${traversed}.${segment}".`,
				]
			: []),
		available.length
			? `Available nested fields at "${traversed}": ${available.join(", ")}`
			: `"${traversed}" has no nested fields — it may not be an array or object type.`,
		"Ensure the nested path matches your schema structure.",
	]);
}

export function resolveFieldDef(fieldMap: SchemaTree, name: string): FieldDef {
	if (!name) {
		throw createFormError(`No field definition found for "${name}"`, [
			`Field name must be a non-empty dotted path.`,
			`Check that the name prop matches a key in your schema.`,
		]);
	}
	const segments = name.split(".");
	if (segments.includes("")) {
		throw createFormError(`No field definition found for "${name}"`, [
			`Path contains an empty segment — check for leading, trailing, or doubled dots.`,
			`Ensure the nested path matches your schema structure.`,
		]);
	}
	const rootKey = segments[0] as string;
	const rootDef: FieldDef | undefined = fieldMap[rootKey];
	if (!rootDef) {
		const available = Object.keys(fieldMap);
		throw createFormError(`No field definition found for "${name}"`, [
			`Root field "${rootKey}" does not exist in the schema.`,
			available.length
				? `Available fields: ${available.join(", ")}`
				: "The field map is empty — check that your schema is an object with at least one key.",
			"Check that the name prop matches a key in your schema.",
		]);
	}

	let def: FieldDef = rootDef;
	let traversed = rootKey;
	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i] as string;

		if (def.kind === "array") {
			if (!isNumeric(segment)) failSegment(name, segment, traversed, def);
			const element = def.elementDef;
			if (!element) failSegment(name, segment, traversed, def);
			def = element;
			traversed += `.${segment}`;
			continue;
		}

		// Only objects carry named children; every other kind (including custom
		// leaves) fails here. Numeric keys on objects still look up literally.
		if (def.kind !== "object") failSegment(name, segment, traversed, def);
		const next: FieldDef | undefined = def.elementFields?.[segment];
		if (!next) failSegment(name, segment, traversed, def);
		def = next;
		traversed += `.${segment}`;
	}
	return def;
}
