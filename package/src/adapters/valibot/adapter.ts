import type { GenericSchema } from "valibot";

import type { SchemaAdapter } from "@/types";
import { buildDefaults } from "./build-defaults";
import { buildFieldMap } from "./build-field-map";
import { createResolver } from "./create-resolver";

export const valibotAdapter: SchemaAdapter<GenericSchema> = {
	buildDefaults,
	buildFieldMap,
	createResolver,
};
