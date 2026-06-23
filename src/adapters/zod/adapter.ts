import type { ZodType } from "zod";

import type { SchemaAdapter } from "@/core/types";

import { buildDefaults } from "./build-defaults";
import { buildFieldMap } from "./build-field-map";
import { createResolver } from "./create-resolver";

export const zodAdapter: SchemaAdapter<ZodType> = {
  buildDefaults,
  buildFieldMap,
  createResolver,
};
