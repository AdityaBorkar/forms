import type { FieldCheck, FieldDef, FieldMap, FieldMeta } from "@/core/types";

type ZodCheckDef = {
  check?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  value?: unknown;
  inclusive?: boolean;
};

type ZodCheck = {
  _zod?: { def?: ZodCheckDef };
};

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

type ZodSchema = {
  _zod?: { def?: ZodDef };
  meta?: () => unknown;
};

function getType(schema: ZodSchema): string {
  return schema._zod?.def?.type ?? "";
}

function getMeta(schema: ZodSchema): FieldMeta | undefined {
  if (typeof schema.meta === "function") {
    const result = schema.meta();
    if (result && typeof result === "object") {
      return result as FieldMeta;
    }
  }
  return undefined;
}

type Resolved = {
  kind: string;
  checks?: FieldCheck[];
  entries?: Record<string, string>;
  fields?: FieldMap;
  min?: number;
  max?: number;
};

function deriveLengthConstraints(def: ZodDef | undefined): {
  checks?: FieldCheck[];
  max?: number;
  min?: number;
} {
  const checks = def?.checks ?? [];
  let min: number | undefined;
  let max: number | undefined;
  const fieldChecks: FieldCheck[] = [];
  for (const check of checks) {
    const cd = check._zod?.def;
    if (!cd) continue;
    if (cd.check === "min_length" && cd.minimum != null) {
      min = cd.minimum;
      fieldChecks.push({ type: "min", value: cd.minimum });
    } else if (cd.check === "max_length" && cd.maximum != null) {
      max = cd.maximum;
      fieldChecks.push({ type: "max", value: cd.maximum });
    } else if (cd.format) {
      fieldChecks.push({ type: cd.format });
    }
  }
  return {
    checks: fieldChecks.length ? fieldChecks : undefined,
    max,
    min,
  };
}

function deriveNumberConstraints(def: ZodDef | undefined): {
  checks?: FieldCheck[];
  max?: number;
  min?: number;
} {
  const checks = def?.checks ?? [];
  let min: number | undefined;
  let max: number | undefined;
  const fieldChecks: FieldCheck[] = [];
  for (const check of checks) {
    const cd = check._zod?.def;
    if (!cd) continue;
    const name = cd.check;
    if (name === "greater_than") {
      if (cd.inclusive && typeof cd.value === "number") {
        min = cd.value;
      } else if (typeof cd.value === "number") {
        fieldChecks.push({ type: "gt", value: cd.value });
      }
    } else if (name === "greater_than_equal" && typeof cd.value === "number") {
      min = cd.value;
    } else if (name === "less_than") {
      if (cd.inclusive && typeof cd.value === "number") {
        max = cd.value;
      } else if (typeof cd.value === "number") {
        fieldChecks.push({ type: "lt", value: cd.value });
      }
    } else if (name === "less_than_equal" && typeof cd.value === "number") {
      max = cd.value;
    } else if (cd.format) {
      fieldChecks.push({ type: cd.format });
    }
  }
  return {
    checks: fieldChecks.length ? fieldChecks : undefined,
    max,
    min,
  };
}

function resolveStringKind(def: ZodDef | undefined): string {
  if (def?.format === "email") return "email";
  if (def?.format === "url") return "url";
  for (const check of def?.checks ?? []) {
    const format = check._zod?.def?.format;
    if (format === "email") return "email";
    if (format === "url") return "url";
  }
  return "string";
}

function resolveType(
  schema: ZodSchema,
  type: string,
  def: ZodDef | undefined,
): Resolved {
  switch (type) {
    case "string": {
      const constraints = deriveLengthConstraints(def);
      return { ...constraints, kind: resolveStringKind(def) };
    }
    case "number": {
      return { ...deriveNumberConstraints(def), kind: "number" };
    }
    case "boolean":
      return { kind: "boolean" };
    case "enum":
      return {
        kind: "enum",
        ...(def?.entries ? { entries: def.entries } : {}),
      };
    case "array": {
      const constraints = deriveLengthConstraints(def);
      const element = def?.element;
      const fields = element ? buildFieldMap(element) : undefined;
      return { ...constraints, ...(fields ? { fields } : {}), kind: "array" };
    }
    case "object": {
      const fields = buildFieldMap(schema);
      return { fields, kind: "object" };
    }
    case "date":
      return { kind: "date" };
    case "record":
      return { kind: "unknown" };
    default:
      return { kind: "unknown" };
  }
}

function buildFieldDef(schema: ZodSchema, optional = false): FieldDef {
  const def = schema._zod?.def;
  const type = def?.type ?? "";
  const meta = getMeta(schema);

  if (type === "optional") {
    const inner = def?.innerType;
    if (!inner) {
      return { kind: "unknown", optional: true, ...(meta ? { meta } : {}) };
    }
    const result = buildFieldDef(inner, true);
    if (meta) result.meta = meta;
    return result;
  }

  if (type === "union") {
    const options = def?.options ?? [];
    const picked =
      options.find((option) => getType(option) !== "literal") ?? options[0];
    if (!picked) {
      return { kind: "unknown", optional, ...(meta ? { meta } : {}) };
    }
    const result = buildFieldDef(picked, optional);
    if (meta) result.meta = meta;
    return result;
  }

  const resolved = resolveType(schema, type, def);
  const fieldDef: FieldDef = {
    kind: resolved.kind,
    optional,
    ...(meta ? { meta } : {}),
  };
  if (resolved.checks) fieldDef.checks = resolved.checks;
  if (resolved.entries) fieldDef.entries = resolved.entries;
  if (resolved.fields) fieldDef.fields = resolved.fields;
  if (resolved.min != null) fieldDef.min = resolved.min;
  if (resolved.max != null) fieldDef.max = resolved.max;

  if (meta?.component && typeof meta.component === "string") {
    fieldDef.kind = meta.component;
  }
  fieldDef.required = !optional && fieldDef.min != null;

  return fieldDef;
}

export function buildFieldMap(schema: unknown): FieldMap {
  const shape = (schema as ZodSchema)?._zod?.def?.shape;
  if (!shape) return {};
  const map: FieldMap = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    map[key] = buildFieldDef(fieldSchema as ZodSchema);
  }
  return map;
}
