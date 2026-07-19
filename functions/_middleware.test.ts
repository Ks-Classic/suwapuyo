import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { isProtectedAdminPath, onRequest } from "./_middleware";

const TEAM_DOMAIN = "https://middleware-test.cloudflareaccess.com";
const AUDIENCE = "middleware-audience";
const KEY_ID = "middleware-key";
let validToken: string;
let publicJwk: JsonWebKey;

function encodeBase64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  publicJwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: KEY_ID, use: "sig", alg: "RS256" } as JsonWebKey;
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", kid: KEY_ID }));
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(JSON.stringify({ iss: TEAM_DOMAIN, aud: [AUDIENCE], sub: "staff-subject", email: "staff@example.test", iat: now - 10, exp: now + 600 }));
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(input));
  validToken = `${input}.${encodeBase64Url(new Uint8Array(signature))}`;
});

afterEach(() => vi.unstubAllGlobals());

function context(request: Request, env: { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string } = {}) {
  return {
    request,
    env,
    data: {},
    next: vi.fn(async () => new Response("next")),
  };
}

describe("Cloudflare Access middleware boundary", () => {
  it.each([
    "/staff",
    "/staff/artworks",
    "/fuwafuwa/staff",
    "/concierge/staff",
    "/api/admin",
    "/api/admin/display-state",
  ])("protects %s", (pathname) => {
    expect(isProtectedAdminPath(pathname)).toBe(true);
  });

  it.each(["/", "/display", "/claim", "/concierge", "/api/public/display"])("leaves %s public", (pathname) => {
    expect(isProtectedAdminPath(pathname)).toBe(false);
  });

  it("fails closed when Access bindings are missing", async () => {
    const ctx = context(new Request("https://example.test/staff"));
    const response = await onRequest(ctx);
    expect(response.status).toBe(503);
    expect(ctx.next).not.toHaveBeenCalled();
  });

  it("rejects a protected request without the Access assertion header", async () => {
    const ctx = context(new Request("https://example.test/api/admin"), {
      CF_ACCESS_TEAM_DOMAIN: "https://suwapuyo.cloudflareaccess.com",
      CF_ACCESS_AUD: "audience",
    });
    const response = await onRequest(ctx);
    expect(response.status).toBe(403);
    expect(ctx.next).not.toHaveBeenCalled();
  });

  it("does not invoke authentication for a public route", async () => {
    const ctx = context(new Request("https://example.test/display"));
    const response = await onRequest(ctx);
    expect(response.status).toBe(200);
    expect(ctx.next).toHaveBeenCalledOnce();
  });

  it("passes a valid Access browser principal to the protected route", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [publicJwk] })));
    const ctx = context(new Request("https://example.test/staff", { headers: { "cf-access-jwt-assertion": validToken } }), {
      CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
      CF_ACCESS_AUD: AUDIENCE,
    });
    const response = await onRequest(ctx);
    expect(response.status).toBe(200);
    expect(ctx.next).toHaveBeenCalledOnce();
    expect(ctx.data).toEqual({ accessPrincipal: { subject: "staff-subject", email: "staff@example.test" } });
  });

  it("rejects a cross-origin admin mutation after authentication", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [publicJwk] })));
    const ctx = context(new Request("https://example.test/api/admin/display-state", {
      method: "PATCH",
      headers: {
        "cf-access-jwt-assertion": validToken,
        "content-type": "application/json",
        origin: "https://attacker.test",
        "sec-fetch-site": "cross-site",
      },
      body: "{}",
    }), { CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, CF_ACCESS_AUD: AUDIENCE });
    const response = await onRequest(ctx);
    expect(response.status).toBe(403);
    expect(ctx.next).not.toHaveBeenCalled();
  });

  it("redirects an authenticated legacy staff path to the protected canonical path", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [publicJwk] })));
    const ctx = context(new Request("https://example.test/fuwafuwa/staff/devices?from=legacy", {
      headers: { "cf-access-jwt-assertion": validToken },
    }), { CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, CF_ACCESS_AUD: AUDIENCE });
    const response = await onRequest(ctx);
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://example.test/staff/devices?from=legacy");
    expect(ctx.next).not.toHaveBeenCalled();
  });
});
