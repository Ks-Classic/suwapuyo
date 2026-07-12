import { getLiffFriendship, initializeLiff, loginLiff, requestLiffFriendship, type LiffSession } from "../concierge/liffClient";

export type SuwapuyoLiffStatus = "loading" | "demo" | "login_required" | "friendship_required" | "ready" | "error";

export interface SuwapuyoLiffState {
  status: SuwapuyoLiffStatus;
  inClient: boolean;
  errorCode?: string;
}

type Initialize = (liffId: string | undefined) => Promise<LiffSession>;
type Friendship = () => Promise<boolean>;
const FRIENDSHIP_TIMEOUT_MS = 12_000;

function friendshipWithTimeout(getFriendship: Friendship): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error("liff_friendship_timeout")), FRIENDSHIP_TIMEOUT_MS);
    getFriendship().then(
      (value) => { globalThis.clearTimeout(timer); resolve(value); },
      (error: unknown) => { globalThis.clearTimeout(timer); reject(error); },
    );
  });
}

export async function resolveSuwapuyoLiff(
  liffId: string | undefined,
  initialize: Initialize = initializeLiff,
  getFriendship: Friendship = getLiffFriendship,
): Promise<SuwapuyoLiffState> {
  const session = await initialize(liffId);
  if (session.status === "disabled") return { status: "demo", inClient: false };
  if (session.status === "loading") return { status: "loading", inClient: false };
  if (session.status === "login_required") return { status: "login_required", inClient: session.inClient };
  if (session.status === "error") return { status: "error", inClient: session.inClient, errorCode: normalizeLiffError(session.errorMessage) };
  try {
    const friend = await friendshipWithTimeout(getFriendship);
    return { status: friend ? "ready" : "friendship_required", inClient: session.inClient };
  } catch (error) {
    return { status: "error", inClient: session.inClient, errorCode: normalizeLiffError(error instanceof Error ? error.message : undefined) };
  }
}

export function normalizeLiffError(message: string | undefined): string {
  if (message === "liff_sdk_load_failed") return "sdk_load_failed";
  if (message === "liff_sdk_unavailable") return "sdk_unavailable";
  if (message === "liff_sdk_load_timeout") return "sdk_timeout";
  if (message === "liff_init_timeout") return "init_timeout";
  if (message === "liff_profile_timeout") return "profile_timeout";
  if (message === "liff_friendship_timeout") return "friendship_timeout";
  if (message?.includes("network") === true) return "network_error";
  return "init_failed";
}

export function startLiffLogin(): void {
  loginLiff();
}

export async function addLiffFriend(): Promise<void> {
  await requestLiffFriendship();
}
