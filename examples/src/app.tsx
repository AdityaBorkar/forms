import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { EXAMPLES } from "@/examples/registry";
import { GITHUB_EXAMPLES_PREFIX } from "@/lib/utils";

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

type SourceTab = { name: string; content: string };

function SourcePanel({ exampleId }: { exampleId: string }) {
	const example = EXAMPLES.find((ex) => ex.id === exampleId);
	const [activeTab, setActiveTab] = useState(0);
	const [tabs, setTabs] = useState<SourceTab[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!example) return;
		setActiveTab(0);
		setTabs([]);
		setError(null);
		let cancelled = false;
		// Raw file contents come from the Elysia `/api/sources` route —
		// no build-time codegen, the server reads `src/` from disk.
		Promise.all(
			[`examples/${example.file}`, `lib/${example.systemFile}`].map(
				async (rel): Promise<SourceTab> => {
					const res = await fetch(`/api/sources/${rel}`);
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const data = (await res.json()) as { content: string };
					return { content: data.content, name: rel.split("/").pop() ?? rel };
				},
			),
		)
			.then((loaded) => {
				if (!cancelled) setTabs(loaded);
			})
			.catch(() => {
				if (!cancelled) setError("Could not load sources.");
			});
		return () => {
			cancelled = true;
		};
	}, [example]);

	if (!example) return null;
	const current = tabs[activeTab] ?? tabs[0];
	const githubPath =
		current?.name === example.systemFile
			? `lib/${example.systemFile}`
			: `examples/${example.file}`;
	const githubUrl = `${GITHUB_EXAMPLES_PREFIX}/${githubPath}`;

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
				{tabs.map((tab, i) => (
					<button
						className={`border-b-2 px-3 py-1.5 text-xs transition-colors ${
							i === activeTab
								? "border-primary font-medium text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
						key={tab.name}
						// biome-ignore lint/performance/noJsxPropsBind: index is stable
						onClick={() => setActiveTab(i)}
						type="button"
					>
						{tab.name}
					</button>
				))}
			</div>
			<pre className="grow overflow-auto p-4 text-xs leading-relaxed">
				<code>{error ?? current?.content ?? "Loading…"}</code>
			</pre>
		</aside>
	);
}

export function App() {
	const [activeId, setActiveId] = useState<string>(EXAMPLES[0]?.id ?? "");
	const active = EXAMPLES.find((ex) => ex.id === activeId) ?? EXAMPLES[0];
	const ActiveComponent = active?.component;

	return (
		<div className="flex min-h-screen">
			<aside className="w-64 shrink-0 border-border border-r bg-sidebar p-4 text-sidebar-foreground">
				<h1 className="mb-1 font-semibold text-lg">@adistack/forms</h1>
				<p className="mb-6 text-muted-foreground text-xs">
					Bun + Elysia 2 (beta) + React
				</p>
				<nav className="grid gap-1">
					{EXAMPLES.map((ex) => (
						<button
							className={`rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
								ex.id === activeId
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: ""
							}`}
							key={ex.id}
							// biome-ignore lint/performance/noJsxPropsBind: demo — render perf is irrelevant
							onClick={() => setActiveId(ex.id)}
							title={ex.description}
							type="button"
						>
							{ex.label}
						</button>
					))}
				</nav>
			</aside>
			<main className="flex min-w-0 flex-1 justify-center p-8">
				{ActiveComponent ? <ActiveComponent /> : null}
			</main>
			<SourcePanel exampleId={activeId} />
		</div>
	);
}
