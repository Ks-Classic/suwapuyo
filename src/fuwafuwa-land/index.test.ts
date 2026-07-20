import { describe, expect, it } from "vitest";
import { readStaffTab } from "./staffRouting";

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
});
