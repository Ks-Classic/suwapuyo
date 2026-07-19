import { AccessJwtError, verifyAccessJwt, type AccessPrincipal } from "./lib/access";

interface Env {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

interface MiddlewareContext {
  request: Request;
  env: Env;
  data: { accessPrincipal?: AccessPrincipal };
  next(): Promise<Response>;
}

const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function isProtectedAdminPath(pathname: string): boolean {
  return pathname === "/staff" || pathname.startsWith("/staff/") ||
    pathname === "/fuwafuwa/staff" || pathname.startsWith("/fuwafuwa/staff/") ||
    pathname === "/concierge/staff" || pathname.startsWith("/concierge/staff/") ||
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function jsonError(status: number, code: string): Response {
  return Response.json({ error: code }, { status, headers: { "cache-control": "no-store" } });
}

function canonicalStaffUrl(url: URL): URL | null {
  if (url.pathname === "/fuwafuwa/staff" || url.pathname.startsWith("/fuwafuwa/staff/")) {
    const target = new URL(url);
    target.pathname = url.pathname.replace(/^\/fuwafuwa\/staff/, "/staff");
    return target;
  }
  return null;
}

function validateMutationBoundary(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method)) return null;
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin !== requestUrl.origin || (fetchSite !== null && fetchSite !== "same-origin")) {
    return jsonError(403, "cross_origin_request_rejected");
  }
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") {
      return jsonError(415, "application_json_required");
    }
  }
  return null;
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const url = new URL(context.request.url);
  if (!isProtectedAdminPath(url.pathname)) {
    return context.next();
  }
  const teamDomain = context.env.CF_ACCESS_TEAM_DOMAIN;
  const audience = context.env.CF_ACCESS_AUD;
  if (teamDomain === undefined || audience === undefined) {
    return jsonError(503, "admin_auth_unavailable");
  }
  const token = context.request.headers.get("cf-access-jwt-assertion");
  if (token === null) {
    return jsonError(403, "admin_auth_required");
  }
  try {
    context.data.accessPrincipal = await verifyAccessJwt(token, { teamDomain, audience });
  } catch (error) {
    const status = error instanceof AccessJwtError && (error.kind === "configuration" || error.kind === "unavailable") ? 503 : 403;
    return jsonError(status, status === 503 ? "admin_auth_unavailable" : "admin_auth_invalid");
  }
  const mutationError = validateMutationBoundary(context.request);
  if (mutationError !== null) return mutationError;

  const canonical = canonicalStaffUrl(url);
  if (canonical !== null) {
    return Response.redirect(canonical.toString(), 308);
  }
  const response = await context.next();
  if (url.pathname === "/api/admin" || url.pathname.startsWith("/api/admin/")) {
    const secured = new Response(response.body, response);
    secured.headers.set("cache-control", "no-store");
    return secured;
  }
  return response;
}
