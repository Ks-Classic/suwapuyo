import { DISPLAY_STATE_ID } from "../config";
import { getSupabaseClient, type FuwafuwaSupabaseClient } from "../lib/supabase";
import type { Database } from "../types/database.types";
import type { Artwork, ConnectionStatus, DisplayEvent, DisplayState, DisplayStateService, RealtimeSubscription } from "../types";
import { cacheDisplayState, getCachedDisplayState } from "./db";
import { SupabaseArtworkRepository } from "./artworkStore";
import { appendOperationLog } from "./operationLog";

type DisplayStateRow = Database["public"]["Tables"]["display_state"]["Row"];

function isDisplayEvent(value: unknown): value is DisplayEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "type" in value &&
    "startedAt" in value &&
    typeof value.id === "string" &&
    value.type === "battle" &&
    typeof value.startedAt === "string"
  );
}

function stateFromRow(row: DisplayStateRow): DisplayState {
  return {
    id: "current",
    visibleArtworkIds: row.visible_artwork_ids,
    featuredArtworkId: row.featured_artwork_id ?? undefined,
    mode: row.mode,
    maxVisibleCount: row.max_visible_count,
    displayEvent: isDisplayEvent(row.display_event) ? row.display_event : undefined,
    updatedAt: row.updated_at,
  };
}

function isDisplayStateRow(value: unknown): value is DisplayStateRow {
  return typeof value === "object" && value !== null && "id" in value && "visible_artwork_ids" in value && "max_visible_count" in value;
}

function patchToRow(patch: Partial<Omit<DisplayState, "id" | "updatedAt">>): Database["public"]["Tables"]["display_state"]["Update"] {
  const row: Database["public"]["Tables"]["display_state"]["Update"] = {
    visible_artwork_ids: patch.visibleArtworkIds,
    featured_artwork_id: patch.featuredArtworkId ?? null,
    mode: patch.mode,
    max_visible_count: patch.maxVisibleCount,
  };
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
        return cached;
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
    await this.repository.setStatus(id, "visible");
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
    await this.repository.setStatus(id, "hidden");
    const state = await this.updateDisplayState({
      visibleArtworkIds: current.visibleArtworkIds.filter((visibleId) => visibleId !== id),
      featuredArtworkId: current.featuredArtworkId === id ? undefined : current.featuredArtworkId,
      mode: current.featuredArtworkId === id ? "random" : current.mode,
    });
    await appendOperationLog("hide", "hidden", id);
    return state;
  }

  async archiveArtwork(id: string): Promise<DisplayState> {
    const current = await this.getDisplayState();
    await this.repository.setStatus(id, "archived");
    const state = await this.updateDisplayState({
      visibleArtworkIds: current.visibleArtworkIds.filter((visibleId) => visibleId !== id),
      featuredArtworkId: current.featuredArtworkId === id ? undefined : current.featuredArtworkId,
      mode: current.featuredArtworkId === id ? "random" : current.mode,
    });
    await appendOperationLog("archive", "archived", id);
    return state;
  }

  async resetDisplay(): Promise<DisplayState> {
    const state = await this.updateDisplayState({ visibleArtworkIds: [], featuredArtworkId: undefined, mode: "idle" });
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

  async startBattleEvent(): Promise<DisplayState> {
    const state = await this.updateDisplayState({
      displayEvent: {
        id: crypto.randomUUID(),
        type: "battle",
        startedAt: new Date().toISOString(),
      },
      mode: "random",
    });
    await appendOperationLog("random", "battle_event_started");
    return state;
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

export function createFuwafuwaServices(): { repository: SupabaseArtworkRepository; displayState: SupabaseDisplayStateService } {
  const clientPromise = ensureClient();
  const repository = new SupabaseArtworkRepository(clientPromise);
  return {
    repository,
    displayState: new SupabaseDisplayStateService(clientPromise, repository),
  };
}
