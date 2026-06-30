import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { ZodType } from "zod";

// biome-ignore lint/suspicious/noExplicitAny: adapter cannot know TValues — produces a generic RHF resolver
export function createResolver(schema: ZodType): Resolver<any> {
  return zodResolver(schema as never);
}
