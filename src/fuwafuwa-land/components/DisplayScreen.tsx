import { useEffect, useMemo, useRef, useState } from "react";
import { SUUSUU_CONFIG } from "../config";
import { FuwafuwaWorld } from "../renderer/FuwafuwaWorld";
import type { Artwork, CharacterContentBundle, ConnectionStatus, DisplayCharacter, DisplayState, FuwafuwaServices, MetricsSnapshot } from "../types";
import { CharacterContentPopup } from "./CharacterContentPopup";
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
  displayEvent: null,
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

function artworkFromCharacter(character: DisplayCharacter, artwork?: Artwork): Artwork {
  if (artwork !== undefined) {
    return {
      ...artwork,
      displayLabel: character.label,
      givenName: character.label,
      status: character.status === "visible" ? "visible" : character.status,
      displayScale: character.displayScale,
    };
  }
  return {
    id: character.id,
    displayLabel: character.label,
    givenName: character.label,
    source: "digital",
    imageBlobKey: character.imagePath,
    width: 1,
    height: 1,
    displayScale: character.displayScale,
    status: character.status === "visible" ? "visible" : character.status,
    consentScope: "unknown",
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
    showCount: 0,
  };
}

function stateFromCharacters(base: DisplayState, characters: DisplayCharacter[] | null): DisplayState {
  if (characters === null) {
    return base;
  }
  const visibleArtworkIds = characters.filter((character) => character.status === "visible").map((character) => character.id);
  return {
    ...base,
    visibleArtworkIds,
    featuredArtworkId: base.featuredArtworkId !== undefined && visibleArtworkIds.includes(base.featuredArtworkId) ? base.featuredArtworkId : undefined,
    maxVisibleCount: Math.max(1, Math.min(30, visibleArtworkIds.length)),
  };
}

export function DisplayScreen({ services, debug = false }: DisplayScreenProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<FuwafuwaWorld | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [displayCharacters, setDisplayCharacters] = useState<DisplayCharacter[] | null>(null);
  const [displayState, setDisplayState] = useState<DisplayState>(INITIAL_STATE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [fps, setFps] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<{ usage?: number; quota?: number }>({});
  const [worldReady, setWorldReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeContent, setActiveContent] = useState<CharacterContentBundle | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

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
      nextWorld.onCharacterTap((characterId) => {
        void services.characterContent
          .track({ type: "tap", characterId })
          .catch(() => undefined)
          .then(() => services.characterContent.getCharacterContent(characterId))
          .then((bundle) => {
            if (bundle?.character.tapEnabled === true && bundle.content?.isPublished === true && bundle.items.length > 0) {
              setActiveContent(bundle);
            }
          })
          .catch(() => undefined);
      });
      setWorldReady(true);
    });
    return () => {
      active = false;
      setWorldReady(false);
      nextWorld.destroy();
      worldRef.current = null;
    };
  }, [services.characterContent]);

  useEffect(() => {
    void Promise.all([services.repository.list(), services.displayState.getDisplayState(), services.characterContent.listCharacters()])
      .then(([loadedArtworks, loadedState, loadedCharacters]) => {
        setArtworks(loadedArtworks);
        setDisplayState(loadedState);
        setDisplayCharacters(loadedCharacters);
      })
      .catch(() => {
        setConnectionStatus("error");
      });
    const artworkSub = services.repository.subscribeArtworkChanges(
      (artwork) => setArtworks((current) => [artwork, ...current.filter((item) => item.id !== artwork.id)]),
      setConnectionStatus,
    );
    const stateSub = services.displayState.subscribeDisplayState(setDisplayState, setConnectionStatus);
    const characterSub = services.characterContent.subscribeCharacterChanges(
      (character) =>
        setDisplayCharacters((current) => {
          if (current === null) {
            return [character];
          }
          return [...current.filter((item) => item.id !== character.id), character].sort((left, right) => left.sortOrder - right.sortOrder || Date.parse(left.createdAt) - Date.parse(right.createdAt));
        }),
      setConnectionStatus,
    );
    return () => {
      void artworkSub.unsubscribe();
      void stateSub.unsubscribe();
      void characterSub.unsubscribe();
    };
  }, [services.characterContent, services.displayState, services.repository]);

  const effectiveDisplayState = useMemo(() => stateFromCharacters(displayState, displayCharacters), [displayCharacters, displayState]);
  const worldArtworks = useMemo(() => {
    if (displayCharacters === null) {
      return artworks;
    }
    return displayCharacters
      .filter((character) => character.status !== "archived")
      .map((character) => artworkFromCharacter(character, artworks.find((artwork) => artwork.id === character.sourceId || artwork.id === character.id)));
  }, [artworks, displayCharacters]);

  const visibleActiveContent = useMemo(() => {
    if (activeContent === null || displayCharacters === null) {
      return activeContent;
    }
    const character = displayCharacters.find((item) => item.id === activeContent.character.id);
    return character?.status === "visible" ? activeContent : null;
  }, [activeContent, displayCharacters]);

  useEffect(() => {
    if (!worldReady) {
      return;
    }
    void worldRef.current?.sync(worldArtworks, effectiveDisplayState, (id) => {
      const character = displayCharacters?.find((item) => item.id === id);
      if (character?.sourceType === "artwork") {
        return services.repository.getImageURL(character.sourceId);
      }
      if (character !== undefined) {
        return Promise.resolve(services.characterContent.getMediaPublicUrl(character.imagePath));
      }
      return services.repository.getImageURL(id);
    });
  }, [displayCharacters, effectiveDisplayState, services.characterContent, services.repository, worldArtworks, worldReady]);

  useEffect(() => {
    if (!worldReady) {
      return;
    }
    if (effectiveDisplayState.displayEvent?.type !== "battle") {
      lastEventIdRef.current = null;
      worldRef.current?.stopDisplayEvent();
      return;
    }
    if (lastEventIdRef.current === effectiveDisplayState.displayEvent.id) {
      return;
    }
    lastEventIdRef.current = effectiveDisplayState.displayEvent.id;
    worldRef.current?.startBattleEvent(effectiveDisplayState.displayEvent.id);
  }, [effectiveDisplayState.displayEvent, worldReady]);

  useEffect(() => {
    let active = true;
    const missingIds = effectiveDisplayState.visibleArtworkIds.filter((id) => !artworks.some((artwork) => artwork.id === id));
    if (missingIds.length === 0) {
      return undefined;
    }
    void Promise.all(
      missingIds.map((id) => {
        const character = displayCharacters?.find((item) => item.id === id);
        return services.repository.getById(character?.sourceType === "artwork" ? character.sourceId : id);
      }),
    ).then((loaded) => {
      if (!active) {
        return;
      }
      const found = loaded.filter((artwork): artwork is Artwork => artwork !== null);
      if (found.length > 0) {
        setArtworks((current) => sortByDisplayState([...found, ...current], effectiveDisplayState.visibleArtworkIds));
      }
    });
    return () => {
      active = false;
    };
  }, [artworks, displayCharacters, effectiveDisplayState.visibleArtworkIds, services.repository]);

  const metrics: MetricsSnapshot = {
    fps,
    artworkCount: worldArtworks.length,
    visibleCount: effectiveDisplayState.visibleArtworkIds.length,
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
  }, [worldArtworks.length]);

  return (
    <main className="fuwafuwa-display">
      <nav className="fuwafuwa-display-links" aria-label="画面移動">
        <a href="/">すわぷよ</a>
        <a href="/fuwafuwa">ホーム</a>
        <a href="/staff">スタッフ</a>
      </nav>
      <h1 className="fuwafuwa-display-title">ふわふわランド</h1>
      {!audioUnlocked ? (
        <button
          type="button"
          className="fuwafuwa-audio-unlock"
          onClick={() => {
            void worldRef.current?.unlockAudio().then(setAudioUnlocked);
          }}
        >
          音ON
        </button>
      ) : null}
      <div ref={hostRef} className="fuwafuwa-world" />
      <CharacterContentPopup bundle={visibleActiveContent} repository={services.characterContent} onClose={() => setActiveContent(null)} />
      {debug ? (
        <div className="fuwafuwa-html-layer">
          {effectiveDisplayState.visibleArtworkIds.map((id, index) => {
          const artwork = worldArtworks.find((item) => item.id === id);
          const left = 18 + ((index * 23) % 64);
          const top = 22 + ((index * 31) % 52);
          return (
            <figure
              key={id}
              className={effectiveDisplayState.featuredArtworkId === id ? "fuwafuwa-float-card is-featured" : "fuwafuwa-float-card"}
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
      {effectiveDisplayState.visibleArtworkIds.length === 0 ? <div className="fuwafuwa-empty">WAITING FOR ARTWORKS</div> : null}
      <MetricsOverlay metrics={metrics} />
    </main>
  );
}
