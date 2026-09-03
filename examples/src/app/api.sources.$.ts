/** Example + system files this route may read from `src/`. */
const SOURCE_ALLOWLIST = new Set<string>(
	[
		"simple-form.tsx",
		"nested-form.tsx",
		"array-form.tsx",
		"field-kinds.tsx",
		"custom-component.tsx",
		"validation-modes.tsx",
		"defaults-optional.tsx",
		"form-context.tsx",
		"valibot-form.tsx",
		"server-submit.tsx",
	].map((file) => `examples/${file}`),
);
for (const file of ["form.tsx", "form-valibot.tsx"])
	SOURCE_ALLOWLIST.add(`lib/${file}`);
SOURCE_ALLOWLIST.add("components/form-wrapper.tsx");

// `src/` is four levels up from this file:
// `src/app/api/sources/[...file]/route.ts`.
const SRC_DIR = `${import.meta.dir}/../../../../`;

/** `GET /api/sources/<rel>` — raw file contents for the source panel. */
export async function GET(request: Request): Promise<Response> {
	// Everything after the prefix is the relative path (`examples/x.tsx`);
	// the allowlist below rejects anything else (no traversal possible).
	const rel = new URL(request.url).pathname.replace("/api/sources/", "");
	if (!SOURCE_ALLOWLIST.has(rel))
		return Response.json(
			{
				detail: `Unknown source file "${rel}".`,
				status: 404,
				title: "Not Found",
				type: "about:blank",
			},
			{
				headers: { "content-type": "application/problem+json" },
				status: 404,
			},
		);
	const content = await Bun.file(`${SRC_DIR}${rel}`).text();
	return Response.json({ content, name: rel.split("/").pop() ?? rel });
}
