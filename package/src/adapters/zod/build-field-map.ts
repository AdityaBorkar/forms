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
  options?: ZodSchema[];
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

function getType(schema: ZodSchema): string {
  return schema._zod?.def?.type ?? "";
}

function getMeta(schema: ZodSchema): FieldMeta | undefined {
  const result = typeof schema.meta === "function" ? schema.meta() : undefined;
  return result && typeof result === "object"
    ? (result as FieldMeta)
    : undefined;
}

type ConstraintAcc = { min?: number; max?: number; checks: FieldCheck[] };

function collectConstraints(
  def: ZodDef | undefined,
  process: (cd: ZodCheckDef, acc: ConstraintAcc) => void,
): { checks?: FieldCheck[]; max?: number; min?: number } {
  const acc: ConstraintAcc = { checks: [] };
  for (const check of def?.checks ?? []) {
    const cd = check._zod?.def;
    if (cd) process(cd, acc);
  }
  return {
    checks: acc.checks.length ? acc.checks : undefined,
    max: acc.max,
    min: acc.min,
  };
}

const deriveLengthConstraints = (def: ZodDef | undefined) =>
  collectConstraints(def, (cd, acc) => {
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

const deriveNumberConstraints = (def: ZodDef | undefined) =>
  collectConstraints(def, (cd, acc) => {
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

function resolveStringKind(def: ZodDef | undefined): string {
  const formats = [
    def?.format,
    ...(def?.checks ?? []).map((c) => c._zod?.def?.format),
  ];
  if (formats.includes("email")) return "email";
  if (formats.includes("url")) return "url";
  return "string";
}

type Resolved = Omit<FieldDef, "optional" | "meta" | "required">;

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
      const elementFields = element
        ? buildFieldMap(element, fieldPath)
        : undefined;
      return {
        ...deriveLengthConstraints(def),
        ...(elementFields && { elementFields }),
        kind: "array",
      };
    }
    case "object":
      return {
        elementFields: buildFieldMap(schema, fieldPath),
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

function buildFieldDef(
  schema: ZodSchema,
  optional = false,
  fieldPath = "<root>",
): FieldDef {
  const def = schema._zod?.def;
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
    result = buildFieldDef(def.innerType, true, fieldPath);
  } else if (type === "union") {
    const options = def?.options ?? [];
    const picked = options.find((o) => getType(o) !== "literal") ?? options[0];
    if (!picked) {
      throw createFormError(
        `Union type has no options (field "${fieldPath}")`,
        [
          `The union type was defined with an empty options array.`,
          `Ensure z.union() has at least one option, e.g. z.union([z.string(), z.number()]).`,
        ],
      );
    }
    result = buildFieldDef(picked, optional, fieldPath);
  } else {
    result = {
      ...resolveType(schema, type, def, fieldPath),
      optional,
      required: !optional,
    };
  }

  if (meta) result.meta = meta;
  return result;
}

export function buildFieldMap(schema: unknown, parentPath = ""): SchemaTree {
  const shape = (schema as ZodSchema)?._zod?.def?.shape;
  if (!shape) return {};
  const map: SchemaTree = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fieldPath = parentPath ? `${parentPath}.${key}` : key;
    map[key] = buildFieldDef(fieldSchema as ZodSchema, false, fieldPath);
  }
  return map;
}
