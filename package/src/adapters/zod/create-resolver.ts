import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

export function createResolver(
  schema: ZodType<FieldValues, FieldValues>,
): Resolver {
  return zodResolver(schema);
}
