import { EXAMPLES } from "./[...id]/page";

/** Route: `/` — index of every example. */
export default function Page() {
	return (
		<div className="w-full max-w-2xl">
			<h1 className="mb-1 font-semibold text-2xl">Examples</h1>
			<p className="mb-6 text-muted-foreground text-sm">
				Each example is one path handled by the catch-all route
				(`src/app/[...id]/page.tsx`), rendering a form built with
				@adistack/forms.
			</p>
			<nav className="grid gap-2">
				{EXAMPLES.map((ex) => (
					<a
						className="rounded-md border border-border bg-card p-4 transition-colors hover:border-primary"
						href={`/${ex.id}`}
						key={ex.id}
					>
						<span className="block font-medium text-sm">{ex.label}</span>
						<span className="block text-muted-foreground text-xs">
							{ex.description}
						</span>
					</a>
				))}
			</nav>
		</div>
	);
}
