import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FieldValues, Resolver } from "react-hook-form";
import type { GenericSchema, InferOutput } from "valibot";

import { buildDefaults } from "#/adapters/shared";
import type { SchemaAdapter } from "#/types";
import { buildFieldMap } from "./build-field-map";

export { buildDefaults, buildFieldMap };

/** Output type of a Valibot schema (`v.InferOutput` equivalent, zero runtime). */
export type InferValibot<TSchema extends GenericSchema> = InferOutput<TSchema>;

export function createResolver(schema: GenericSchema): Resolver {
	return valibotResolver(schema as GenericSchema<FieldValues, FieldValues>);
}

export const valibotAdapter: SchemaAdapter<GenericSchema, FieldValues> = {
	buildDefaults,
	buildFieldMap,
	createResolver,
};
