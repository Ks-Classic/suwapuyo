import { describe, expect, it } from "vitest";
import { resolveProductSurface } from "./productRoutes";

describe("product route ownership", () => {
  it.each(["/fuwafuwa", "/fuwafuwa/draw", "/staff", "/staff/artworks", "/staff/land", "/staff/devices", "/display"])(
    "owns %s by fuwafuwa-land",
    (pathname) => expect(resolveProductSurface(pathname)).toBe("fuwafuwa-land"),
  );

  it.each(["/", "/play", "/exercise/mouth", "/progress", "/missions", "/village/booths", "/events/yourtime/check-in", "/claim"])(
    "owns %s by suwapuyo",
    (pathname) => expect(resolveProductSurface(pathname)).toBe("suwapuyo"),
  );

  it.each(["/fuwafuwa/staff", "/fuwafuwa/display", "/legacy/game", "/line", "/concierge"])(
    "keeps retired path %s in the suwapuyo retirement screen",
    (pathname) => expect(resolveProductSurface(pathname)).toBe("suwapuyo"),
  );

  it("does not treat an unrelated staff-like path as land", () => {
    expect(resolveProductSurface("/staffing")).toBe("suwapuyo");
  });
});
