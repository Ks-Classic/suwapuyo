// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TAISOU_MISSION_INTERVAL_MS, useTaisouMissionTimer } from "./useTaisouMissionTimer";

function Harness({ enabled, onTrigger }: { enabled: boolean; onTrigger: () => void }) {
  useTaisouMissionTimer(enabled, onTrigger);
  return null;
}

describe("useTaisouMissionTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("fires at 60 seconds, not before", () => {
    const onTrigger = vi.fn();
    render(<Harness enabled onTrigger={onTrigger} />);
    act(() => vi.advanceTimersByTime(TAISOU_MISSION_INTERVAL_MS - 1));
    expect(onTrigger).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("pauses while disabled and restarts a full interval when play resumes", () => {
    const onTrigger = vi.fn();
    const view = render(<Harness enabled onTrigger={onTrigger} />);
    act(() => vi.advanceTimersByTime(20_000));
    view.rerender(<Harness enabled={false} onTrigger={onTrigger} />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(onTrigger).not.toHaveBeenCalled();
    view.rerender(<Harness enabled onTrigger={onTrigger} />);
    act(() => vi.advanceTimersByTime(59_999));
    expect(onTrigger).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onTrigger).toHaveBeenCalledOnce();
  });
});
