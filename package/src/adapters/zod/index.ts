import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

import { buildDefaults } from "@/adapters/shared";
import type { SchemaAdapter } from "@/types";
import { buildFieldMap } from "./build-field-map";

export { buildDefaults, buildFieldMap };

export function createResolver(
	schema: ZodType<FieldValues, FieldValues>,
): Resolver {
	return zodResolver(schema);
}

export const zodAdapter: SchemaAdapter<ZodType<FieldValues, FieldValues>> = {
	buildDefaults,
	buildFieldMap,
	createResolver,
};
