import { beforeAll, describe, expect, it } from "vitest";
import { AccessJwtError, verifyAccessJwt } from "./access";

const TEAM_DOMAIN = "https://suwapuyo-test.cloudflareaccess.com";
const AUDIENCE = "staff-app-audience";
const KEY_ID = "test-key";
const NOW = 1_800_000_000;

let privateKey: CryptoKey;
let publicJwk: JsonWebKey;

function encodeBase64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signToken(payloadPatch: Record<string, unknown> = {}, headerPatch: Record<string, unknown> = {}): Promise<string> {
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", kid: KEY_ID, ...headerPatch }));
  const payload = encodeBase64Url(JSON.stringify({
    iss: TEAM_DOMAIN,
    aud: [AUDIENCE],
    sub: "staff-subject",
    email: "staff@example.test",
    iat: NOW - 30,
    exp: NOW + 300,
    ...payloadPatch,
  }));
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(input));
  return `${input}.${encodeBase64Url(new Uint8Array(signature))}`;
}

function jwksFetcher(jwk: JsonWebKey = publicJwk): typeof fetch {
  return async () => Response.json({ keys: [jwk] });
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  privateKey = pair.privateKey;
  publicJwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: KEY_ID, use: "sig", alg: "RS256" } as JsonWebKey;
});

describe("verifyAccessJwt", () => {
  it("accepts a valid Cloudflare Access browser principal", async () => {
    const token = await signToken();
    await expect(verifyAccessJwt(token, { teamDomain: TEAM_DOMAIN, audience: AUDIENCE }, { fetcher: jwksFetcher(), nowSeconds: NOW }))
      .resolves.toEqual({ subject: "staff-subject", email: "staff@example.test" });
  });

  it.each([
    ["wrong issuer", { iss: "https://other.cloudflareaccess.com" }],
    ["wrong audience", { aud: ["other-audience"] }],
    ["expired token", { exp: NOW - 120 }],
    ["future token", { nbf: NOW + 120 }],
    ["service token without email", { email: undefined }],
  ])("rejects %s", async (_label, payloadPatch) => {
    const token = await signToken(payloadPatch);
    await expect(verifyAccessJwt(token, { teamDomain: TEAM_DOMAIN, audience: AUDIENCE }, { fetcher: jwksFetcher(), nowSeconds: NOW }))
      .rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects a non-RS256 algorithm before key lookup", async () => {
    const token = await signToken({}, { alg: "none" });
    await expect(verifyAccessJwt(token, { teamDomain: TEAM_DOMAIN, audience: AUDIENCE }, { fetcher: jwksFetcher(), nowSeconds: NOW }))
      .rejects.toBeInstanceOf(AccessJwtError);
  });

  it("fails closed when JWKS cannot be loaded", async () => {
    const token = await signToken({ iss: "https://unavailable.cloudflareaccess.com" });
    const unavailableFetcher: typeof fetch = async () => new Response(null, { status: 503 });
    await expect(verifyAccessJwt(
      token,
      { teamDomain: "https://unavailable.cloudflareaccess.com", audience: AUDIENCE },
      { fetcher: unavailableFetcher, nowSeconds: NOW },
    )).rejects.toMatchObject({ kind: "unavailable" });
  });
});
