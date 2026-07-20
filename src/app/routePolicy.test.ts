import { describe, expect, it } from "vitest";
import { isRetiredDemoPath } from "./routePolicy";

describe("isRetiredDemoPath", () => {
  it.each(["/line", "/concierge/staff", "/report/demo", "/legacy/game", "/shorts-studio", "/map", "/fuwafuwa/staff", "/debug"])(
    "retires %s",
    (pathname) => expect(isRetiredDemoPath(pathname)).toBe(true),
  );

  it.each(["/", "/play", "/village/map", "/reports/exhibitors/id", "/staff"])(
    "keeps %s",
    (pathname) => expect(isRetiredDemoPath(pathname)).toBe(false),
  );
});
