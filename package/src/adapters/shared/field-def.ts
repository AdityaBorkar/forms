import type { FieldDef, FieldMeta } from "@/types";

/**
 * Resolve the dispatch kind. `meta.component` wins when it is a non-empty
 * string, letting schemas opt into custom UI variants (e.g. `password`,
 * `textarea`, `slider`, `switch`) without changing validation.
 */
export function resolveKind(baseKind: string, meta?: FieldMeta): string {
	const override = meta?.component;
	if (typeof override === "string" && override.length > 0) return override;
	return baseKind;
}

/** Merge inner meta with an outer (wrapper) meta. Outer keys win. */
export function mergeMeta(
	inner?: FieldMeta,
	outer?: FieldMeta,
): FieldMeta | undefined {
	if (!inner) return outer;
	if (!outer) return inner;
	return { ...inner, ...outer };
}

export function makeFieldDef(
	base: Omit<FieldDef, "optional" | "meta">,
	optional: boolean,
	meta?: FieldMeta,
): FieldDef {
	return {
		...base,
		kind: resolveKind(base.kind, meta),
		optional,
		...(meta && { meta }),
	};
}
