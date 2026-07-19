import { DISPLAY_STATE_ID } from "../config";
import { getSupabaseClient, type FuwafuwaSupabaseClient } from "../lib/supabase";
import type { Database, Json } from "../types/database.types";
import { DISPLAY_EVENT_TYPES, BGM_TRACK_IDS, type Artwork, type BgmTrackId, type ConnectionStatus, type DisplayEvent, type DisplayEventType, type DisplaySettings, type DisplayState, type DisplayStateService, type RealtimeSubscription } from "../types";
import { SAMPLE_CHARACTERS } from "../renderer/sampleCharacters";
import { cacheDisplayState, getCachedDisplayState } from "./db";
import { SupabaseArtworkRepository } from "./artworkStore";
import { SupabaseCharacterContentRepository } from "./characterContentStore";
import { SupabaseSpeechLineRepository } from "./speechLineStore";
import { appendOperationLog } from "./operationLog";

type DisplayStateRow = Database["public"]["Tables"]["display_state"]["Row"];
const DEFAULT_SAMPLE_ARTWORK_IDS = SAMPLE_CHARACTERS.map((sample) => sample.id);

function isSampleArtworkId(id: string): boolean {
  return DEFAULT_SAMPLE_ARTWORK_IDS.includes(id);
}

function isDisplayEventType(value: unknown): value is DisplayEventType {
  return typeof value === "string" && (DISPLAY_EVENT_TYPES as readonly string[]).includes(value);
}

function isDisplayEvent(value: unknown): value is DisplayEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "type" in value &&
    "startedAt" in value &&
    typeof value.id === "string" &&
    isDisplayEventType(value.type) &&
    typeof value.startedAt === "string"
  );
}

function isBgmTrackId(value: unknown): value is BgmTrackId {
  return typeof value === "string" && (BGM_TRACK_IDS as readonly string[]).includes(value);
}

// settings jsonb を安全にパース(未知キー・不正値は捨てて既定 {} に倒す)
export function settingsFromJson(value: Json | null | undefined): DisplaySettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const settings: DisplaySettings = {};
  if (isBgmTrackId(value.bgmTrackId)) {
    settings.bgmTrackId = value.bgmTrackId;
  }
  if (typeof value.bgmVolume === "number" && Number.isFinite(value.bgmVolume)) {
    settings.bgmVolume = Math.min(1, Math.max(0, value.bgmVolume));
  }
  if (typeof value.speechIntervalMs === "number" && Number.isFinite(value.speechIntervalMs)) {
    settings.speechIntervalMs = Math.min(120_000, Math.max(15_000, value.speechIntervalMs));
  }
  return settings;
}

export function settingsToJson(settings: DisplaySettings): Json {
  const json: { [key: string]: Json | undefined } = {};
  if (settings.bgmTrackId !== undefined) {
    json.bgmTrackId = settings.bgmTrackId;
  }
  if (settings.bgmVolume !== undefined) {
    json.bgmVolume = settings.bgmVolume;
  }
  if (settings.speechIntervalMs !== undefined) {
    json.speechIntervalMs = settings.speechIntervalMs;
  }
  return json;
}

// idb 旧キャッシュには settings が無いことがあるため既定値を補う
function withSettingsFallback(state: DisplayState): DisplayState {
  const settings = (state as Partial<DisplayState>).settings ?? {};
  return { ...state, settings };
}

function stateFromRow(row: DisplayStateRow): DisplayState {
  const useDefaultSamples = row.visible_artwork_ids.length === 0 && row.mode === "idle";
  const visibleArtworkIds = useDefaultSamples ? DEFAULT_SAMPLE_ARTWORK_IDS : row.visible_artwork_ids;
  return {
    id: "current",
    visibleArtworkIds,
    featuredArtworkId: row.featured_artwork_id ?? undefined,
    mode: row.mode,
    maxVisibleCount: useDefaultSamples ? Math.max(row.max_visible_count, DEFAULT_SAMPLE_ARTWORK_IDS.length) : row.max_visible_count,
    displayEvent: isDisplayEvent(row.display_event) ? row.display_event : undefined,
    settings: settingsFromJson(row.settings),
    updatedAt: row.updated_at,
  };
}

function isDisplayStateRow(value: unknown): value is DisplayStateRow {
  return typeof value === "object" && value !== null && "id" in value && "visible_artwork_ids" in value && "max_visible_count" in value;
}

function patchToRow(patch: Partial<Omit<DisplayState, "id" | "updatedAt">>): Database["public"]["Tables"]["display_state"]["Update"] {
  const row: Database["public"]["Tables"]["display_state"]["Update"] = {
    visible_artwork_ids: patch.visibleArtworkIds,
    mode: patch.mode,
    max_visible_count: patch.maxVisibleCount,
  };
  // featuredArtworkId はキーが渡されたときだけ反映する。
  // (settings やイベントのみの更新で featured が意図せず消えるのを防ぐ。hero イベントは featured に依存)
  if ("featuredArtworkId" in patch) {
    row.featured_artwork_id = patch.featuredArtworkId ?? null;
  }
  if (patch.settings !== undefined) {
    row.settings = settingsToJson(patch.settings);
  }
  if ("displayEvent" in patch) {
    row.display_event =
      patch.displayEvent === null || patch.displayEvent === undefined
        ? null
        : {
            id: patch.displayEvent.id,
            type: patch.displayEvent.type,
            startedAt: patch.displayEvent.startedAt,
          };
  }
  return row;
}

async function ensureClient(): Promise<FuwafuwaSupabaseClient> {
  const client = getSupabaseClient();
  if (client === null) {
    await appendOperationLog("error", "supabase_config_missing");
    throw new Error("supabase_config_missing");
  }
  return client;
}

function weightForRandom(artwork: Artwork): number {
  const recency = artwork.lastShownAt === undefined ? 1 : Math.min(1, (Date.now() - Date.parse(artwork.lastShownAt)) / 86_400_000);
  return 1 / (1 + artwork.showCount) + recency;
}

function weightedPick(artworks: Artwork[], count: number): string[] {
  const pool = artworks.filter((artwork) => artwork.status !== "hidden" && artwork.status !== "archived");
  const selected: string[] = [];
  let candidates = [...pool];
  while (selected.length < count && candidates.length > 0) {
    const total = candidates.reduce((sum, artwork) => sum + weightForRandom(artwork), 0);
    let cursor = Math.random() * total;
    const picked = candidates.find((artwork) => {
      cursor -= weightForRandom(artwork);
      return cursor <= 0;
    }) ?? candidates[0];
    selected.push(picked.id);
    candidates = candidates.filter((artwork) => artwork.id !== picked.id);
  }
  return selected;
}

export class SupabaseDisplayStateService implements DisplayStateService {
  private readonly clientPromise: Promise<FuwafuwaSupabaseClient>;
  private readonly repository: SupabaseArtworkRepository;

  constructor(clientPromise: Promise<FuwafuwaSupabaseClient> = ensureClient(), repository = new SupabaseArtworkRepository(clientPromise)) {
    this.clientPromise = clientPromise;
    this.repository = repository;
  }

  async getDisplayState(): Promise<DisplayState> {
    const client = await this.clientPromise;
    const response = await client.from("display_state").select("*").eq("id", DISPLAY_STATE_ID).single();
    if (response.error !== null) {
      const cached = await getCachedDisplayState();
      if (cached !== null) {
        return withSettingsFallback(cached);
      }
      throw response.error;
    }
    const state = stateFromRow(response.data);
    await cacheDisplayState(state);
    return state;
  }

  async updateDisplayState(patch: Partial<Omit<DisplayState, "id" | "updatedAt">>): Promise<DisplayState> {
    const client = await this.clientPromise;
    const response = await client.from("display_state").update(patchToRow(patch)).eq("id", DISPLAY_STATE_ID).select().single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message);
      throw response.error;
    }
    const state = stateFromRow(response.data);
    await cacheDisplayState(state);
    return state;
  }

  async showArtwork(id: string, mode: "normal" | "featured"): Promise<DisplayState> {
    const current = await this.getDisplayState();
    if (!isSampleArtworkId(id)) {
      await this.repository.setStatus(id, "visible");
    }
    const visibleArtworkIds = [id, ...current.visibleArtworkIds.filter((visibleId) => visibleId !== id)].slice(0, current.maxVisibleCount);
    const state = await this.updateDisplayState({
      visibleArtworkIds,
      featuredArtworkId: mode === "featured" ? id : current.featuredArtworkId,
      mode: mode === "featured" ? "featured" : "random",
    });
    await appendOperationLog(mode === "featured" ? "feature" : "show", "display_updated", id);
    return state;
  }

  async hideArtwork(id: string): Promise<DisplayState> {
    const current = await this.getDisplayState();
    if (!isSampleArtworkId(id)) {
      await this.repository.setStatus(id, "hidden");
    }
    const state = await this.updateDisplayState({
      visibleArtworkIds: current.visibleArtworkIds.filter((visibleId) => visibleId !== id),
      featuredArtworkId: current.featuredArtworkId === id ? undefined : current.featuredArtworkId,
      mode: current.featuredArtworkId === id || isSampleArtworkId(id) ? "random" : current.mode,
    });
    await appendOperationLog("hide", "hidden", id);
    return state;
  }

  async archiveArtwork(id: string): Promise<DisplayState> {
    const current = await this.getDisplayState();
    if (!isSampleArtworkId(id)) {
      await this.repository.setStatus(id, "archived");
    }
    const state = await this.updateDisplayState({
      visibleArtworkIds: current.visibleArtworkIds.filter((visibleId) => visibleId !== id),
      featuredArtworkId: current.featuredArtworkId === id ? undefined : current.featuredArtworkId,
      mode: current.featuredArtworkId === id || isSampleArtworkId(id) ? "random" : current.mode,
    });
    await appendOperationLog("archive", "archived", id);
    return state;
  }

  async resetDisplay(): Promise<DisplayState> {
    const state = await this.updateDisplayState({
      visibleArtworkIds: DEFAULT_SAMPLE_ARTWORK_IDS,
      featuredArtworkId: undefined,
      mode: "idle",
      maxVisibleCount: DEFAULT_SAMPLE_ARTWORK_IDS.length,
    });
    await appendOperationLog("reset", "display_reset");
    return state;
  }

  async randomizeDisplay(count: number, includeAlreadyShown: boolean): Promise<DisplayState> {
    const artworks = await this.repository.list();
    const candidates = includeAlreadyShown ? artworks : artworks.filter((artwork) => artwork.showCount === 0);
    const visibleArtworkIds = weightedPick(candidates, count);
    await this.repository.markShown(visibleArtworkIds);
    const state = await this.updateDisplayState({ visibleArtworkIds, featuredArtworkId: undefined, mode: "random", maxVisibleCount: count });
    await appendOperationLog("random", "randomized");
    return state;
  }

  async setMaxVisible(count: number): Promise<DisplayState> {
    const current = await this.getDisplayState();
    return this.updateDisplayState({ maxVisibleCount: count, visibleArtworkIds: current.visibleArtworkIds.slice(0, count) });
  }

  async pauseToggle(): Promise<DisplayState> {
    const current = await this.getDisplayState();
    return this.updateDisplayState({ mode: current.mode === "paused" ? "random" : "paused" });
  }

  async startDisplayEvent(type: DisplayEventType): Promise<void> {
    await this.updateDisplayState({
      displayEvent: {
        id: crypto.randomUUID(),
        type,
        startedAt: new Date().toISOString(),
      },
      mode: "random",
    });
    await appendOperationLog("random", `${type}_event_started`);
  }

  // 既存呼び出し互換の残置ラッパー(08_設計書 §3)
  async startBattleEvent(): Promise<DisplayState> {
    await this.startDisplayEvent("battle");
    return this.getDisplayState();
  }

  async updateSettings(patch: Partial<DisplaySettings>): Promise<void> {
    const current = await this.getDisplayState();
    await this.updateDisplayState({ settings: { ...current.settings, ...patch } });
  }

  async clearDisplayEvent(): Promise<DisplayState> {
    return this.updateDisplayState({ displayEvent: undefined });
  }

  subscribeDisplayState(onChange: (state: DisplayState) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription {
    const client = getSupabaseClient();
    if (client === null) {
      onStatus("missing-config");
      return { unsubscribe: async () => undefined };
    }
    onStatus("connecting");
    const channel = client
      .channel("fuwafuwa-display-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "display_state" }, (payload) => {
        const row = payload.new;
        if (isDisplayStateRow(row) && row.id === DISPLAY_STATE_ID) {
          const state = stateFromRow(row);
          void cacheDisplayState(state).then(() => onChange(state));
        }
      })
      .subscribe((status) => {
        onStatus(status === "SUBSCRIBED" ? "online" : "connecting");
      });

    return {
      unsubscribe: async () => {
        await client.removeChannel(channel);
      },
    };
  }
}

export function createFuwafuwaServices(): {
  repository: SupabaseArtworkRepository;
  displayState: SupabaseDisplayStateService;
  characterContent: SupabaseCharacterContentRepository;
  speechLines: SupabaseSpeechLineRepository;
} {
  const clientPromise = ensureClient();
  const repository = new SupabaseArtworkRepository(clientPromise);
  return {
    repository,
    displayState: new SupabaseDisplayStateService(clientPromise, repository),
    characterContent: new SupabaseCharacterContentRepository(clientPromise),
    speechLines: new SupabaseSpeechLineRepository(clientPromise),
  };
}
