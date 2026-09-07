import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FieldValues, Resolver } from "react-hook-form";
import type { GenericSchema } from "valibot";

import type { SchemaAdapter } from "#/types";
import { createFieldMap } from "./create-field-map";

export function createResolver(schema: GenericSchema): Resolver {
	return valibotResolver(schema as GenericSchema<FieldValues, FieldValues>);
}

export const valibotAdapter: SchemaAdapter<GenericSchema, FieldValues> = {
	createFieldMap,
	createResolver,
};
