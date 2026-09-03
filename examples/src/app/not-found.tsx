/** Unknown path — rendered inside the root layout. */
export default function NotFoundPage() {
	return (
		<div className="w-full max-w-md text-center">
			<h1 className="mb-1 font-semibold text-2xl">Page not found</h1>
			<p className="mb-6 text-muted-foreground text-sm">
				This route has no `src/app/…/page.tsx`.
			</p>
			<a
				className="rounded-md border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary"
				href="/"
			>
				Back to examples
			</a>
		</div>
	);
}
