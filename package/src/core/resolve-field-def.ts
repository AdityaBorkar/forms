import { createFormError } from "#/core/errors.ts";
import type { FieldDef, SchemaTree } from "#/types";

function isNumeric(segment: string): boolean {
	return /^\d+$/.test(segment);
}

function failRoot(name: string, rootKey: string, fieldMap: SchemaTree): never {
	const available = Object.keys(fieldMap);
	throw createFormError(`No field definition found for "${name}"`, [
		`Root field "${rootKey}" does not exist in the schema.`,
		available.length
			? `Available fields: ${available.join(", ")}`
			: "The field map is empty — check that your schema is an object with at least one key.",
		"Check that the name prop matches a key in your schema.",
	]);
}

function failSegment(
	name: string,
	segment: string,
	traversed: string,
	def: FieldDef,
): never {
	const fields = def.elementFields ?? def.elementDef?.elementFields;
	const available = fields ? Object.keys(fields) : [];
	const details = [
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
	];
	throw createFormError(`No field definition found for "${name}"`, details);
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
	let def: FieldDef | undefined = fieldMap[rootKey];
	if (!def) failRoot(name, rootKey, fieldMap);

	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i] as string;
		const traversed = segments.slice(0, i).join(".");

		if (isNumeric(segment)) {
			if (def.kind === "array") {
				if (!def.elementDef) failSegment(name, segment, traversed, def);
				def = def.elementDef;
				continue;
			}
			// Non-array parents fall through: numeric keys are looked up literally.
		}

		// Arrays require an explicit index (`arr.0.city`). An index-less
		// `arr.city` is ambiguous (which row?) and no longer resolves.
		if (def.kind === "array") failSegment(name, segment, traversed, def);

		const next: FieldDef | undefined = def.elementFields?.[segment];
		if (!next) failSegment(name, segment, traversed, def);
		def = next;
	}
	return def;
}
