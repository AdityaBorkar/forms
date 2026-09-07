import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

import type { SchemaAdapter } from "#/types";
import { createFieldMap } from "./create-field-map";

export function createResolver(
	schema: ZodType<FieldValues, FieldValues>,
): Resolver {
	return zodResolver(schema);
}

export const zodAdapter: SchemaAdapter<
	ZodType<FieldValues, FieldValues>,
	FieldValues
> = {
	createFieldMap,
	createResolver,
};
