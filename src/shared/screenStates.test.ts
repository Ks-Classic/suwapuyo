import { describe, expect, it } from "vitest";
import { DISPLAY_STATES, SCREEN_STATE_MATRIX } from "./screenStates";

describe("MVP screen state matrix", () => {
  it("defines every common display state for every required screen", () => {
    for (const rows of Object.values(SCREEN_STATE_MATRIX)) {
      expect(rows.map((row) => row.state)).toEqual(DISPLAY_STATES);
      expect(rows.every((row) => row.behavior.length > 0)).toBe(true);
    }
  });
});
