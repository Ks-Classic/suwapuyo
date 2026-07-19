import { useEffect, useRef, useState } from "react";
import { canvasToBlob } from "../utils/image";

interface DigitalCanvasProps {
  width: number;
  height: number;
  onComplete: (blob: Blob, width: number, height: number) => void;
}

const COLORS = ["#202124", "#e84855", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf", "#ffffff"];
const SIZES = [8, 16, 28];

interface UndoSnapshot {
  imageData: ImageData;
  hasInk: boolean;
}

export function DigitalCanvas({ width, height, onComplete }: DigitalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const drawingSizeRef = useRef({ width, height });
  const hasInkRef = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const workspace = workspaceRef.current;
    if (canvas === null || workspace === null) {
      return;
    }

    const resizeCanvas = (): void => {
      if (hasInkRef.current) return;
      const rect = workspace.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(nextWidth * dpr);
      canvas.height = Math.round(nextHeight * dpr);
      drawingSizeRef.current = { width: nextWidth, height: nextHeight };
      const ctx = canvas.getContext("2d");
      if (ctx !== null) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(workspace);
    resizeCanvas();
    return () => observer.disconnect();
  }, [height, width]);

  function pushUndo(): void {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas === null || ctx === null || ctx === undefined) {
      return;
    }
    undoStackRef.current = [
      ...undoStackRef.current.slice(-9),
      { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), hasInk: hasInkRef.current },
    ];
  }

  function pointFromClientPosition(clientX: number, clientY: number, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const drawingSize = drawingSizeRef.current;
    return {
      x: (clientX - rect.left) * (drawingSize.width / rect.width),
      y: (clientY - rect.top) * (drawingSize.height / rect.height),
    };
  }

  function markHasInk(): void {
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  }

  function drawTo(point: { x: number; y: number }): void {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const last = lastPointRef.current;
    if (ctx === null || ctx === undefined || last === null) {
      return;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    markHasInk();
  }

  function drawDot(point: { x: number; y: number }): void {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx === null || ctx === undefined) {
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    markHasInk();
  }

  async function complete(): Promise<void> {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    if (!hasInk) {
      return;
    }
    const blob = await canvasToBlob(canvas, "image/png");
    onComplete(blob, drawingSizeRef.current.width, drawingSizeRef.current.height);
  }

  return (
    <div className="fuwafuwa-digital-canvas">
      <div ref={workspaceRef} className="fuwafuwa-canvas-workspace">
        <canvas
          ref={canvasRef}
          aria-label="お絵描きする場所"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pushUndo();
            drawingRef.current = true;
            const point = pointFromClientPosition(event.clientX, event.clientY, event.currentTarget);
            lastPointRef.current = point;
            drawDot(point);
          }}
          onPointerMove={(event) => {
            if (drawingRef.current) {
              const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
              for (const sample of samples) {
                drawTo(pointFromClientPosition(sample.clientX, sample.clientY, event.currentTarget));
              }
            }
          }}
          onPointerUp={() => {
            drawingRef.current = false;
            lastPointRef.current = null;
          }}
          onPointerCancel={() => {
            drawingRef.current = false;
            lastPointRef.current = null;
          }}
          onPointerLeave={() => {
            drawingRef.current = false;
            lastPointRef.current = null;
          }}
        />
      </div>
      <div className="fuwafuwa-draw-toolbar">
        <div className="fuwafuwa-palette" aria-label="色">
          {COLORS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`色 ${item}`}
              onClick={() => setColor(item)}
              style={{
                border: item === color ? "3px solid #17324d" : "1px solid #9aa",
                background: item,
              }}
            />
          ))}
        </div>
        <div className="fuwafuwa-brush-row" aria-label="線の太さと操作">
        {SIZES.map((item) => (
          <button key={item} type="button" onClick={() => setSize(item)} className={`fuwafuwa-brush-size ${item === size ? "is-active" : ""}`} aria-label={item === 8 ? "細い線" : item === 16 ? "中くらいの線" : "太い線"}>
            <i aria-hidden="true" style={{ width: item, height: item }} />
            <span>{item === 8 ? "細" : item === 16 ? "中" : "太"}</span>
          </button>
        ))}
        <button
          type="button"
          className="fuwafuwa-icon-action"
          aria-label="ひとつ前にもどす"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            const snapshot = undoStackRef.current.pop();
            if (ctx !== null && ctx !== undefined && snapshot !== undefined) {
              ctx.putImageData(snapshot.imageData, 0, 0);
              // snapshotの実状態をref/stateの両方へ戻し、ResizeObserverと完了可否を一致させる。
              hasInkRef.current = snapshot.hasInk;
              setHasInk(snapshot.hasInk);
            }
          }}
        >
          <span aria-hidden="true">↶</span><small>もどす</small>
        </button>
        <button
          type="button"
          className="fuwafuwa-icon-action"
          aria-label="ぜんぶ消す"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas !== null && ctx !== null && ctx !== undefined) {
              pushUndo();
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              hasInkRef.current = false;
              setHasInk(false);
            }
          }}
        >
          <span aria-hidden="true">⌫</span><small>ぜんぶ<br />けす</small>
        </button>
        <button type="button" onClick={() => void complete()} disabled={!hasInk} className="fuwafuwa-primary-action fuwafuwa-complete-button">
          できた！
        </button>
        </div>
      </div>
    </div>
  );
}
