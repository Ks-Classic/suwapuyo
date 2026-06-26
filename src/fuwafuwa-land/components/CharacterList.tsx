import { useCallback, useEffect, useState } from "react";
import type {
  ArtworkRepository,
  CharacterContentBundle,
  CharacterContentRepository,
  DisplayCharacter,
  DisplayCharacterSourceType,
  DisplayCharacterStatus,
  TapContentDraft,
  TapContentItemDraft,
  TapContentMediaKind,
} from "../types";

interface CharacterListProps {
  repository: CharacterContentRepository;
  artworkRepository?: ArtworkRepository;
  refreshToken?: number;
}

type StatusFilter = DisplayCharacterStatus | "all";
type SourceFilter = DisplayCharacterSourceType | "all";
type UploadSlot = "imagePath" | "videoPath" | "audioPath";

const MEDIA_SLOT_LABELS: Record<UploadSlot, { label: string; accept: string; help: string }> = {
  imagePath: { label: "画像", accept: "image/png,image/jpeg,image/webp", help: "PNG / JPG / WebP 5MBまで" },
  videoPath: { label: "動画", accept: "video/mp4,video/webm", help: "MP4 / WebM 50MBまで" },
  audioPath: { label: "音声", accept: "audio/mpeg,audio/mp4,audio/wav,audio/webm", help: "MP3 / M4A / WAV / WebM 20MBまで" },
};

const EMPTY_DRAFT: TapContentDraft = {
  title: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  isPublished: false,
};

const EMPTY_ITEM: TapContentItemDraft = {
  sortOrder: 0,
  title: "",
  caption: "",
  imagePath: "",
  videoPath: "",
  audioPath: "",
  alt: "",
  thumbnailPath: "",
};

function statusLabel(status: StatusFilter): string {
  if (status === "visible") {
    return "表示中";
  }
  if (status === "hidden") {
    return "非表示";
  }
  if (status === "archived") {
    return "削除済";
  }
  return "すべて";
}

function sourceLabel(source: SourceFilter): string {
  if (source === "sample") {
    return "サンプル";
  }
  if (source === "artwork") {
    return "登録作品";
  }
  if (source === "sponsor") {
    return "出展者";
  }
  return "全種別";
}

function extensionFromFile(file: File): string {
  const namePart = file.name.split(".").pop();
  if (namePart !== undefined && namePart.length > 0) {
    return namePart;
  }
  const mimePart = file.type.split("/").pop();
  return mimePart ?? "bin";
}

function mediaKindForSlot(slot: UploadSlot): TapContentMediaKind {
  if (slot === "imagePath") {
    return "image";
  }
  if (slot === "videoPath") {
    return "video";
  }
  return "audio";
}

function draftFromBundle(bundle: CharacterContentBundle | null): { draft: TapContentDraft; items: TapContentItemDraft[] } {
  if (bundle?.content === null || bundle?.content === undefined) {
    return { draft: EMPTY_DRAFT, items: [{ ...EMPTY_ITEM }] };
  }
  return {
    draft: {
      title: bundle.content.title,
      body: bundle.content.body ?? "",
      ctaLabel: bundle.content.ctaLabel ?? "",
      ctaUrl: bundle.content.ctaUrl ?? "",
      isPublished: bundle.content.isPublished,
    },
    items: bundle.items.length === 0 ? [{ ...EMPTY_ITEM }] : bundle.items.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      title: item.title ?? "",
      caption: item.caption ?? "",
      imagePath: item.imagePath ?? "",
      videoPath: item.videoPath ?? "",
      audioPath: item.audioPath ?? "",
      alt: item.alt ?? "",
      thumbnailPath: item.thumbnailPath ?? "",
    })),
  };
}

function itemHasContent(item: TapContentItemDraft): boolean {
  return [item.caption, item.imagePath, item.videoPath, item.audioPath].some((value) => value !== undefined && value.trim().length > 0);
}

function pathPreview(repository: CharacterContentRepository, path: string | undefined): string | undefined {
  if (path === undefined || path.trim().length === 0) {
    return undefined;
  }
  return repository.getMediaPublicUrl(path);
}

function mediaPathForSlot(item: TapContentItemDraft, slot: UploadSlot): string | undefined {
  const path = item[slot];
  return path === undefined || path.trim().length === 0 ? undefined : path;
}

function CharacterThumbnail({ character, repository, artworkRepository }: { character: DisplayCharacter; repository: CharacterContentRepository; artworkRepository?: ArtworkRepository }) {
  const directImageUrl = character.sourceType === "artwork" && artworkRepository !== undefined ? undefined : repository.getMediaPublicUrl(character.imagePath);
  const [artworkImage, setArtworkImage] = useState<{ sourceId: string; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (character.sourceType !== "artwork" || artworkRepository === undefined) {
      return () => {
        active = false;
      };
    }
    void artworkRepository
      .getImageURL(character.sourceId)
      .then((url) => {
        if (active) {
          setArtworkImage({ sourceId: character.sourceId, url });
        }
      })
      .catch(() => {
        if (active) {
          setArtworkImage(null);
        }
      });
    return () => {
      active = false;
    };
  }, [artworkRepository, character.sourceId, character.sourceType]);

  const imageUrl = directImageUrl ?? (artworkImage?.sourceId === character.sourceId ? artworkImage.url : "");
  return imageUrl.length > 0 ? <img src={imageUrl} alt="" /> : <span className="fuwafuwa-character-thumb-fallback">{character.label.slice(-2)}</span>;
}

export function CharacterList({ repository, artworkRepository, refreshToken = 0 }: CharacterListProps) {
  const [characters, setCharacters] = useState<DisplayCharacter[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [scaleAll, setScaleAll] = useState(0.6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TapContentDraft>(EMPTY_DRAFT);
  const [items, setItems] = useState<TapContentItemDraft[]>([{ ...EMPTY_ITEM }]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    const filter = {
      query,
      ...(statusFilter === "all" ? {} : { status: statusFilter }),
      ...(sourceFilter === "all" ? {} : { sourceType: sourceFilter }),
    };
    const loaded = await repository.listCharacters(filter);
    setCharacters(loaded);
    if (loaded.length > 0) {
      setScaleAll(loaded[0].displayScale);
    }
  }, [query, repository, sourceFilter, statusFilter]);

  useEffect(() => {
    let active = true;
    const filter = {
      query,
      ...(statusFilter === "all" ? {} : { status: statusFilter }),
      ...(sourceFilter === "all" ? {} : { sourceType: sourceFilter }),
    };
    void repository
      .listCharacters(filter)
      .then((loaded) => {
        if (!active) {
          return;
        }
        setCharacters(loaded);
        if (loaded.length > 0) {
          setScaleAll(loaded[0].displayScale);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "character_load_failed");
        }
      });
    return () => {
      active = false;
    };
  }, [query, refreshToken, repository, sourceFilter, statusFilter]);

  useEffect(() => {
    const subscription = repository.subscribeCharacterChanges(
      () => {
        void loadCharacters();
      },
      () => undefined,
    );
    return () => {
      void subscription.unsubscribe();
    };
  }, [loadCharacters, repository]);

  const selected = selectedId === null ? null : characters.find((character) => character.id === selectedId) ?? null;

  const loadCharacterContent = useCallback((characterId: string): void => {
    setBusyId(characterId);
    void repository
      .getCharacterContent(characterId)
      .then((bundle) => {
        const next = draftFromBundle(bundle);
        setDraft(next.draft);
        setItems(next.items);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "tap_content_load_failed"))
      .finally(() => setBusyId(null));
  }, [repository]);

  useEffect(() => {
    const subscription = repository.subscribeContentChanges(
      () => {
        if (selectedId !== null) {
          loadCharacterContent(selectedId);
        }
      },
      () => undefined,
    );
    return () => {
      void subscription.unsubscribe();
    };
  }, [loadCharacterContent, repository, selectedId]);

  const selectCharacter = (character: DisplayCharacter): void => {
    setSelectedId(character.id);
    loadCharacterContent(character.id);
  };

  const setStatus = (character: DisplayCharacter, status: DisplayCharacterStatus): void => {
    setBusyId(character.id);
    void repository
      .setCharacterStatus(character.id, status)
      .then(loadCharacters)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "status_update_failed"))
      .finally(() => setBusyId(null));
  };

  const updateScaleAll = (scale: number): void => {
    setScaleAll(scale);
    void Promise.all(characters.map((character) => repository.setCharacterDisplayScale(character.id, scale)))
      .then(loadCharacters)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "scale_update_failed"));
  };

  const updateItem = (index: number, patch: Partial<TapContentItemDraft>): void => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const moveItem = (index: number, direction: -1 | 1): void => {
    setItems((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const currentItem = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = currentItem;
      return next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));
    });
  };

  const uploadItemFile = (index: number, slot: UploadSlot, file: File): void => {
    if (selected === null) {
      return;
    }
    setBusyId(selected.id);
    void repository
      .uploadMedia({
        characterId: selected.id,
        kind: mediaKindForSlot(slot),
        file,
        contentType: file.type,
        extension: extensionFromFile(file),
      })
      .then((path) => updateItem(index, { [slot]: path }))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "media_upload_failed"))
      .finally(() => setBusyId(null));
  };

  const clearItemMedia = (index: number, slot: UploadSlot): void => {
    updateItem(index, { [slot]: "" });
  };

  const updateDraftField = <Key extends keyof TapContentDraft>(key: Key, value: TapContentDraft[Key]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveContent = (): void => {
    if (selected === null) {
      return;
    }
    setBusyId(selected.id);
    void repository
      .saveTapContent(
        selected.id,
        draft,
        items.map((item, index) => ({ ...item, sortOrder: index })),
      )
      .then(() => {
        setMessage("保存しました");
        return loadCharacters();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "tap_content_save_failed"))
      .finally(() => setBusyId(null));
  };

  return (
    <section className="fuwafuwa-panel fuwafuwa-character-panel">
      <div className="fuwafuwa-list-head">
        <input value={query} placeholder="キャラ検索" onChange={(event) => setQuery(event.currentTarget.value)} />
        <div className="fuwafuwa-status-filter" role="group" aria-label="表示状態フィルタ">
          {(["all", "visible", "hidden", "archived"] as StatusFilter[]).map((status) => (
            <button key={status} type="button" className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)}>
              {statusLabel(status)}
            </button>
          ))}
        </div>
        <div className="fuwafuwa-status-filter" role="group" aria-label="種別フィルタ">
          {(["all", "sample", "artwork", "sponsor"] as SourceFilter[]).map((source) => (
            <button key={source} type="button" className={sourceFilter === source ? "is-active" : ""} onClick={() => setSourceFilter(source)}>
              {sourceLabel(source)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void loadCharacters()}>
          更新
        </button>
      </div>
      <label className="fuwafuwa-scale-control fuwafuwa-scale-control-wide">
        <span>一覧サイズ {scaleAll.toFixed(1)}x</span>
        <input type="range" min="0.1" max="2.0" step="0.1" value={scaleAll} onChange={(event) => updateScaleAll(Number(event.currentTarget.value))} />
      </label>
      <div className="fuwafuwa-character-workspace">
        <div className="fuwafuwa-character-list">
          {characters.map((character) => (
            <article key={character.id} className={selectedId === character.id ? "fuwafuwa-character-row is-selected" : "fuwafuwa-character-row"}>
              <button type="button" className="fuwafuwa-character-pick" onClick={() => selectCharacter(character)}>
                <CharacterThumbnail character={character} repository={repository} artworkRepository={artworkRepository} />
                <span>
                  <strong>{character.label}</strong>
                  <small>{character.sourceType} · {character.tapEnabled ? "tap設定あり" : "tap未設定"}</small>
                </span>
              </button>
              <div className="fuwafuwa-row-actions fuwafuwa-row-actions-compact">
                <button type="button" className={character.status === "visible" ? "is-active" : ""} disabled={busyId === character.id} onClick={() => setStatus(character, "visible")}>
                  表示
                </button>
                <button type="button" className={character.status === "hidden" ? "is-active" : ""} disabled={busyId === character.id} onClick={() => setStatus(character, "hidden")}>
                  非表示
                </button>
                <button type="button" className={character.status === "archived" ? "is-danger is-active" : "is-danger"} disabled={busyId === character.id} onClick={() => setStatus(character, "archived")}>
                  削除
                </button>
              </div>
              <label className="fuwafuwa-scale-control">
                <span>{character.displayScale.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={character.displayScale}
                  onChange={(event) => {
                    setBusyId(character.id);
                    void repository
                      .setCharacterDisplayScale(character.id, Number(event.currentTarget.value))
                      .then(loadCharacters)
                      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "scale_update_failed"))
                      .finally(() => setBusyId(null));
                  }}
                />
              </label>
            </article>
          ))}
        </div>
        <aside className="fuwafuwa-content-editor">
          <div className="fuwafuwa-panel-title">
            <strong>{selected?.label ?? "タップ時表示"}</strong>
            <span>画像・動画・音声を枠ごとに設定</span>
          </div>
          {selected === null ? (
            <p className="fuwafuwa-message">キャラを選択してください</p>
          ) : (
            <>
              <input value={draft.title} placeholder="タイトル" onChange={(event) => updateDraftField("title", event.currentTarget.value)} />
              <textarea value={draft.body ?? ""} placeholder="本文" onChange={(event) => updateDraftField("body", event.currentTarget.value)} />
              <div className="fuwafuwa-editor-grid">
                <input value={draft.ctaLabel ?? ""} placeholder="CTAラベル" onChange={(event) => updateDraftField("ctaLabel", event.currentTarget.value)} />
                <input value={draft.ctaUrl ?? ""} placeholder="https://..." onChange={(event) => updateDraftField("ctaUrl", event.currentTarget.value)} />
              </div>
              <label className="fuwafuwa-check-row">
                <input type="checkbox" checked={draft.isPublished === true} onChange={(event) => updateDraftField("isPublished", event.currentTarget.checked)} />
                公開
              </label>
              <div className="fuwafuwa-content-items">
                {items.map((item, index) => (
                  <div key={index} className="fuwafuwa-content-item">
                    <div className="fuwafuwa-content-item-head">
                      <strong>枠{index + 1}</strong>
                      <div className="fuwafuwa-row-actions fuwafuwa-row-actions-compact">
                        <button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)}>
                          上
                        </button>
                        <button type="button" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>
                          下
                        </button>
                        <button type="button" className="is-danger" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index).map((nextItem, itemIndex) => ({ ...nextItem, sortOrder: itemIndex })))}>
                          削除
                        </button>
                      </div>
                    </div>
                    <div className="fuwafuwa-editor-grid">
                      <input value={item.title ?? ""} placeholder={`枠${index + 1} タイトル`} onChange={(event) => updateItem(index, { title: event.currentTarget.value })} />
                      <input value={item.alt ?? ""} placeholder="代替テキスト" onChange={(event) => updateItem(index, { alt: event.currentTarget.value })} />
                    </div>
                    <textarea value={item.caption ?? ""} placeholder="キャプション" onChange={(event) => updateItem(index, { caption: event.currentTarget.value })} />
                    <div className="fuwafuwa-media-slots">
                      {(["imagePath", "videoPath", "audioPath"] as UploadSlot[]).map((slot) => {
                        const media = MEDIA_SLOT_LABELS[slot];
                        const currentPath = mediaPathForSlot(item, slot);
                        return (
                          <div key={slot} className={currentPath === undefined ? "fuwafuwa-media-slot" : "fuwafuwa-media-slot is-filled"}>
                            <div>
                              <strong>{media.label}</strong>
                              <span>{currentPath === undefined ? media.help : "登録済み"}</span>
                            </div>
                            <label className="fuwafuwa-file-button">
                              {currentPath === undefined ? "登録" : "差し替え"}
                              <input
                                type="file"
                                accept={media.accept}
                                onChange={(event) => {
                                  const file = event.currentTarget.files?.[0];
                                  if (file !== undefined) {
                                    uploadItemFile(index, slot, file);
                                  }
                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>
                            {currentPath !== undefined ? (
                              <button type="button" onClick={() => clearItemMedia(index, slot)}>
                                外す
                              </button>
                            ) : null}
                            {currentPath !== undefined ? <small>{currentPath}</small> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="fuwafuwa-content-preview">
                <div className="fuwafuwa-panel-title">
                  <strong>プレビュー</strong>
                  <span>{draft.isPublished === true ? "公開" : "下書き"}</span>
                </div>
                <div className="fuwafuwa-preview-card">
                  <h3>{draft.title.trim().length > 0 ? draft.title : "タイトル未設定"}</h3>
                  {draft.body !== undefined && draft.body.trim().length > 0 ? <p>{draft.body}</p> : null}
                  <div className="fuwafuwa-preview-items">
                    {items.filter(itemHasContent).map((item, index) => {
                      const imageUrl = pathPreview(repository, item.imagePath);
                      const videoUrl = pathPreview(repository, item.videoPath);
                      const audioUrl = pathPreview(repository, item.audioPath);
                      return (
                        <article key={index} className="fuwafuwa-preview-item">
                          <strong>{item.title?.trim() || `枠${index + 1}`}</strong>
                          {imageUrl !== undefined ? <img src={imageUrl} alt={item.alt ?? item.title ?? ""} /> : null}
                          {videoUrl !== undefined ? <video src={videoUrl} controls muted playsInline preload="metadata" /> : null}
                          {audioUrl !== undefined ? <audio src={audioUrl} controls /> : null}
                          {item.caption !== undefined && item.caption.trim().length > 0 ? <p>{item.caption}</p> : null}
                        </article>
                      );
                    })}
                    {items.filter(itemHasContent).length === 0 ? <p className="fuwafuwa-message">本文またはメディアを1つ以上入れると表示されます</p> : null}
                  </div>
                  {draft.ctaLabel !== undefined && draft.ctaLabel.trim().length > 0 ? (
                    <button type="button" className="fuwafuwa-sponsor-cta" onClick={() => setMessage("プレビューではCTAを開きません")}>
                      {draft.ctaLabel}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="fuwafuwa-toolbar">
                <button type="button" onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM, sortOrder: current.length }])}>
                  枠追加
                </button>
                <button type="button" className="fuwafuwa-primary-action" disabled={busyId === selected.id} onClick={saveContent}>
                  保存
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      {message !== null ? <p className="fuwafuwa-message">{message}</p> : null}
    </section>
  );
}
