import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FieldValues, Resolver } from "react-hook-form";
import type { GenericSchema } from "valibot";

export function createResolver(schema: GenericSchema): Resolver {
	return valibotResolver(schema as GenericSchema<FieldValues, FieldValues>);
}
