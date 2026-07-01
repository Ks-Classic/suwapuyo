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
}

type LiffWindow = Window & {
  liff?: LiffSdk;
};

let loadingScript: Promise<void> | null = null;

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
    script.onerror = () => reject(new Error("liff_sdk_load_failed"));
    document.head.appendChild(script);
  });
  return loadingScript;
}

export async function initializeLiff(liffId: string | undefined): Promise<LiffSession> {
  if (typeof window === "undefined" || liffId === undefined || liffId.trim().length === 0) {
    return { status: "disabled", inClient: false };
  }
  try {
    await loadLiffScript();
    const liff = getLiff();
    if (liff === null) {
      return { status: "error", inClient: false, errorMessage: "liff_sdk_unavailable" };
    }
    await liff.init({ liffId, withLoginOnExternalBrowser: true });
    const inClient = liff.isInClient();
    if (!inClient && !liff.isLoggedIn()) {
      // 外部ブラウザでは確認なしに自動リダイレクトしない。ユーザーが明示的に
      // 連携ボタンを押したときだけ loginLiff() でログイン画面へ送る。
      return { status: "login_required", inClient };
    }
    const profile = await liff.getProfile();
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
