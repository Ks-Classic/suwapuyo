import { useEffect, useRef, useState } from "react";
import { canvasToBlob } from "../utils/image";

interface DigitalCanvasProps {
  width: number;
  height: number;
  onComplete: (blob: Blob, width: number, height: number) => void;
}

const COLORS = ["#202124", "#e84855", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf", "#ffffff"];
const SIZES = [8, 16, 28];

export function DigitalCanvas({ width, height, onComplete }: DigitalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [height, width]);

  function pushUndo(): void {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas === null || ctx === null || ctx === undefined) {
      return;
    }
    setUndoStack((current) => [...current.slice(-9), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
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
    setHasInk(true);
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
    setHasInk(true);
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
    onComplete(blob, canvas.width, canvas.height);
  }

  return (
    <div className="fuwafuwa-digital-canvas">
      <div className="fuwafuwa-palette" aria-label="色">
        {COLORS.map((item) => (
          <button
            key={item}
            type="button"
            aria-label={`color ${item}`}
            onClick={() => setColor(item)}
            style={{
              border: item === color ? "3px solid #222" : "1px solid #9aa",
              background: item,
            }}
          />
        ))}
      </div>
      <div className="fuwafuwa-brush-row">
        {SIZES.map((item) => (
          <button key={item} type="button" onClick={() => setSize(item)} className={item === size ? "is-active" : ""}>
            {item === 8 ? "細" : item === 16 ? "中" : "太"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            const snapshot = undoStack.at(-1);
            if (ctx !== null && ctx !== undefined && snapshot !== undefined) {
              ctx.putImageData(snapshot, 0, 0);
              setUndoStack((current) => current.slice(0, -1));
              setHasInk(true);
            }
          }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas !== null && ctx !== null && ctx !== undefined) {
              pushUndo();
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              setHasInk(false);
            }
          }}
        >
          Clear
        </button>
        <button type="button" onClick={() => void complete()} disabled={!hasInk} className="fuwafuwa-primary-action">
          プレビューへ
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pushUndo();
          drawingRef.current = true;
          const point = pointFromEvent(event);
          lastPointRef.current = point;
          drawDot(point);
        }}
        onPointerMove={(event) => {
          if (drawingRef.current) {
            drawTo(pointFromEvent(event));
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
        style={{ width, height }}
      />
    </div>
  );
}
