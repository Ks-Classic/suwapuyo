import { useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type { TappableSponsor } from "../config";
import { track } from "../lib/track";

interface SponsorPopupProps {
  sponsor: TappableSponsor | null;
  onClose: () => void;
}

const SWIPE_THRESHOLD_PX = 48;

export function SponsorPopup({ sponsor, onClose }: SponsorPopupProps) {
  if (sponsor === null) {
    return null;
  }

  return <SponsorPopupContent key={sponsor.id} sponsor={sponsor} onClose={onClose} />;
}

interface SponsorPopupContentProps {
  sponsor: TappableSponsor;
  onClose: () => void;
}

function SponsorPopupContent({ sponsor, onClose }: SponsorPopupContentProps) {
  const [index, setIndex] = useState(0);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const slides = useMemo(() => sponsor.slides.filter((slide) => !failedSrcs.has(slide.src)), [failedSrcs, sponsor.slides]);
  const activeIndex = Math.min(index, Math.max(0, slides.length - 1));

  useEffect(() => {
    track("popup_open", sponsor.id);
  }, [sponsor]);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }
    track("slide", sponsor.id, { index: activeIndex });
  }, [activeIndex, slides.length, sponsor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const moveTo = (nextIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    setIndex(clampedIndex);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setDragStartX(event.clientX);
    setDragOffsetX(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX === null) {
      return;
    }
    setDragOffsetX(event.clientX - dragStartX);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX === null) {
      return;
    }
    const offset = event.clientX - dragStartX;
    if (offset <= -SWIPE_THRESHOLD_PX) {
      moveTo(activeIndex + 1);
    } else if (offset >= SWIPE_THRESHOLD_PX) {
      moveTo(activeIndex - 1);
    }
    setDragStartX(null);
    setDragOffsetX(0);
  };

  const activeSlide = slides[activeIndex];
  const canMovePrevious = activeIndex > 0;
  const canMoveNext = activeIndex < slides.length - 1;
  const swipeHandlers =
    activeSlide?.kind === "video"
      ? {}
      : {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: () => {
            setDragStartX(null);
            setDragOffsetX(0);
          },
        };

  return (
    <div className="fuwafuwa-sponsor-overlay" role="presentation" onClick={onClose}>
      <section className="fuwafuwa-sponsor-card" role="dialog" aria-modal="true" aria-label={sponsor.name} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="fuwafuwa-sponsor-close" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
        <h2>{sponsor.name}</h2>
        <div
          className="fuwafuwa-sponsor-carousel"
          {...swipeHandlers}
        >
          {activeSlide?.kind === "video" ? (
            <video
              key={activeSlide.src}
              src={activeSlide.src}
              aria-label={activeSlide.alt ?? sponsor.name}
              autoPlay
              controls
              muted
              playsInline
              preload="metadata"
              onError={() => {
                setFailedSrcs((current) => new Set(current).add(activeSlide.src));
              }}
            />
          ) : activeSlide !== undefined ? (
            <img
              src={activeSlide.src}
              alt={activeSlide.alt ?? sponsor.name}
              style={{ transform: `translateX(${dragOffsetX}px)` }}
              onError={() => {
                setFailedSrcs((current) => new Set(current).add(activeSlide.src));
              }}
            />
          ) : (
            <div className="fuwafuwa-sponsor-empty">NO SLIDES</div>
          )}
          {slides.length > 1 ? (
            <>
              <button type="button" className="fuwafuwa-sponsor-arrow is-prev" aria-label="前のスライド" disabled={!canMovePrevious} onClick={() => moveTo(activeIndex - 1)}>
                ‹
              </button>
              <button type="button" className="fuwafuwa-sponsor-arrow is-next" aria-label="次のスライド" disabled={!canMoveNext} onClick={() => moveTo(activeIndex + 1)}>
                ›
              </button>
            </>
          ) : null}
        </div>
        {slides.length > 1 ? (
          <div className="fuwafuwa-sponsor-dots" aria-label="スライド選択">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.src}
                type="button"
                className={slideIndex === activeIndex ? "is-active" : undefined}
                aria-label={`${slideIndex + 1}枚目`}
                aria-current={slideIndex === activeIndex ? "true" : undefined}
                onClick={() => moveTo(slideIndex)}
              />
            ))}
          </div>
        ) : null}
        {sponsor.body !== undefined ? <p>{sponsor.body}</p> : null}
        {sponsor.cta !== undefined && sponsor.cta !== null ? (
          <button
            type="button"
            className="fuwafuwa-sponsor-cta"
            onClick={() => {
              track("cta_click", sponsor.id);
              window.open(sponsor.cta?.url, "_blank", "noopener,noreferrer");
            }}
          >
            {sponsor.cta.label}
          </button>
        ) : null}
      </section>
    </div>
  );
}
