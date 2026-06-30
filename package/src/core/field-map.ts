import type { FieldDef, FieldMap } from "@/types";

function isNumeric(segment: string): boolean {
  return segment.length > 0 && /^\d+$/.test(segment);
}

export function resolveFieldDef(
  fieldMap: FieldMap,
  name: string,
): FieldDef | undefined {
  const segments = name.split(".");
  let def: FieldDef | undefined = fieldMap[segments[0] ?? ""];
  if (!def) return undefined;
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    if (isNumeric(segment)) continue;
    const next: FieldDef | undefined = def.fields?.[segment];
    if (!next) return undefined;
    def = next;
  }
  return def;
}
