import { useEffect, useState } from "react";
import type { Artwork, ArtworkRepository, DisplayStateService } from "../types";
import { isSampleCharacterId } from "../renderer/sampleCharacters";

interface ArtworkListProps {
  artworks: Artwork[];
  repository: ArtworkRepository;
  displayState: DisplayStateService;
  onRefresh: () => void;
}

interface ArtworkThumbnailProps {
  artwork: Artwork;
  repository: ArtworkRepository;
}

interface ThumbnailState {
  artworkId: string;
  imageUrl: string | null;
  failed: boolean;
}

function ArtworkThumbnail({ artwork, repository }: ArtworkThumbnailProps) {
  const sample = isSampleCharacterId(artwork.id);
  const [thumbnail, setThumbnail] = useState<ThumbnailState>({ artworkId: artwork.id, imageUrl: null, failed: false });

  useEffect(() => {
    if (sample) {
      return undefined;
    }
    let active = true;
    void repository
      .getImageURL(artwork.id)
      .then((url) => {
        if (active) {
          setThumbnail({ artworkId: artwork.id, imageUrl: url, failed: false });
        }
      })
      .catch(() => {
        if (active) {
          setThumbnail({ artworkId: artwork.id, imageUrl: null, failed: true });
        }
      });
    return () => {
      active = false;
    };
  }, [artwork.id, repository, sample]);

  if (sample) {
    return (
      <div className="fuwafuwa-artwork-thumb" aria-hidden="true">
        <img src={artwork.imageBlobKey} alt="" />
      </div>
    );
  }

  const imageUrl = thumbnail.artworkId === artwork.id ? thumbnail.imageUrl : null;
  const failed = thumbnail.artworkId === artwork.id && thumbnail.failed;

  return (
    <div className="fuwafuwa-artwork-thumb" aria-hidden="true">
      {imageUrl !== null ? <img src={imageUrl} alt="" /> : <span>{failed ? "?" : artwork.displayLabel.slice(-2)}</span>}
    </div>
  );
}

export function ArtworkList({ artworks, repository, displayState, onRefresh }: ArtworkListProps) {
  const [query, setQuery] = useState("");
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const visible = artworks
    .filter((artwork) => artwork.status !== "archived")
    .filter((artwork) => artwork.id.toLowerCase().includes(query.toLowerCase()) || artwork.givenName?.toLowerCase().includes(query.toLowerCase()) === true)
    .slice(0, 80);

  return (
    <section className="fuwafuwa-panel fuwafuwa-list-panel">
      <div className="fuwafuwa-list-head">
        <input value={query} placeholder="ID / 名前検索" onChange={(event) => setQuery(event.currentTarget.value)} />
        <button type="button" onClick={onRefresh}>
          更新
        </button>
      </div>
      <div className="fuwafuwa-artwork-list">
        {visible.map((artwork) => (
          <article key={artwork.id} className="fuwafuwa-artwork-row">
            <div className="fuwafuwa-artwork-identity">
              <ArtworkThumbnail artwork={artwork} repository={repository} />
              <div>
                <strong>{artwork.displayLabel}</strong>
                <span>{artwork.givenName ?? "名前なし"} · {artwork.status}</span>
              </div>
            </div>
            <div className="fuwafuwa-row-actions">
              <button type="button" onClick={() => void displayState.showArtwork(artwork.id, "normal").then(onRefresh)}>
                表示
              </button>
              <button type="button" onClick={() => void displayState.showArtwork(artwork.id, "featured").then(onRefresh)}>
                主役
              </button>
              <button type="button" onClick={() => void displayState.hideArtwork(artwork.id).then(onRefresh)}>
                非表示
              </button>
              <button
                type="button"
                className={confirmArchiveId === artwork.id ? "is-danger" : ""}
                onClick={() => {
                  if (confirmArchiveId !== artwork.id) {
                    setConfirmArchiveId(artwork.id);
                    return;
                  }
                  void displayState.archiveArtwork(artwork.id).then(() => {
                    setConfirmArchiveId(null);
                    onRefresh();
                  });
                }}
              >
                {confirmArchiveId === artwork.id ? "削除する" : "削除"}
              </button>
            </div>
            {isSampleCharacterId(artwork.id) ? null : (
              <label className="fuwafuwa-scale-control">
                <span>サイズ {artwork.displayScale.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={artwork.displayScale}
                  onChange={(event) => {
                    const scale = Number(event.currentTarget.value);
                    void repository.setDisplayScale(artwork.id, scale).then(onRefresh);
                  }}
                />
              </label>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
