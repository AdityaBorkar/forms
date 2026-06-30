import { serve } from "bun";

import index from "./index.html";

const server = serve({
  development: process.env.NODE_ENV !== "production" && {
    console: true,
    hmr: true,
  },
  routes: {
    "/*": index,
    "/api/:form_id": async (req) => {
      const form_id = req.params.form_id;
      return Response.json({ message: `Hello, ${form_id}!` });
    },
  },
});

console.log(`🚀 Server running at ${server.url}`);
