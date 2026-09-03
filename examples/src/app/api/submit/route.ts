/** `POST /api/submit/*` — echoes the JSON payload back. */
export async function POST(request: Request): Promise<Response> {
	const body: unknown = await request.json().catch(() => null);
	return Response.json({ ok: true, received: body });
}
