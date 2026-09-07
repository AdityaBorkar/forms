import type { FieldCheck, FieldDef, FieldMeta } from "#/types";

export type ConstraintAcc = {
	min?: number;
	max?: number;
	checks: FieldCheck[];
};

export function isFieldMeta(value: unknown): value is FieldMeta {
	return typeof value === "object" && value !== null;
}

export function makeFieldDef(
	base: Omit<FieldDef, "optional" | "meta">,
	optional: boolean,
	meta?: FieldMeta,
): FieldDef {
	return { ...base, meta, optional };
}
