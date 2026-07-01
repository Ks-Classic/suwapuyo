import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode } from "react";
import { animate, useMotionValue, useReducedMotion, motion } from "framer-motion";

export interface MapFocusTarget {
  /** コンテンツ座標系でのフォーカス位置（0〜100%） */
  xPercent: number;
  yPercent: number;
  scale: number;
}

export interface MapViewportHandle {
  flyTo: (target: MapFocusTarget) => void;
  zoomBy: (factor: number) => void;
}

interface MapViewportProps {
  contentWidth: number;
  contentHeight: number;
  initialTarget: MapFocusTarget;
  maxScaleMultiplier?: number;
  children: ReactNode;
  className?: string;
  handleRef: React.RefObject<MapViewportHandle | null>;
}

const ZOOM_SLACK = 0.18;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: PointerEvent, b: PointerEvent): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * 会場マップ専用の軽量pan/zoom実装。
 * react-zoom-pan-pinch等の依存追加を避け、Pointer Events APIで
 * 1本指パン・2本指ピンチ・ホイール・ダブルタップだけを最小実装する。
 * ピンチ/ホイールの拡縮は常にビューポート中心を基準にする（指の中点追従はしない）—
 * 体感差はほぼ無いまま、座標計算のバグ面積を大きく減らせるため。
 */
export function MapViewport({
  contentWidth,
  contentHeight,
  initialTarget,
  maxScaleMultiplier = 3,
  children,
  className,
  handleRef,
}: MapViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(initialTarget.scale);
  const reduced = useReducedMotion();

  const fitScaleRef = useRef(initialTarget.scale); // 横幅フィット(=最小ズーム。全体が見える)
  const coverScaleRef = useRef(initialTarget.scale); // 高さフィル(=初期表示。縦画面を埋める)
  const maxScaleRef = useRef(initialTarget.scale * maxScaleMultiplier);
  const activePointers = useRef(new Map<number, PointerEvent>());
  const panOrigin = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchOrigin = useRef<{ startDist: number; startScale: number } | null>(null);
  const lastTapRef = useRef(0);

  function settle(): void {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const s = clamp(scale.get(), fitScaleRef.current, maxScaleRef.current);
    const scaledWidth = contentWidth * s;
    const scaledHeight = contentHeight * s;
    const slackX = rect.width * ZOOM_SLACK;
    const slackY = rect.height * ZOOM_SLACK;
    const minX = Math.min(0, rect.width - scaledWidth) - slackX;
    const maxX = Math.max(0, rect.width - scaledWidth) + slackX;
    const minY = Math.min(0, rect.height - scaledHeight) - slackY;
    const maxY = Math.max(0, rect.height - scaledHeight) + slackY;
    const targetX = clamp(x.get(), minX, maxX);
    const targetY = clamp(y.get(), minY, maxY);
    const duration = reduced ? 0 : 0.32;
    void animate(scale, s, { duration: reduced ? 0 : 0.18 });
    void animate(x, targetX, { duration });
    void animate(y, targetY, { duration });
  }

  function focusToTransform(target: MapFocusTarget): { x: number; y: number; scale: number } {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    const viewportWidth = rect?.width ?? 0;
    const viewportHeight = rect?.height ?? 0;
    const focusPxX = (target.xPercent / 100) * contentWidth;
    const focusPxY = (target.yPercent / 100) * contentHeight;
    // scale<=0 は「初期フィット表示」の合図。横長マップを縦画面(9:16)で見ると横幅フィットでは
    // 上下に大きな余白が出て違和感が出る。そこで初期は「高さフィル(cover)」で画面を埋め、
    // 横方向のパンで探索させる(Google/Apple Maps体感)。ズームアウトで全体(横幅フィット)にも戻れる。
    const requestedScale = target.scale <= 0 ? coverScaleRef.current : target.scale;
    const nextScale = clamp(requestedScale, fitScaleRef.current, maxScaleRef.current);
    return {
      x: viewportWidth / 2 - focusPxX * nextScale,
      y: viewportHeight / 2 - focusPxY * nextScale,
      scale: nextScale,
    };
  }

  useImperativeHandle(handleRef, () => ({
    flyTo(target: MapFocusTarget) {
      const next = focusToTransform(target);
      const duration = reduced ? 0 : 0.42;
      void animate(x, next.x, { duration, ease: [0.16, 1, 0.3, 1] });
      void animate(y, next.y, { duration, ease: [0.16, 1, 0.3, 1] });
      void animate(scale, next.scale, { duration, ease: [0.16, 1, 0.3, 1] });
    },
    zoomBy(factor: number) {
      zoomAtCenter(factor);
      settle();
    },
  }));

  function zoomAtCenter(factor: number): void {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldScale = scale.get();
    const nextScale = clamp(oldScale * factor, fitScaleRef.current, maxScaleRef.current);
    const ratio = nextScale / oldScale;
    x.set(centerX - (centerX - x.get()) * ratio);
    y.set(centerY - (centerY - y.get()) * ratio);
    scale.set(nextScale);
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return;
    }

    function recomputeFit(): void {
      const rect = viewport!.getBoundingClientRect();
      if (rect.width === 0) {
        return;
      }
      const fitW = rect.width / contentWidth; // 横幅フィット(全体が入る=最小ズーム)
      const cover = Math.max(fitW, rect.height / contentHeight); // 画面を埋める(縦画面対策)
      fitScaleRef.current = fitW;
      coverScaleRef.current = cover;
      // 最大ズームは cover 基準(縦画面では cover が fitW の数倍になるため、
      // fitW×倍率だとブースに寄れなくなる)。
      maxScaleRef.current = cover * maxScaleMultiplier;
    }
    recomputeFit();

    // 初回マウント時、flyTo()を待たずに正しい位置へ即座に配置する(1フレームの飛び防止)。
    const initial = focusToTransform(initialTarget);
    x.set(initial.x);
    y.set(initial.y);
    scale.set(initial.scale);

    function onPointerDown(event: PointerEvent): void {
      viewport!.setPointerCapture(event.pointerId);
      activePointers.current.set(event.pointerId, event);
      if (activePointers.current.size === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          const atFit = scale.get() <= fitScaleRef.current + 0.001;
          void animate(scale, atFit ? Math.min(fitScaleRef.current * 1.9, maxScaleRef.current) : fitScaleRef.current, {
            duration: reduced ? 0 : 0.3,
          });
        }
        lastTapRef.current = now;
        panOrigin.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: x.get(),
          originY: y.get(),
        };
      } else if (activePointers.current.size === 2) {
        panOrigin.current = null;
        const pts = Array.from(activePointers.current.values());
        pinchOrigin.current = { startDist: distance(pts[0], pts[1]), startScale: scale.get() };
      }
    }

    function onPointerMove(event: PointerEvent): void {
      if (!activePointers.current.has(event.pointerId)) {
        return;
      }
      activePointers.current.set(event.pointerId, event);

      if (activePointers.current.size === 2 && pinchOrigin.current !== null) {
        const pts = Array.from(activePointers.current.values());
        const dist = distance(pts[0], pts[1]);
        const ratio = dist / pinchOrigin.current.startDist;
        zoomAtCenter(ratio * (pinchOrigin.current.startScale / scale.get()));
        return;
      }

      const origin = panOrigin.current;
      if (origin !== null && origin.pointerId === event.pointerId && activePointers.current.size === 1) {
        x.set(origin.originX + (event.clientX - origin.startX));
        y.set(origin.originY + (event.clientY - origin.startY));
      }
    }

    function onPointerUp(event: PointerEvent): void {
      activePointers.current.delete(event.pointerId);
      if (activePointers.current.size < 2) {
        pinchOrigin.current = null;
      }
      if (activePointers.current.size === 0) {
        panOrigin.current = null;
        settle();
      } else if (activePointers.current.size === 1) {
        const remaining = Array.from(activePointers.current.values())[0];
        panOrigin.current = {
          pointerId: remaining.pointerId,
          startX: remaining.clientX,
          startY: remaining.clientY,
          originX: x.get(),
          originY: y.get(),
        };
      }
    }

    function onWheel(event: WheelEvent): void {
      event.preventDefault();
      zoomAtCenter(event.deltaY < 0 ? 1.08 : 1 / 1.08);
    }

    function onResize(): void {
      recomputeFit();
      settle();
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentWidth, contentHeight, maxScaleMultiplier]);

  return (
    <div ref={viewportRef} className={className} style={{ touchAction: "none", overflow: "hidden", position: "relative" }}>
      <motion.div style={{ x, y, scale, transformOrigin: "0 0", position: "absolute", left: 0, top: 0 }}>{children}</motion.div>
    </div>
  );
}
