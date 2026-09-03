import index from "./src/frontend.html";
import { GET as getSource } from "./src/routes/api.sources.$.ts";
import { POST as submitForm } from "./src/routes/api.submit.ts";

const server = Bun.serve({
	development: process.env.NODE_ENV !== "production" && {
		console: true,
		hmr: true,
	},
	port: 4000,
	routes: {
		"/*": index,
		"/api/sources/*": getSource,
		"/api/submit": submitForm,
	},
});

console.log(`🚀 Server running at ${server.url}`);
