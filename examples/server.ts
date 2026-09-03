import { GET as getSource } from "./src/app/api.sources.$.ts";
import { POST as submitEcho } from "./src/app/api.submit.ts";
import index from "./src/frontend.html";

const server = Bun.serve({
	development: process.env.NODE_ENV !== "production" && {
		console: true,
		hmr: true,
	},
	port: 4000,
	routes: {
		"/*": index,
		"/api/sources/*": getSource,
		"/api/submit": submitEcho,
	},
});

console.log(`🚀 Server running at ${server.url}`);
