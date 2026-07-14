import type { FieldDef, SchemaTree } from "@/types";

function isNumeric(segment: string): boolean {
  return segment.length > 0 && /^\d+$/.test(segment);
}

export function resolveFieldDef(fieldMap: SchemaTree, name: string): FieldDef {
  const segments = name.split(".");
  let def: FieldDef | undefined = fieldMap[segments[0] ?? ""];
  if (!def) {
    throw new Error(`No field definition found for "${name}"`);
  }
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    if (isNumeric(segment)) continue;
    const next: FieldDef | undefined = def.elementFields?.[segment];
    if (!next) {
      throw new Error(`No field definition found for "${name}"`);
    }
    def = next;
  }
  if (def.kind === "unknown") {
    throw new Error(`Unsupported field type for "${name}"`);
  }
  return def;
}
