import { RootLayout } from "#/components/layout/root.tsx";
import { SourcePanel } from "#/components/layout/source.tsx";
import { EXAMPLES } from "#/examples";

export default function Page({ params }: { params: { id: string } }) {
	const Example = EXAMPLES.find((ex) => ex.slug === params.id);

	if (!Example) {
		return (
			<RootLayout className="w-full max-w-md p-8">
				<div className="text-center">
					<h1 className="mb-1 font-semibold text-2xl">Page not found</h1>
					<p className="mb-6 text-muted-foreground text-sm">
						This route has no `src/app/$id.tsx` match.
					</p>
					<a
						className="rounded-md border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary"
						href="/"
					>
						Back to examples
					</a>
				</div>
			</RootLayout>
		);
	}
	return (
		<RootLayout className="w-full grid grid-cols-3 h-screen *:overflow-auto divide-x divide-border">
			<SourcePanel exampleId={Example.slug} className="col-span-2 " />
			<Example.component />
		</RootLayout>
	);
}
