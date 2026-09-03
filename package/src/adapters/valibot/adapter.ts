import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FieldValues, Resolver } from "react-hook-form";
import type { GenericSchema } from "valibot";

import { buildDefaults } from "@/adapters/shared/defaults";
import type { SchemaAdapter } from "@/types";
import { buildFieldMap } from "./build-field-map";

export function createResolver(schema: GenericSchema): Resolver {
	return valibotResolver(schema as GenericSchema<FieldValues, FieldValues>);
}

export const valibotAdapter: SchemaAdapter<GenericSchema> = {
	buildDefaults,
	buildFieldMap,
	createResolver,
};
