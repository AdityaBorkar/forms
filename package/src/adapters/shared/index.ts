import { createFormError } from "#/core/errors.ts";
import type { FieldCheck, FieldDef, FieldMeta, SchemaTree } from "#/types";

export type ConstraintAcc = {
	min?: number;
	max?: number;
	checks: FieldCheck[];
};

export type Constraints = {
	checks?: FieldCheck[];
	min?: number;
	max?: number;
};

export function isFieldMeta(value: unknown): value is FieldMeta {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function makeFieldDef<T extends { kind: string }>(
	base: T,
	optional: boolean,
	meta?: FieldMeta,
): FieldDef {
	const { checks, ...rest } = base as T & { checks?: FieldCheck[] };
	const out: Record<string, unknown> = { ...rest, optional };
	if (checks && checks.length > 0) out.checks = checks;
	if (meta !== undefined) out.meta = meta;
	return out as FieldDef;
}

function mergeMeta(
	inner?: FieldMeta,
	outer?: FieldMeta,
): FieldMeta | undefined {
	if (!inner && !outer) return undefined;
	const merged = { ...(inner ?? {}), ...(outer ?? {}) };
	return Object.keys(merged).length > 0 ? merged : undefined;
}

export type AdapterPrimitives<TSchema> = {
	adapterName: string;
	supportedTypes: readonly string[];
	getType(schema: TSchema): string;
	getMeta(schema: TSchema): FieldMeta | undefined;
	getLengthConstraints(schema: TSchema): Constraints;
	getNumberConstraints(schema: TSchema): Constraints;
	getStringKind(schema: TSchema): string;
	getEnumEntries(schema: TSchema): Record<string, string> | undefined;
	getArrayItem(schema: TSchema): TSchema | undefined;
	getObjectEntries(schema: TSchema): Record<string, TSchema> | undefined;
	/**
	 * Return the wrapped schema for optional/nullable wrappers, or `null` when
	 * `schema` is not a wrapper. Must throw an adapter-specific error when the
	 * wrapper is malformed (missing inner schema).
	 */
	unwrapOptional(
		schema: TSchema,
		fieldPath: string,
	): {
		inner: TSchema;
		forcesOptional: boolean;
	} | null;
	/**
	 * Return union options when `schema` is a union, or `null` otherwise.
	 * Must throw an adapter-specific error for a malformed empty union.
	 */
	getUnionOptions(schema: TSchema, fieldPath: string): TSchema[] | null;
	isLiteral(schema: TSchema): boolean;
};

type Resolved = {
	kind: string;
	checks?: FieldCheck[];
	min?: number;
	max?: number;
	entries?: Record<string, string>;
	elementFields?: SchemaTree;
	elementDef?: FieldDef;
};

export function createFieldMapEngine<TSchema>(
	primitives: AdapterPrimitives<TSchema>,
) {
	const {
		adapterName,
		supportedTypes,
		getType,
		getMeta,
		getLengthConstraints,
		getNumberConstraints,
		getStringKind,
		getEnumEntries,
		getArrayItem,
		getObjectEntries,
		unwrapOptional,
		getUnionOptions,
		isLiteral,
	} = primitives;

	const prefix =
		adapterName === "Zod" ? "z." : adapterName === "Valibot" ? "v." : "";

	function unsupportedType(type: string, fieldPath: string): never {
		if (type === "record") {
			throw createFormError(
				`Unsupported ${adapterName} type: record (field "${fieldPath}")`,
				[
					`The "record" type is not supported by the form builder.`,
					`Supported ${adapterName} types: ${supportedTypes.join(", ")}.`,
					`Consider using ${prefix}array() or ${prefix}object() instead, or remove this field from the schema.`,
				],
			);
		}
		throw createFormError(
			`Unsupported ${adapterName} type: ${type || "(unknown)"} (field "${fieldPath}")`,
			[`Supported ${adapterName} types: ${supportedTypes.join(", ")}.`],
		);
	}

	function pickUnionOption(options: TSchema[], fieldPath: string): TSchema {
		const nonLiteral = options.filter((o) => !isLiteral(o));
		if (nonLiteral.length === 1) return nonLiteral[0] as TSchema;
		if (nonLiteral.length === 0) {
			throw createFormError(`Unsupported union in field "${fieldPath}"`, [
				`The union has no non-literal option to render as a field.`,
				adapterName === "Zod"
					? `Use a single field type with an optional literal (e.g. z.string().optional().or(z.literal(""))), or pick one branch.`
					: `Use a single field type with an optional literal, or pick one branch.`,
			]);
		}
		throw createFormError(`Ambiguous union in field "${fieldPath}"`, [
			`The union has ${nonLiteral.length} non-literal options; the form builder cannot guess which one to render.`,
			`Narrow the schema to a single branch for this field.`,
		]);
	}

	function resolveType(
		schema: TSchema,
		type: string,
		fieldPath: string,
	): Resolved {
		switch (type) {
			case "string":
				return { ...getLengthConstraints(schema), kind: getStringKind(schema) };
			case "number":
				return { ...getNumberConstraints(schema), kind: "number" };
			case "boolean":
				return { kind: "boolean" };
			case "picklist":
			case "enum": {
				const entries = getEnumEntries(schema);
				return { kind: "enum", ...(entries && { entries }) };
			}
			case "array": {
				const item = getArrayItem(schema);
				if (!item) return { kind: "array" };
				const elementDef = createFieldDefInner(item, false, `${fieldPath}[]`);
				return {
					...getLengthConstraints(schema),
					elementDef,
					kind: "array",
				};
			}
			case "object":
				return {
					elementFields: createFieldMapInner(schema, fieldPath),
					kind: "object",
				};
			case "date":
				return { kind: "date" };
			default:
				return unsupportedType(type, fieldPath);
		}
	}

	function createFieldDefInner(
		schema: TSchema,
		optional = false,
		fieldPath = "<root>",
	): FieldDef {
		const meta = getMeta(schema);

		const unwrapped = unwrapOptional(schema, fieldPath);
		if (unwrapped) {
			const inner = createFieldDefInner(
				unwrapped.inner,
				unwrapped.forcesOptional || optional,
				fieldPath,
			);
			const mergedOptional =
				unwrapped.forcesOptional || optional || inner.optional;
			return makeFieldDef(inner, mergedOptional, mergeMeta(inner.meta, meta));
		}

		const unionOptions = getUnionOptions(schema, fieldPath);
		if (unionOptions) {
			const picked = pickUnionOption(unionOptions, fieldPath);
			const inner = createFieldDefInner(picked, optional, fieldPath);
			const mergedOptional = optional || inner.optional;
			return makeFieldDef(inner, mergedOptional, mergeMeta(inner.meta, meta));
		}

		const type = getType(schema);
		return makeFieldDef(resolveType(schema, type, fieldPath), optional, meta);
	}

	function createFieldMapInner(
		schema: TSchema | undefined,
		parentPath: string,
	): SchemaTree {
		if (!schema) return {};
		const entries = getObjectEntries(schema);
		if (!entries) return {};
		const map: SchemaTree = {};
		for (const [key, fieldSchema] of Object.entries(entries)) {
			const fieldPath = parentPath ? `${parentPath}.${key}` : key;
			map[key] = createFieldDefInner(fieldSchema, false, fieldPath);
		}
		return map;
	}

	function createFieldMap(schema: TSchema | undefined): SchemaTree {
		return createFieldMapInner(schema, "");
	}

	return { createFieldDefInner, createFieldMap, createFieldMapInner };
}
