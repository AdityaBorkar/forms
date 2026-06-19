export type FieldMeta = {
  label?: string;
  placeholder?: string;
  description?: string;
  component?: "textarea" | "password" | "combobox" | "checkbox";
};

export type FieldDef =
  | { kind: "string"; meta?: FieldMeta; checks: string[] }
  | { kind: "number"; meta?: FieldMeta }
  | { kind: "boolean"; meta?: FieldMeta }
  | { kind: "enum"; meta?: FieldMeta; entries: Record<string, string> }
  | { kind: "array"; meta?: FieldMeta; element?: FieldMap }
  | { kind: "optional"; meta?: FieldMeta; inner: FieldDef }
  | { kind: "unknown"; meta?: FieldMeta };

export type FieldMap = Record<string, FieldDef>;

type ZodSchemaShape = {
  _zod?: {
    def?: {
      type?: string;
      innerType?: ZodSchemaShape;
      element?: ZodSchemaShape;
      entries?: Record<string, string>;
      checks?: {
        format?: string;
        _zod?: { def?: { type?: string } };
        type?: string;
      }[];
    };
  };
  meta?: () => unknown;
  shape?: Record<string, ZodSchemaShape>;
};

function getKind(schema: ZodSchemaShape): string {
  return schema._zod?.def?.type ?? "";
}

function getMeta(schema: ZodSchemaShape): FieldMeta | undefined {
  if (typeof schema.meta === "function") {
    const result = schema.meta();
    if (result && typeof result === "object") return result as FieldMeta;
  }
  return undefined;
}

function getChecks(schema: ZodSchemaShape): string[] {
  const def = schema._zod?.def;
  if (!def?.checks) return [];
  return def.checks
    .map((c) => c.format ?? c._zod?.def?.type ?? c.type)
    .filter(Boolean) as string[];
}

export function buildFieldDef(schema: ZodSchemaShape): FieldDef {
  const type = getKind(schema);
  const meta = getMeta(schema);

  if (type === "optional") {
    const innerSchema = schema._zod?.def?.innerType;
    const inner = innerSchema
      ? buildFieldDef(innerSchema)
      : { kind: "unknown" as const };
    return { inner, kind: "optional", meta: meta ?? inner.meta };
  }

  if (type === "array") {
    const elementSchema = schema._zod?.def?.element;
    return {
      element: elementSchema ? buildFieldMap(elementSchema) : undefined,
      kind: "array",
      meta,
    };
  }

  if (type === "string")
    return { checks: getChecks(schema), kind: "string", meta };
  if (type === "number") return { kind: "number", meta };
  if (type === "boolean") return { kind: "boolean", meta };
  if (type === "enum") {
    return { entries: schema._zod?.def?.entries ?? {}, kind: "enum", meta };
  }

  return { kind: "unknown", meta };
}

export function buildFieldMap(schema: {
  shape?: Record<string, any>;
}): FieldMap {
  if (!schema?.shape) return {};
  const map: FieldMap = {};
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    map[key] = buildFieldDef(fieldSchema as ZodSchemaShape);
  }
  return map;
}

export function deriveDefault(def: FieldDef): unknown {
  if (def.kind === "optional") return undefined;
  if (def.kind === "string") return "";
  if (def.kind === "number") return 0;
  if (def.kind === "boolean") return false;
  if (def.kind === "enum" && def.entries) {
    return Object.values(def.entries)[0];
  }
  if (def.kind === "array") return [];
  return undefined;
}

export function buildDefaults(
  schema: { shape?: Record<string, any> },
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const fieldMap = buildFieldMap(schema);
  const defaults: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(fieldMap)) {
    defaults[key] = deriveDefault(def);
  }
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      defaults[key] = value;
    }
  }
  return defaults;
}

export function unwrapOptional(def: FieldDef): FieldDef {
  if (def.kind === "optional") return def.inner;
  return def;
}
