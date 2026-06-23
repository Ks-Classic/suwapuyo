import { useEffect, useRef, useState } from "react";
import { SUUSUU_CONFIG } from "../config";
import { FuwafuwaWorld } from "../renderer/FuwafuwaWorld";
import type { Artwork, ConnectionStatus, DisplayState, FuwafuwaServices, MetricsSnapshot } from "../types";
import { MetricsOverlay } from "./MetricsOverlay";

interface DisplayScreenProps {
  services: FuwafuwaServices;
  debug?: boolean;
}

const INITIAL_STATE: DisplayState = {
  id: "current",
  visibleArtworkIds: [],
  mode: "idle",
  maxVisibleCount: 12,
  updatedAt: new Date(0).toISOString(),
};

function sortByDisplayState(artworks: Artwork[], visibleArtworkIds: string[]): Artwork[] {
  const unique = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const visibleOrder = new Map(visibleArtworkIds.map((id, index) => [id, index]));
  return [...unique.values()].sort((left, right) => {
    const leftOrder = visibleOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = visibleOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

interface MemoryWithPerformance extends Performance {
  memory?: { usedJSHeapSize: number };
}

export function DisplayScreen({ services, debug = false }: DisplayScreenProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<FuwafuwaWorld | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [displayState, setDisplayState] = useState<DisplayState>(INITIAL_STATE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [fps, setFps] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<{ usage?: number; quota?: number }>({});
  const [worldReady, setWorldReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return undefined;
    }
    let active = true;
    const nextWorld = new FuwafuwaWorld(SUUSUU_CONFIG);
    void nextWorld.mount(host).then(() => {
      if (!active) {
        nextWorld.destroy();
        return;
      }
      worldRef.current = nextWorld;
      nextWorld.onFps(setFps);
      setWorldReady(true);
    });
    return () => {
      active = false;
      setWorldReady(false);
      nextWorld.destroy();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    void Promise.all([services.repository.list(), services.displayState.getDisplayState()])
      .then(([loadedArtworks, loadedState]) => {
        setArtworks(loadedArtworks);
        setDisplayState(loadedState);
      })
      .catch(() => {
        setConnectionStatus("error");
      });
    const artworkSub = services.repository.subscribeArtworkChanges(
      (artwork) => setArtworks((current) => [artwork, ...current.filter((item) => item.id !== artwork.id)]),
      setConnectionStatus,
    );
    const stateSub = services.displayState.subscribeDisplayState(setDisplayState, setConnectionStatus);
    return () => {
      void artworkSub.unsubscribe();
      void stateSub.unsubscribe();
    };
  }, [services.displayState, services.repository]);

  useEffect(() => {
    if (!worldReady) {
      return;
    }
    void worldRef.current?.sync(artworks, displayState, (id) => services.repository.getImageURL(id));
  }, [artworks, displayState, services.repository, worldReady]);

  useEffect(() => {
    let active = true;
    const missingIds = displayState.visibleArtworkIds.filter((id) => !artworks.some((artwork) => artwork.id === id));
    if (missingIds.length === 0) {
      return undefined;
    }
    void Promise.all(missingIds.map((id) => services.repository.getById(id))).then((loaded) => {
      if (!active) {
        return;
      }
      const found = loaded.filter((artwork): artwork is Artwork => artwork !== null);
      if (found.length > 0) {
        setArtworks((current) => sortByDisplayState([...found, ...current], displayState.visibleArtworkIds));
      }
    });
    return () => {
      active = false;
    };
  }, [artworks, displayState.visibleArtworkIds, services.repository]);

  const metrics: MetricsSnapshot = {
    fps,
    artworkCount: artworks.length,
    visibleCount: displayState.visibleArtworkIds.length,
    connectionStatus,
    storageUsageBytes: storageEstimate.usage,
    storageQuotaBytes: storageEstimate.quota,
    heapUsedBytes: (performance as MemoryWithPerformance).memory?.usedJSHeapSize,
  };

  useEffect(() => {
    let active = true;
    const update = async () => {
      const estimate = await navigator.storage?.estimate?.();
      if (active && estimate !== undefined) {
        setStorageEstimate({ usage: estimate.usage, quota: estimate.quota });
      }
    };
    void update();
    return () => {
      active = false;
    };
  }, [artworks.length]);

  return (
    <main className="fuwafuwa-display">
      <nav className="fuwafuwa-display-links" aria-label="画面移動">
        <a href="/">ホーム</a>
        <a href="/staff">スタッフ</a>
      </nav>
      <div ref={hostRef} className="fuwafuwa-world" />
      {debug ? (
        <div className="fuwafuwa-html-layer">
          {displayState.visibleArtworkIds.map((id, index) => {
          const artwork = artworks.find((item) => item.id === id);
          const left = 18 + ((index * 23) % 64);
          const top = 22 + ((index * 31) % 52);
          return (
            <figure
              key={id}
              className={displayState.featuredArtworkId === id ? "fuwafuwa-float-card is-featured" : "fuwafuwa-float-card"}
              style={{
                left: `clamp(140px, ${left}%, calc(100vw - 140px))`,
                top: `clamp(150px, ${top}%, calc(100vh - 150px))`,
                animationDelay: `${index * -0.7}s`,
              }}
            >
              <div className="fuwafuwa-card-fallback">{artwork?.displayLabel ?? id}</div>
              <figcaption>{artwork?.givenName ?? artwork?.displayLabel ?? id}</figcaption>
            </figure>
          );
          })}
        </div>
      ) : null}
      {displayState.visibleArtworkIds.length === 0 ? <div className="fuwafuwa-empty">WAITING FOR ARTWORKS</div> : null}
      <MetricsOverlay metrics={metrics} />
    </main>
  );
}
