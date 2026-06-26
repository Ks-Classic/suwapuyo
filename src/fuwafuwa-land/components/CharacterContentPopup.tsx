import { useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type { CharacterContentBundle, CharacterContentRepository, TapContentItem } from "../types";

interface CharacterContentPopupProps {
  bundle: CharacterContentBundle | null;
  repository: CharacterContentRepository;
  onClose: () => void;
}

type PublishedBundle = CharacterContentBundle & { content: NonNullable<CharacterContentBundle["content"]> };

const SWIPE_THRESHOLD_PX = 48;

function hasVideo(item: TapContentItem | undefined): boolean {
  return item?.videoPath !== undefined;
}

function hasMedia(item: TapContentItem): boolean {
  return item.imagePath !== undefined || item.videoPath !== undefined || item.audioPath !== undefined;
}

export function CharacterContentPopup({ bundle, repository, onClose }: CharacterContentPopupProps) {
  if (bundle === null || bundle.content === null) {
    return null;
  }
  return <CharacterContentPopupContent key={`${bundle.character.id}-${bundle.content.id}`} bundle={bundle as PublishedBundle} repository={repository} onClose={onClose} />;
}

interface CharacterContentPopupContentProps {
  bundle: PublishedBundle;
  repository: CharacterContentRepository;
  onClose: () => void;
}

function CharacterContentPopupContent({ bundle, repository, onClose }: CharacterContentPopupContentProps) {
  const [index, setIndex] = useState(0);
  const [failedPaths, setFailedPaths] = useState<Set<string>>(() => new Set());
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const items = useMemo(
    () => bundle.items.filter((item) => hasMedia(item) && ![item.imagePath, item.videoPath, item.audioPath].some((path) => path !== undefined && failedPaths.has(path))),
    [bundle.items, failedPaths],
  );
  const activeIndex = Math.min(index, Math.max(0, items.length - 1));
  const activeItem = items[activeIndex];
  const canMovePrevious = activeIndex > 0;
  const canMoveNext = activeIndex < items.length - 1;

  useEffect(() => {
    void repository.track({
      type: "popup_open",
      characterId: bundle.character.id,
      tapContentId: bundle.content?.id,
      meta: { sourceType: bundle.character.sourceType },
    });
  }, [bundle.character.id, bundle.character.sourceType, bundle.content?.id, repository]);

  useEffect(() => {
    if (activeItem === undefined) {
      return;
    }
    void repository.track({
      type: "item_view",
      characterId: bundle.character.id,
      tapContentId: bundle.content?.id,
      itemId: activeItem.id,
      meta: { index: activeIndex, sourceType: bundle.character.sourceType },
    });
  }, [activeIndex, activeItem, bundle.character.id, bundle.character.sourceType, bundle.content?.id, repository]);

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
    setIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
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

  const swipeHandlers =
    hasVideo(activeItem)
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

  const markFailed = (path: string | undefined) => {
    if (path !== undefined) {
      setFailedPaths((current) => new Set(current).add(path));
    }
  };

  return (
    <div className="fuwafuwa-sponsor-overlay" role="presentation" onClick={onClose}>
      <section className="fuwafuwa-sponsor-card" role="dialog" aria-modal="true" aria-label={bundle.content.title} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="fuwafuwa-sponsor-close" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
        <h2>{bundle.content.title}</h2>
        <div className="fuwafuwa-sponsor-carousel fuwafuwa-content-carousel" {...swipeHandlers}>
          {activeItem !== undefined ? (
            <div className="fuwafuwa-content-slide" style={{ transform: `translateX(${dragOffsetX}px)` }}>
              {activeItem.imagePath !== undefined ? (
                <img src={repository.getMediaPublicUrl(activeItem.imagePath)} alt={activeItem.alt ?? activeItem.title ?? bundle.content.title} onError={() => markFailed(activeItem.imagePath)} />
              ) : null}
              {activeItem.videoPath !== undefined ? (
                <video
                  key={activeItem.videoPath}
                  src={repository.getMediaPublicUrl(activeItem.videoPath)}
                  aria-label={activeItem.alt ?? activeItem.title ?? bundle.content.title}
                  autoPlay
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  onError={() => markFailed(activeItem.videoPath)}
                />
              ) : null}
              {activeItem.audioPath !== undefined ? (
                <audio
                  controls
                  src={repository.getMediaPublicUrl(activeItem.audioPath)}
                  onPlay={() => void repository.track({ type: "audio_play", characterId: bundle.character.id, tapContentId: bundle.content?.id, itemId: activeItem.id, meta: { index: activeIndex } })}
                  onError={() => markFailed(activeItem.audioPath)}
                />
              ) : null}
              {activeItem.caption !== undefined ? <p>{activeItem.caption}</p> : null}
            </div>
          ) : (
            <div className="fuwafuwa-sponsor-empty">NO CONTENT</div>
          )}
          {items.length > 1 ? (
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
        {items.length > 1 ? (
          <div className="fuwafuwa-sponsor-dots" aria-label="スライド選択">
            {items.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                className={itemIndex === activeIndex ? "is-active" : undefined}
                aria-label={`${itemIndex + 1}枚目`}
                aria-current={itemIndex === activeIndex ? "true" : undefined}
                onClick={() => moveTo(itemIndex)}
              />
            ))}
          </div>
        ) : null}
        {bundle.content.body !== undefined ? <p>{bundle.content.body}</p> : null}
        {bundle.content.ctaLabel !== undefined && bundle.content.ctaUrl !== undefined ? (
          <button
            type="button"
            className="fuwafuwa-sponsor-cta"
            onClick={() => {
              void repository.track({ type: "cta_click", characterId: bundle.character.id, tapContentId: bundle.content?.id });
              window.open(bundle.content?.ctaUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {bundle.content.ctaLabel}
          </button>
        ) : null}
      </section>
    </div>
  );
}
