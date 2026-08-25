import { createFormError } from "@/errors";
import type { FieldDef, SchemaTree } from "@/types";

function isNumeric(segment: string): boolean {
	return segment.length > 0 && /^\d+$/.test(segment);
}

export function resolveFieldDef(fieldMap: SchemaTree, name: string): FieldDef {
	const segments = name.split(".");
	const rootKey = segments[0] ?? "";
	let def: FieldDef | undefined = fieldMap[rootKey];
	if (!def) {
		const available = Object.keys(fieldMap);
		throw createFormError(`No field definition found for "${name}"`, [
			`Root field "${rootKey}" does not exist in the schema.`,
			available.length
				? `Available fields: ${available.join(", ")}`
				: "The field map is empty — check that your schema is a z.object() with at least one key.",
			"Check that the name prop matches a key in your schema.",
		]);
	}
	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i];
		if (!segment) continue;
		if (isNumeric(segment)) continue;
		const next: FieldDef | undefined = def.elementFields?.[segment];
		if (!next) {
			const traversed = segments.slice(0, i).join(".");
			const available = def.elementFields ? Object.keys(def.elementFields) : [];
			throw createFormError(`No field definition found for "${name}"`, [
				`Could not resolve segment "${segment}" at path "${traversed}".`,
				available.length
					? `Available nested fields at "${traversed}": ${available.join(", ")}`
					: `"${traversed}" has no nested fields — it may not be an array or object type.`,
				"Ensure the nested path matches your schema structure.",
			]);
		}
		def = next;
	}
	if (def.kind === "unknown") {
		throw createFormError(`Unsupported field type for "${name}"`, [
			`Field kind is "unknown", which has no corresponding component.`,
			"Check the schema definition for this field — the type may not be supported by the adapter.",
		]);
	}
	return def;
}
