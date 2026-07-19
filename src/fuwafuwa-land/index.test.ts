import { describe, expect, it } from "vitest";
import { readStaffTab } from "./staffRouting";

describe("readStaffTab", () => {
  it.each([
    ["/staff", "", "home"],
    ["/staff/artworks", "", "artworks"],
    ["/staff/land", "", "land"],
    ["/staff/drawing", "", "drawing"],
    ["/staff/drawing-settings", "", "drawing"],
    ["/fuwafuwa/staff/devices", "", "devices"],
    ["/", "#/fuwafuwa/staff/land", "land"],
    ["/staff/unknown", "", "home"],
  ])("maps pathname=%s hash=%s to %s", (pathname, hash, expected) => {
    expect(readStaffTab(pathname, hash)).toBe(expected);
  });
});
