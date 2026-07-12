import { describe, expect, it, vi } from "vitest";
import { normalizeLiffError, resolveSuwapuyoLiff } from "./suwapuyoLiff";

describe("suwapuyo LIFF gate", () => {
  it("keeps local development available when LIFF ID is absent", async () => {
    const initialize = vi.fn().mockResolvedValue({ status: "disabled", inClient: false });
    await expect(resolveSuwapuyoLiff(undefined, initialize)).resolves.toEqual({ status: "demo", inClient: false });
  });

  it("requires explicit login in an external browser", async () => {
    const initialize = vi.fn().mockResolvedValue({ status: "login_required", inClient: false });
    await expect(resolveSuwapuyoLiff("123-test", initialize)).resolves.toEqual({ status: "login_required", inClient: false });
  });

  it("allows only a verified friend to continue", async () => {
    const initialize = vi.fn().mockResolvedValue({ status: "ready", inClient: true });
    await expect(resolveSuwapuyoLiff("123-test", initialize, vi.fn().mockResolvedValue(false))).resolves.toEqual({ status: "friendship_required", inClient: true });
    await expect(resolveSuwapuyoLiff("123-test", initialize, vi.fn().mockResolvedValue(true))).resolves.toEqual({ status: "ready", inClient: true });
  });

  it("exposes safe error codes instead of SDK messages", () => {
    expect(normalizeLiffError("liff_sdk_load_failed")).toBe("sdk_load_failed");
    expect(normalizeLiffError("liff_init_timeout")).toBe("init_timeout");
    expect(normalizeLiffError("unexpected secret-looking response")).toBe("init_failed");
  });
});
