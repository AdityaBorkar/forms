import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FieldValues, Resolver } from "react-hook-form";
import type { GenericSchema } from "valibot";

import { buildDefaults } from "#/adapters/shared";
import type { SchemaAdapter } from "#/types";
import { buildFieldMap } from "./build-field-map";

// export type InferValibot<TSchema extends GenericSchema> = InferOutput<TSchema>;

export function createResolver(schema: GenericSchema): Resolver {
	return valibotResolver(schema as GenericSchema<FieldValues, FieldValues>);
}

export const valibotAdapter: SchemaAdapter<GenericSchema, FieldValues> = {
	buildDefaults,
	buildFieldMap,
	createResolver,
};
