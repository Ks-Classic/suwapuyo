// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DigitalCanvas } from "./DigitalCanvas";

describe("DigitalCanvas undo and resize", () => {
  let resizeCallback: ResizeObserverCallback;
  const imageData = { width: 300, height: 400, data: new Uint8ClampedArray() } as ImageData;
  const context = {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    lineCap: "round",
    lineJoin: "round",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resizeCallback = vi.fn();
    class ResizeObserverStub {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 300,
      height: 400,
      top: 0,
      right: 300,
      bottom: 400,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clear後のundoで絵を復元したらresizeしてもcanvasを再初期化しない", () => {
    render(<DigitalCanvas width={900} height={1200} onComplete={vi.fn()} />);
    const canvas = screen.getByLabelText("お絵描きする場所") as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(screen.getByRole("button", { name: "できた！" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "ぜんぶ消す" }));
    expect(screen.getByRole("button", { name: "できた！" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "ひとつ前にもどす" }));

    expect(context.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    expect(screen.getByRole("button", { name: "できた！" })).toBeEnabled();
    const widthBeforeResize = canvas.width;
    resizeCallback([], {} as ResizeObserver);
    expect(canvas.width).toBe(widthBeforeResize);
  });

  it("最初の線をundoして空に戻したら完了不可になりresizeできる", () => {
    render(<DigitalCanvas width={900} height={1200} onComplete={vi.fn()} />);
    const canvas = screen.getByLabelText("お絵描きする場所") as HTMLCanvasElement;

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "ひとつ前にもどす" }));

    expect(screen.getByRole("button", { name: "できた！" })).toBeDisabled();
    canvas.width = 1;
    resizeCallback([], {} as ResizeObserver);
    expect(canvas.width).toBe(300);
  });
});
