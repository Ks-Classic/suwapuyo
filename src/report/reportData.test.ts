import { describe, expect, it } from "vitest";
import { MIN_REPORT_CELL_SIZE, formatAggregateCount, isSuppressedAggregate } from "./reportData";

describe("出展者レポートの少数セル秘匿", () => {
  it.each([1, 2, 3, 4])("%i人のセルを秘匿する", (value) => {
    expect(isSuppressedAggregate(value)).toBe(true);
    expect(formatAggregateCount(value)).toBe(`${MIN_REPORT_CELL_SIZE}未満`);
  });

  it.each([0, 5, 18])("%i人は集計値として表示できる", (value) => {
    expect(isSuppressedAggregate(value)).toBe(false);
    expect(formatAggregateCount(value)).toBe(String(value));
  });
});
