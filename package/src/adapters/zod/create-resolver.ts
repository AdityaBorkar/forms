import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

export function createResolver(schema: ZodType): unknown {
  return zodResolver(schema as never);
}
