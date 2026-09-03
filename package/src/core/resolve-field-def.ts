import { createFormError } from "#/errors";
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
	const available = def.elementFields ? Object.keys(def.elementFields) : [];
	throw createFormError(`No field definition found for "${name}"`, [
		`Could not resolve segment "${segment}" at path "${traversed}".`,
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
	for (const segment of segments) {
		if (!segment) {
			throw createFormError(`No field definition found for "${name}"`, [
				`Path contains an empty segment — check for leading, trailing, or doubled dots.`,
				`Ensure the nested path matches your schema structure.`,
			]);
		}
	}
	const rootKey = segments[0] as string;
	let def: FieldDef | undefined = fieldMap[rootKey];
	if (!def) failRoot(name, rootKey, fieldMap);

	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i] as string;
		const traversed = segments.slice(0, i).join(".");

		if (isNumeric(segment)) {
			if (def.kind === "array") {
				if (def.elementDef) {
					def = def.elementDef;
					continue;
				}
				// Legacy array without element detail: index addresses the array itself.
				continue;
			}
			// Non-array parents fall through: numeric keys are looked up literally.
		}

		// Step through an array element object without requiring an explicit index:
		// `locations.city` resolves via the array's element fields when present.
		// Explicit indexed paths (`locations.0.city`) are preferred.
		let next: FieldDef | undefined = def.elementFields?.[segment];
		if (!next && def.kind === "array" && def.elementDef) {
			const elementDef: FieldDef = def.elementDef;
			if (elementDef.kind === "object") {
				next = elementDef.elementFields?.[segment];
			} else if (isNumeric(segment)) {
				next = elementDef;
			}
		}
		if (!next) failSegment(name, segment, traversed, def);
		def = next;
	}
	return def;
}
