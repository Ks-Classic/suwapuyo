import { describe, expect, it } from "vitest";
import { legacyStaffRedirect, readStaffTab } from "./staffRouting";

describe("readStaffTab", () => {
  it.each([
    ["/staff", "home"],
    ["/staff/artworks", "artworks"],
    ["/staff/land", "land"],
    ["/staff/drawing", "drawing"],
    ["/staff/drawing-settings", "drawing"],
    ["/staff/unknown", "home"],
  ])("maps pathname=%s to %s", (pathname, expected) => {
    expect(readStaffTab(pathname)).toBe(expected);
  });

  it.each([
    ["/fuwafuwa/staff", "", "/staff"],
    ["/fuwafuwa/staff/devices", "", "/staff/devices"],
    ["/", "#/fuwafuwa/staff/land", "/staff/land"],
    ["/staff", "", null],
  ])("canonicalizes legacy pathname=%s hash=%s", (pathname, hash, expected) => {
    expect(legacyStaffRedirect(pathname, hash)).toBe(expected);
  });
});
