import type { ZodType } from "zod";

import type { FieldMap, SchemaAdapter } from "@/types";

import { buildDefaults } from "./build-defaults";
import { buildFieldMap } from "./build-field-map";
import { createResolver } from "./create-resolver";

export const zodAdapter: SchemaAdapter<ZodType> = {
  buildDefaults(
    schema: ZodType,
    fieldMap: FieldMap,
    overrides?: Record<string, unknown>,
  ) {
    return buildDefaults(schema, fieldMap, overrides);
  },
  buildFieldMap,
  createResolver,
};
