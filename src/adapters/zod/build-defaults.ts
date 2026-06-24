import type { FieldDef, FieldMap } from "@/types";

import { buildFieldMap } from "./build-field-map";

export function deriveDefault(def: FieldDef): unknown {
  if (def.optional) return undefined;
  switch (def.kind) {
    case "string":
    case "email":
    case "url":
    case "password":
    case "textarea":
    case "combobox":
      return "";
    case "number":
      return 0;
    case "boolean":
    case "checkbox":
      return false;
    case "enum":
      return def.entries ? Object.values(def.entries)[0] : undefined;
    case "array":
      return [];
    case "object": {
      if (!def.fields) return undefined;
      const obj: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(def.fields)) {
        obj[key] = deriveDefault(nested);
      }
      return obj;
    }
    default:
      return undefined;
  }
}

export function buildDefaults(
  schema: unknown,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const fieldMap: FieldMap = buildFieldMap(schema);
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
