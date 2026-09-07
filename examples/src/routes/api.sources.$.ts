/** Example + system files this route may read from `src/`. */
const SOURCE_ALLOWLIST = new Set<string>([
	"examples/simple-form.tsx",
	"examples/nested-form.tsx",
	"examples/array-form.tsx",
	"examples/field-kinds.tsx",
	"examples/custom-component.tsx",
	"examples/validation-modes.tsx",
	"examples/defaults-optional.tsx",
	"examples/form-context.tsx",
	"examples/valibot-form.tsx",
	"examples/server-submit.tsx",
	"examples/submit-errors.tsx",
	"examples/alternative-widgets.tsx",
	"examples/primitive-array.tsx",
	"examples/missing-field.tsx",
	"components/form-zod.tsx",
	"components/form-valibot.tsx",
	"components/form-wrapper.tsx",
]);

// `src/` is one level up from this file: `src/app/api.sources.$.ts`.
const SRC_DIR = `${import.meta.dir}/../`;

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
