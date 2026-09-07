import type { ReactNode } from "react";

import { EXAMPLES } from "#/examples";
import { cn } from "#/lib/utils";

export function RootLayout({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	const activeSlug =
		typeof window === "undefined"
			? undefined
			: window.location.pathname.split("/").find(Boolean);
	return (
		<div className="flex min-h-screen">
			<aside className="w-64 shrink-0 border-border border-r bg-sidebar p-4 text-sidebar-foreground">
				<a className="block font-semibold text-lg" href="/">
					@adistack/forms
				</a>
				<nav className="grid gap-1 mt-6">
					{EXAMPLES.map((ex) => (
						<a
							className={cn("rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
								ex.slug === activeSlug
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: ""
							)}
							href={`/${ex.slug}`}
							key={ex.slug}
							title={ex.description}
						>
							{ex.title}
						</a>
					))}
				</nav>
			</aside>
			<main className={className}>{children}</main>
		</div>
	);
}
