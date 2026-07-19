// 統合キャラ管理(08_設計書 §4.2)。
// サンプル/おえかき/出展キャラを1リストで管理: 名前インライン編集・大きさ・表示切替・QR発行・タップコンテンツCMS。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CharacterQrModal } from "./CharacterQrModal";

interface CharacterListProps {
  repository: CharacterContentRepository;
  artworkRepository?: ArtworkRepository;
  refreshToken?: number;
}

type StatusFilter = DisplayCharacterStatus | "all";
type SourceFilter = DisplayCharacterSourceType | "all";
type UploadSlot = "imagePath" | "videoPath" | "audioPath";

const NAME_SAVE_DEBOUNCE_MS = 600;
const SCALE_SAVE_DEBOUNCE_MS = 600;

// 大きさプリセット(08_設計書 §4.2)
const SCALE_PRESETS: readonly { label: string; value: number }[] = [
  { label: "ちいさめ", value: 0.3 },
  { label: "ふつう", value: 0.6 },
  { label: "おおきめ", value: 1.0 },
  { label: "とくだい", value: 1.6 },
];

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
    return "もともと";
  }
  if (source === "artwork") {
    return "おえかき";
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

// 名前インライン編集: タップでinput化、debounce 600ms + blur/Enterで即保存。
function CharacterNameEditor({ character, onSave }: { character: DisplayCharacter; onSave: (id: string, label: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(character.label);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const save = useCallback(
    (next: string): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const trimmed = next.trim();
      if (trimmed.length === 0 || trimmed === character.label) {
        return;
      }
      void onSave(character.id, trimmed);
    },
    [character.id, character.label, onSave],
  );

  const scheduleSave = (next: string): void => {
    setValue(next);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      save(next);
    }, NAME_SAVE_DEBOUNCE_MS);
  };

  if (!editing) {
    return (
      <button type="button" className="fuwafuwa-character-name" title="タップで名前を編集" onClick={() => setEditing(true)}>
        <strong>{character.label}</strong>
        <i aria-hidden="true">✏️</i>
      </button>
    );
  }
  return (
    <input
      className="fuwafuwa-character-name-input"
      value={value}
      autoFocus
      aria-label={`${character.label} の名前を編集`}
      onChange={(event) => scheduleSave(event.currentTarget.value)}
      onBlur={() => {
        save(value);
        setEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          save(value);
          setEditing(false);
        }
      }}
    />
  );
}

// 1キャラ分の大きさ操作: スライダー + プリセット。debounceして保存(連打防止)。
function CharacterScaleControl({ character, disabled, onSave }: { character: DisplayCharacter; disabled: boolean; onSave: (id: string, scale: number) => Promise<void> }) {
  const [draft, setDraft] = useState(character.displayScale);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const change = (scale: number): void => {
    setDraft(scale);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void onSave(character.id, scale);
    }, SCALE_SAVE_DEBOUNCE_MS);
  };

  return (
    <div className="fuwafuwa-scale-block">
      <label className="fuwafuwa-scale-control">
        <span>{draft.toFixed(1)}x</span>
        <input type="range" min="0.1" max="2.0" step="0.1" value={draft} disabled={disabled} onChange={(event) => change(Number(event.currentTarget.value))} />
      </label>
      <div className="fuwafuwa-scale-presets" role="group" aria-label={`${character.label} のサイズプリセット`}>
        {SCALE_PRESETS.map((preset) => (
          <button key={preset.label} type="button" disabled={disabled} className={Math.abs(draft - preset.value) < 0.05 ? "is-active" : ""} onClick={() => change(preset.value)}>
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CharacterList({ repository, artworkRepository, refreshToken = 0 }: CharacterListProps) {
  const [characters, setCharacters] = useState<DisplayCharacter[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [scaleAll, setScaleAll] = useState(0.6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrCharacterId, setQrCharacterId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TapContentDraft>(EMPTY_DRAFT);
  const [items, setItems] = useState<TapContentItemDraft[]>([{ ...EMPTY_ITEM }]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charactersRef = useRef<DisplayCharacter[]>([]);
  const bulkTimerRef = useRef<number | null>(null);
  const bulkRunningRef = useRef(false);
  const bulkNextRef = useRef<number | null>(null);

  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  // 全件をロードし、検索・絞り込みはクライアント側で行う(キー入力ごとの再フェッチ廃止)。
  const loadCharacters = useCallback(async () => {
    const loaded = await repository.listCharacters();
    setCharacters(loaded);
    if (bulkTimerRef.current === null && !bulkRunningRef.current && loaded.length > 0) {
      setScaleAll(loaded[0].displayScale);
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository
      .listCharacters()
      .then((loaded) => {
        if (active) {
          setCharacters(loaded);
          if (loaded.length > 0) {
            setScaleAll(loaded[0].displayScale);
          }
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
  }, [refreshToken, repository]);

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

  useEffect(() => {
    return () => {
      if (bulkTimerRef.current !== null) {
        window.clearTimeout(bulkTimerRef.current);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return characters.filter((character) => {
      if (statusFilter !== "all" && character.status !== statusFilter) {
        return false;
      }
      if (statusFilter === "all" && character.status === "archived") {
        return false;
      }
      if (sourceFilter !== "all" && character.sourceType !== sourceFilter) {
        return false;
      }
      if (normalizedQuery.length > 0 && !character.label.toLowerCase().includes(normalizedQuery) && !character.id.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      return true;
    });
  }, [characters, query, sourceFilter, statusFilter]);

  const visibleCount = useMemo(() => characters.filter((character) => character.status === "visible").length, [characters]);
  const totalCount = useMemo(() => characters.filter((character) => character.status !== "archived").length, [characters]);

  const selected = selectedId === null ? null : characters.find((character) => character.id === selectedId) ?? null;
  const qrCharacter = qrCharacterId === null ? null : characters.find((character) => character.id === qrCharacterId) ?? null;

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

  const saveLabel = useCallback(
    async (id: string, label: string): Promise<void> => {
      try {
        await repository.setCharacterLabel(id, label);
        setMessage("名前を保存しました");
        await loadCharacters();
      } catch (error) {
        if (error instanceof Error && error.message === "character_label_required") {
          setMessage("名前を入れてください");
          return;
        }
        setMessage(error instanceof Error ? error.message : "label_update_failed");
      }
    },
    [loadCharacters, repository],
  );

  const saveScale = useCallback(
    async (id: string, scale: number): Promise<void> => {
      try {
        await repository.setCharacterDisplayScale(id, scale);
        await loadCharacters();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "scale_update_failed");
      }
    },
    [loadCharacters, repository],
  );

  // 一覧サイズ: 旧実装の全件Promise.all連打をやめ、debounce後に1件ずつ直列で保存する。
  const runBulkScale = useCallback(
    async (scale: number): Promise<void> => {
      if (bulkRunningRef.current) {
        bulkNextRef.current = scale;
        return;
      }
      bulkRunningRef.current = true;
      try {
        for (const character of charactersRef.current) {
          if (character.status === "archived") {
            continue;
          }
          await repository.setCharacterDisplayScale(character.id, scale);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "scale_update_failed");
      } finally {
        bulkRunningRef.current = false;
      }
      const next = bulkNextRef.current;
      bulkNextRef.current = null;
      if (next !== null) {
        await runBulkScale(next);
        return;
      }
      await loadCharacters();
    },
    [loadCharacters, repository],
  );

  const changeScaleAll = (scale: number): void => {
    setScaleAll(scale);
    if (bulkTimerRef.current !== null) {
      window.clearTimeout(bulkTimerRef.current);
    }
    bulkTimerRef.current = window.setTimeout(() => {
      bulkTimerRef.current = null;
      void runBulkScale(scale);
    }, SCALE_SAVE_DEBOUNCE_MS);
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
      <div className="fuwafuwa-character-summary" aria-live="polite">
        <strong>表示中 {visibleCount}体</strong>
        <span>/ 全体 {totalCount}体</span>
      </div>
      <div className="fuwafuwa-list-head fuwafuwa-character-filter-head">
        <input value={query} placeholder="キャラ検索" onChange={(event) => setQuery(event.currentTarget.value)} />
        <div className="fuwafuwa-status-filter fuwafuwa-filter-chips" role="group" aria-label="表示状態フィルタ">
          {(["all", "visible", "hidden", "archived"] as StatusFilter[]).map((status) => (
            <button key={status} type="button" className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)}>
              {statusLabel(status)}
            </button>
          ))}
        </div>
        <div className="fuwafuwa-status-filter fuwafuwa-filter-chips" role="group" aria-label="種別フィルタ">
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
      <div className="fuwafuwa-scale-block fuwafuwa-scale-control-wide">
        <label className="fuwafuwa-scale-control">
          <span>一覧サイズ {scaleAll.toFixed(1)}x</span>
          <input type="range" min="0.1" max="2.0" step="0.1" value={scaleAll} onChange={(event) => changeScaleAll(Number(event.currentTarget.value))} />
        </label>
        <div className="fuwafuwa-scale-presets" role="group" aria-label="一覧サイズプリセット">
          {SCALE_PRESETS.map((preset) => (
            <button key={preset.label} type="button" className={Math.abs(scaleAll - preset.value) < 0.05 ? "is-active" : ""} onClick={() => changeScaleAll(preset.value)}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fuwafuwa-character-workspace">
        <div className="fuwafuwa-character-list">
          {filtered.map((character) => (
            <article key={character.id} className={selectedId === character.id ? "fuwafuwa-character-row is-selected" : "fuwafuwa-character-row"}>
              <div className="fuwafuwa-character-identity">
                <button type="button" className="fuwafuwa-character-pick" aria-label={`${character.label} のタップコンテンツを編集`} onClick={() => selectCharacter(character)}>
                  <CharacterThumbnail character={character} repository={repository} artworkRepository={artworkRepository} />
                </button>
                <div className="fuwafuwa-character-meta">
                  <CharacterNameEditor key={`${character.id}:${character.label}`} character={character} onSave={saveLabel} />
                  <span>
                    <i className={`fuwafuwa-source-badge is-${character.sourceType}`}>{sourceLabel(character.sourceType)}</i>
                    <small>{character.tapEnabled ? "tap設定あり" : "tap未設定"}</small>
                  </span>
                </div>
              </div>
              <div className="fuwafuwa-row-actions fuwafuwa-row-actions-compact">
                {character.status === "archived" ? (
                  <button type="button" disabled={busyId === character.id} onClick={() => setStatus(character, "hidden")}>
                    もどす
                  </button>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={character.status === "visible"}
                    className={character.status === "visible" ? "fuwafuwa-visibility-toggle is-on" : "fuwafuwa-visibility-toggle"}
                    disabled={busyId === character.id}
                    onClick={() => setStatus(character, character.status === "visible" ? "hidden" : "visible")}
                  >
                    <i aria-hidden="true" />
                    {character.status === "visible" ? "表示中" : "非表示"}
                  </button>
                )}
                <button type="button" className="fuwafuwa-qr-button" disabled={busyId === character.id} onClick={() => setQrCharacterId(character.id)}>
                  QR
                </button>
                {character.status === "archived" ? null : (
                  <button type="button" className="is-danger" disabled={busyId === character.id} onClick={() => setStatus(character, "archived")}>
                    削除
                  </button>
                )}
              </div>
              <CharacterScaleControl key={`${character.id}:${character.displayScale}`} character={character} disabled={busyId === character.id} onSave={saveScale} />
            </article>
          ))}
          {filtered.length === 0 ? <p className="fuwafuwa-message">条件にあてはまるキャラがいません</p> : null}
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
      {qrCharacter !== null ? <CharacterQrModal character={qrCharacter} onClose={() => setQrCharacterId(null)} /> : null}
    </section>
  );
}
