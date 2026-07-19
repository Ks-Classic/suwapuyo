export function onRequest(): Response {
  return Response.json({ error: "admin_api_not_implemented" }, { status: 404, headers: { "cache-control": "no-store" } });
}
