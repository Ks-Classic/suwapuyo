const MAX_TOKEN_LENGTH = 16_384;
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_SECONDS = 300;

export interface AccessPrincipal {
  subject: string;
  email: string;
}

export interface AccessJwtConfig {
  teamDomain: string;
  audience: string;
}

type AccessErrorKind = "configuration" | "invalid" | "unavailable";

export class AccessJwtError extends Error {
  readonly kind: AccessErrorKind;

  constructor(kind: AccessErrorKind) {
    super(`access_jwt_${kind}`);
    this.name = "AccessJwtError";
    this.kind = kind;
  }
}

interface JwtHeader {
  alg: string;
  kid: string;
}

interface JwtPayload {
  iss: string;
  aud: string | string[];
  sub: string;
  email: string;
  exp: number;
  nbf?: number;
  iat?: number;
}

interface AccessJwk extends JsonWebKey {
  alg?: string;
  kid: string;
  use?: string;
}

interface CachedJwks {
  expiresAt: number;
  keys: AccessJwk[];
}

const jwksCache = new Map<string, CachedJwks>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new AccessJwtError("invalid");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new AccessJwtError("invalid");
  }
}

function decodeJson(value: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as unknown;
  } catch (error) {
    if (error instanceof AccessJwtError) throw error;
    throw new AccessJwtError("invalid");
  }
}

function parseHeader(value: unknown): JwtHeader {
  if (!isRecord(value) || value.alg !== "RS256" || typeof value.kid !== "string" || value.kid.length === 0) {
    throw new AccessJwtError("invalid");
  }
  return { alg: value.alg, kid: value.kid };
}

function parsePayload(value: unknown): JwtPayload {
  if (
    !isRecord(value) ||
    typeof value.iss !== "string" ||
    !(typeof value.aud === "string" || (Array.isArray(value.aud) && value.aud.every((item) => typeof item === "string"))) ||
    typeof value.sub !== "string" || value.sub.length === 0 ||
    typeof value.email !== "string" || value.email.length === 0 ||
    typeof value.exp !== "number" || !Number.isFinite(value.exp)
  ) {
    throw new AccessJwtError("invalid");
  }
  if (value.nbf !== undefined && (typeof value.nbf !== "number" || !Number.isFinite(value.nbf))) {
    throw new AccessJwtError("invalid");
  }
  if (value.iat !== undefined && (typeof value.iat !== "number" || !Number.isFinite(value.iat))) {
    throw new AccessJwtError("invalid");
  }
  return value as unknown as JwtPayload;
}

function normalizeConfig(config: AccessJwtConfig): AccessJwtConfig {
  if (config.audience.trim().length === 0) {
    throw new AccessJwtError("configuration");
  }
  let url: URL;
  try {
    url = new URL(config.teamDomain);
  } catch {
    throw new AccessJwtError("configuration");
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.hostname.endsWith(".cloudflareaccess.com")
  ) {
    throw new AccessJwtError("configuration");
  }
  return { teamDomain: url.origin, audience: config.audience.trim() };
}

function parseJwks(value: unknown): AccessJwk[] {
  if (!isRecord(value) || !Array.isArray(value.keys)) {
    throw new AccessJwtError("unavailable");
  }
  const keys = value.keys.filter((key): key is AccessJwk => isRecord(key) && typeof key.kid === "string");
  if (keys.length === 0) {
    throw new AccessJwtError("unavailable");
  }
  return keys;
}

async function loadJwks(teamDomain: string, fetcher: typeof fetch, nowSeconds: number): Promise<AccessJwk[]> {
  const cached = jwksCache.get(teamDomain);
  if (cached !== undefined && cached.expiresAt > nowSeconds) {
    return cached.keys;
  }
  let response: Response;
  try {
    response = await fetcher(`${teamDomain}/cdn-cgi/access/certs`, { headers: { accept: "application/json" } });
  } catch {
    throw new AccessJwtError("unavailable");
  }
  if (!response.ok) {
    throw new AccessJwtError("unavailable");
  }
  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    throw new AccessJwtError("unavailable");
  }
  const keys = parseJwks(body);
  jwksCache.set(teamDomain, { expiresAt: nowSeconds + JWKS_CACHE_SECONDS, keys });
  return keys;
}

function selectKey(keys: AccessJwk[], kid: string): AccessJwk {
  const key = keys.find((candidate) => candidate.kid === kid && candidate.kty === "RSA" && candidate.use === "sig" && (candidate.alg === undefined || candidate.alg === "RS256"));
  if (key === undefined) {
    throw new AccessJwtError("invalid");
  }
  return key;
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function validateClaims(payload: JwtPayload, config: AccessJwtConfig, nowSeconds: number): void {
  const audiences = typeof payload.aud === "string" ? [payload.aud] : payload.aud;
  if (payload.iss !== config.teamDomain || !audiences.includes(config.audience)) {
    throw new AccessJwtError("invalid");
  }
  if (payload.exp <= nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new AccessJwtError("invalid");
  }
  if (payload.nbf !== undefined && payload.nbf > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new AccessJwtError("invalid");
  }
  if (payload.iat !== undefined && payload.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new AccessJwtError("invalid");
  }
}

export async function verifyAccessJwt(
  token: string,
  rawConfig: AccessJwtConfig,
  options: { fetcher?: typeof fetch; nowSeconds?: number } = {},
): Promise<AccessPrincipal> {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    throw new AccessJwtError("invalid");
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new AccessJwtError("invalid");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = parseHeader(decodeJson(encodedHeader));
  const payload = parsePayload(decodeJson(encodedPayload));
  const config = normalizeConfig(rawConfig);
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  validateClaims(payload, config, nowSeconds);

  const keys = await loadJwks(config.teamDomain, options.fetcher ?? fetch, nowSeconds);
  const jwk = selectKey(keys, header.kid);
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  } catch {
    throw new AccessJwtError("invalid");
  }
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    ownedBuffer(decodeBase64Url(encodedSignature)),
    ownedBuffer(new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)),
  );
  if (!verified) {
    throw new AccessJwtError("invalid");
  }
  return { subject: payload.sub, email: payload.email };
}
