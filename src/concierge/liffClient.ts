const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

export type LiffStatus = "disabled" | "loading" | "login_required" | "ready" | "error";

export interface LiffSession {
  status: LiffStatus;
  inClient: boolean;
  lineUserId?: string;
  displayName?: string;
  errorMessage?: string;
}

interface LiffProfile {
  userId: string;
  displayName?: string;
}

interface LiffSdk {
  init(input: { liffId: string; withLoginOnExternalBrowser?: boolean }): Promise<void>;
  isInClient(): boolean;
  isLoggedIn(): boolean;
  login(input?: { redirectUri?: string }): void;
  getProfile(): Promise<LiffProfile>;
  getFriendship(): Promise<{ friendFlag: boolean }>;
  requestFriendship?(): Promise<void>;
}

type LiffWindow = Window & {
  liff?: LiffSdk;
};

let loadingScript: Promise<void> | null = null;
const LIFF_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(code)), LIFF_TIMEOUT_MS);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error: unknown) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function getLiff(): LiffSdk | null {
  return (window as LiffWindow).liff ?? null;
}

function loadLiffScript(): Promise<void> {
  const existing = getLiff();
  if (existing !== null) {
    return Promise.resolve();
  }
  if (loadingScript !== null) {
    return loadingScript;
  }
  loadingScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LIFF_SDK_URL;
    script.async = true;
    script.charset = "utf-8";
    script.onload = () => resolve();
    script.onerror = () => { loadingScript = null; reject(new Error("liff_sdk_load_failed")); };
    document.head.appendChild(script);
  });
  return loadingScript;
}

export async function initializeLiff(liffId: string | undefined): Promise<LiffSession> {
  if (typeof window === "undefined" || liffId === undefined || liffId.trim().length === 0) {
    return { status: "disabled", inClient: false };
  }
  try {
    await withTimeout(loadLiffScript(), "liff_sdk_load_timeout");
    const liff = getLiff();
    if (liff === null) {
      return { status: "error", inClient: false, errorMessage: "liff_sdk_unavailable" };
    }
    // withLoginOnExternalBrowser:true は init 時点で外部ブラウザを強制的に
    // LINEログインへリダイレクトしてしまい、下の「明示ボタンでのみ連携」意図と
    // ローカルfallback(Supabase/LINE未設定でも全工程成立)を壊す。必ず false。
    await withTimeout(liff.init({ liffId, withLoginOnExternalBrowser: false }), "liff_init_timeout");
    const inClient = liff.isInClient();
    if (!inClient && !liff.isLoggedIn()) {
      // 外部ブラウザでは確認なしに自動リダイレクトしない。ユーザーが明示的に
      // 連携ボタンを押したときだけ loginLiff() でログイン画面へ送る。
      return { status: "login_required", inClient };
    }
    const profile = await withTimeout(liff.getProfile(), "liff_profile_timeout");
    return {
      status: "ready",
      inClient,
      lineUserId: profile.userId,
      displayName: profile.displayName,
    };
  } catch (error) {
    return {
      status: "error",
      inClient: false,
      errorMessage: error instanceof Error ? error.message : "liff_init_failed",
    };
  }
}

export function loginLiff(): void {
  const liff = getLiff();
  if (liff === null) {
    return;
  }
  liff.login({ redirectUri: window.location.href });
}

export async function getLiffFriendship(): Promise<boolean> {
  const liff = getLiff();
  if (liff === null) throw new Error("liff_sdk_unavailable");
  return (await liff.getFriendship()).friendFlag;
}

export async function requestLiffFriendship(): Promise<void> {
  const liff = getLiff();
  if (liff === null) throw new Error("liff_sdk_unavailable");
  if (liff.requestFriendship === undefined) throw new Error("liff_request_friendship_unavailable");
  await liff.requestFriendship();
}

export function getBoothIdFromLiffUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const direct = params.get("booth");
  if (direct !== null && direct.trim().length > 0) {
    return direct;
  }
  const state = params.get("liff.state");
  if (state === null || state.trim().length === 0) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(state);
    const stateQuery = decoded.includes("?") ? decoded.slice(decoded.indexOf("?") + 1) : decoded.replace(/^\?/, "");
    const stateParams = new URLSearchParams(stateQuery);
    const booth = stateParams.get("booth");
    return booth !== null && booth.trim().length > 0 ? booth : null;
  } catch {
    return null;
  }
}
