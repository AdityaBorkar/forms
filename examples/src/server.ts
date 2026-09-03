import { Elysia, problem, t } from "elysia";

import index from "./index.html";

/**
 * Examples backend — Elysia 2 (beta).
 *
 * Elysia 2 notes (see https://elysiajs.com/blog/elysia-20):
 * - route hooks/schemas come BEFORE the handler:
 *   `.post(path, { body: t.Object(...) }, handler)`
 * - lifecycle hooks lost the `on` prefix (`error`, `beforeHandle`, …)
 * - errors are RFC 9457 problem details (`application/problem+json`);
 *   `problem(status, { detail })` builds one manually
 * - validation failures automatically return a 422 problem response
 *
 * Serving note: Elysia 2 beta cannot serve Bun's HTMLBundle yet
 * (upstream regression, elysiajs/elysia#1788 — route responses serialize
 * to `{}`). Until that lands, `Bun.serve` owns the SPA shell line below
 * while every `/api/*` route lives in the Elysia app.
 */

const EXAMPLE_FILES = [
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
] as const;

const SYSTEM_FILES = ["form.tsx", "form-valibot.tsx"] as const;

/** Files the `/api/sources` route is allowed to read from `src/`. */
const SOURCE_ALLOWLIST = new Set<string>([
	...EXAMPLE_FILES.map((file) => `examples/${file}`),
	...SYSTEM_FILES.map((file) => `lib/${file}`),
	"components/form-wrapper.tsx",
]);

const FORMS = [
	{ description: "Two fields, zero wiring.", id: "simple-form" },
	{ description: "Dotted names into objects.", id: "nested-form" },
	{ description: "Append, update, move, remove.", id: "array-form" },
	{ description: "Every widget, one schema.", id: "field-kinds" },
	{
		description: "Your own widget via meta.component.",
		id: "custom-component",
	},
	{ description: "Modes + onInvalid.", id: "validation-modes" },
	{ description: "Optional + defaultValues merge.", id: "defaults-optional" },
	{ description: "watch/reset, disabled, config.", id: "form-context" },
	{ description: "Same UI, Valibot schemas.", id: "valibot-form" },
	{ description: "POST to Elysia, 422 demo.", id: "server-submit" },
] as const;

const ContactBody = t.Object({
	email: t.String({ format: "email" }),
	message: t.String({ minLength: 10 }),
	name: t.String({ minLength: 1 }),
});

const app = new Elysia({ prefix: "/api" })
	.get("/health", () => ({ ok: true, server: "elysia-2-beta" }))
	.get("/forms", () => FORMS)
	.get("/sources/*", ({ params }) => {
		// Wildcard keeps the full relative path (`examples/x.tsx`); the
		// allowlist below rejects anything else (no traversal possible).
		const rel = params["*"];
		if (!SOURCE_ALLOWLIST.has(rel))
			return problem(404, { detail: `Unknown source file "${rel}".` });
		return Bun.file(`${import.meta.dir}/${rel}`)
			.text()
			.then((content) => ({ content, name: rel.split("/").pop() ?? rel }));
	})
	// Elysia-native validation: the schema (2nd arg) runs before the handler
	// and rejects bad payloads with a 422 problem+json automatically.
	.post("/submit/contact", { body: ContactBody }, ({ body }) => ({
		ok: true,
		received: body,
	}))
	.post("/submit/:form", ({ params }) =>
		problem(404, { detail: `Unknown form "${params.form}".` }),
	);

const server = Bun.serve({
	development: process.env.NODE_ENV !== "production" && {
		console: true,
		hmr: true,
	},
	routes: {
		"/*": index,
		"/api/*": (request) => app.fetch(request),
	},
});

console.log(`🚀 Server running at ${server.url} (Elysia 2 beta)`);
