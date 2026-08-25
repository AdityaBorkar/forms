import {
	createRootRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { exampleSources } from "@/lib/example-sources.gen";
import { GITHUB_EXAMPLES_PREFIX } from "@/lib/utils";

const EXAMPLE_FILES = {
	"/array-form": [
		"routes/array-form.tsx",
		"components/form-wrapper.tsx",
		"lib/form.tsx",
	],
	"/custom-field-component": [
		"routes/custom-field-component.tsx",
		"components/form-wrapper.tsx",
		"lib/form.tsx",
	],
	"/custom-field-types": [
		"routes/custom-field-types.tsx",
		"components/form-wrapper.tsx",
		"lib/form.tsx",
	],
	"/nested-form": [
		"routes/nested-form.tsx",
		"components/form-wrapper.tsx",
		"lib/form.tsx",
	],
	"/simple-form": [
		"routes/simple-form.tsx",
		"components/form-wrapper.tsx",
		"lib/form.tsx",
	],
} as const satisfies Record<string, readonly string[]>;

type ExamplePath = keyof typeof EXAMPLE_FILES;

const examples = [
	{ label: "Simple Form", to: "/simple-form" },
	{ label: "Nested Fields", to: "/nested-form" },
	{ label: "Array Fields", to: "/array-form" },
	{ label: "Custom Field Types", to: "/custom-field-types" },
	{ label: "Custom Field Component", to: "/custom-field-component" },
] as const;

export const Route = createRootRoute({
	component: RootComponent,
});

// biome-ignore lint/style/useComponentExportOnlyModules: internal component
function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="currentColor"
			height="16"
			viewBox="0 0 16 16"
			width="16"
		>
			<title>GitHub</title>
			<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
		</svg>
	);
}

// biome-ignore lint/style/useComponentExportOnlyModules: internal component
function SourcePanel() {
	const location = useRouterState({ select: (s) => s.location.pathname });
	const [activeTab, setActiveTab] = useState(0);

	const files = EXAMPLE_FILES[location as ExamplePath];
	if (!files) return null;

	const sources = files
		.map((rel) => {
			const src = exampleSources[rel];
			return src ? { ...src, rel } : null;
		})
		.filter((s): s is NonNullable<typeof s> => s !== null);

	if (sources.length === 0) return null;

	const current = sources[activeTab] ?? sources[0];
	if (!current) return null;
	const githubUrl = `${GITHUB_EXAMPLES_PREFIX}/${current.rel}`;

	return (
		<aside className="flex w-2xl shrink-0 flex-col border-border border-l bg-card">
			<div className="flex items-center justify-between border-border border-b px-4 py-2">
				<span className="font-medium text-sm">Source</span>
				<a
					className="inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
					href={githubUrl}
					rel="noopener noreferrer"
					target="_blank"
				>
					<GitHubIcon className="size-3.5" />
					View on GitHub
					<ExternalLink className="size-3" />
				</a>
			</div>
			<div className="flex border-border border-b">
				{sources.map((src, i) => (
					<button
						className={`border-b-2 px-3 py-1.5 text-xs transition-colors ${
							i === activeTab
								? "border-primary font-medium text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
						key={src.rel}
						// biome-ignore lint/performance/noJsxPropsBind: index is stable
						onClick={() => setActiveTab(i)}
						type="button"
					>
						{src.name}
					</button>
				))}
			</div>
			<pre className="grow overflow-auto p-4 text-xs leading-relaxed">
				<code>{current.content}</code>
			</pre>
		</aside>
	);
}

function RootComponent() {
	return (
		<div className="flex min-h-screen">
			<aside className="w-64 shrink-0 border-border border-r bg-sidebar p-4 text-sidebar-foreground">
				<h1 className="mb-6 font-semibold text-lg">@adistack/forms</h1>
				<nav className="grid gap-1">
					{examples.map((ex) => (
						<Link
							activeOptions={{ exact: true }}
							activeProps={{
								className: "bg-sidebar-accent text-sidebar-accent-foreground",
							}}
							className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							key={ex.to}
							to={ex.to}
						>
							{ex.label}
						</Link>
					))}
				</nav>
			</aside>
			<main className="flex min-w-0 flex-1 justify-center p-8">
				<Outlet />
			</main>
			<SourcePanel />
		</div>
	);
}
