/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the page matching the URL to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import ExamplePage, { EXAMPLES } from "./app/[...id]/page";
import { RootLayout } from "./app/layout";
import HomePage from "./app/page";
import "./styles.css";

/**
 * File routes — mirrors `src/app/`: `/` → `app/page.tsx`,
 * `/<id>` → `app/[...id]/page.tsx`. (Next.js reads these off the
 * filesystem; with one Bun-served shell the entry builds `params`
 * from the pathname instead.)
 */
const segments = window.location.pathname.split("/").filter(Boolean);
const [first] = segments;
const exampleId =
	first !== undefined && EXAMPLES.some((ex) => ex.id === first) ? first : null;

const app = (
	<StrictMode>
		<RootLayout exampleId={exampleId}>
			{segments.length === 0 ? (
				<HomePage />
			) : (
				<ExamplePage params={{ id: segments }} />
			)}
		</RootLayout>
	</StrictMode>
);

const elem = document.getElementById("root");
if (!elem) throw new Error("Root element not found");

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
if (import.meta.hot) {
	const root = import.meta.hot.data.root ?? createRoot(elem);
	import.meta.hot.data.root = root;
	root.render(app);
} else {
	createRoot(elem).render(app);
}
