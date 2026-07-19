import { ARTWORK_BUCKET } from "../config";
import { getSupabaseClient, type FuwafuwaSupabaseClient } from "../lib/supabase";
import type { Database } from "../types/database.types";
import { DEFAULT_ARTWORK_DISPLAY_SCALE, type Artwork, type ArtworkRepository, type ArtworkStatus, type ConnectionStatus, type DisplayCharacterStatus, type RegisterArtworkInput, type RealtimeSubscription } from "../types";
import { cacheArtwork, cacheArtworks, cacheImage, getCachedArtwork, getCachedArtworks, getCachedImage } from "./db";
import { appendOperationLog } from "./operationLog";
import { normalizeSearchQuery } from "../utils/id";
import { objectUrlForBlob } from "../utils/image";

type ArtworkRow = Database["public"]["Tables"]["artworks"]["Row"];

function optional(value: string | null): string | undefined {
  return value === null || value.length === 0 ? undefined : value;
}

export function artworkFromRow(row: ArtworkRow): Artwork {
  return {
    id: row.id,
    displayLabel: row.display_label,
    givenName: optional(row.given_name),
    source: row.source,
    imageBlobKey: row.image_path,
    width: row.width,
    height: row.height,
    displayScale: Number(row.display_scale ?? DEFAULT_ARTWORK_DISPLAY_SCALE),
    status: row.status,
    consentScope: row.consent_scope,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastShownAt: optional(row.last_shown_at),
    showCount: row.show_count,
    notes: optional(row.notes),
  };
}

function sortNewestFirst(artworks: Artwork[]): Artwork[] {
  return [...artworks].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function filterArtworks(artworks: Artwork[], filter?: { status?: ArtworkStatus; query?: string }): Artwork[] {
  const query = filter?.query === undefined ? "" : normalizeSearchQuery(filter.query);
  return sortNewestFirst(
    artworks.filter((artwork) => {
      if (filter?.status !== undefined && artwork.status !== filter.status) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      return artwork.id.toLowerCase().includes(query) || artwork.givenName?.toLowerCase().includes(query) === true;
    }),
  );
}

function isArtworkRow(value: unknown): value is ArtworkRow {
  return typeof value === "object" && value !== null && "id" in value && "image_path" in value && "display_label" in value;
}

async function ensureClient(): Promise<FuwafuwaSupabaseClient> {
  const client = getSupabaseClient();
  if (client === null) {
    await appendOperationLog("error", "supabase_config_missing");
    throw new Error("supabase_config_missing");
  }
  return client;
}

async function cacheImageFromPublicUrl(id: string, url: string): Promise<string> {
  const cached = await getCachedImage(id);
  if (cached !== undefined) {
    return objectUrlForBlob(id, cached);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("image_fetch_failed");
  }
  const blob = await response.blob();
  await cacheImage(id, blob);
  return objectUrlForBlob(id, blob);
}

export class SupabaseArtworkRepository implements ArtworkRepository {
  private readonly clientPromise: Promise<FuwafuwaSupabaseClient>;

  constructor(clientPromise: Promise<FuwafuwaSupabaseClient> = ensureClient()) {
    this.clientPromise = clientPromise;
  }

  async register(input: RegisterArtworkInput): Promise<Artwork> {
    const client = await this.clientPromise;
    const extension = input.imageBlob.type === "image/png" ? "png" : "jpg";
    const imagePath = `event/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const upload = await client.storage.from(ARTWORK_BUCKET).upload(imagePath, input.imageBlob, {
      contentType: input.imageBlob.type || "image/jpeg",
      upsert: false,
    });
    if (upload.error !== null) {
      await appendOperationLog("error", upload.error.message);
      throw upload.error;
    }

    const insert = await client
      .from("artworks")
      .insert({
        given_name: input.givenName ?? null,
        source: input.source,
        image_path: imagePath,
        width: input.width,
        height: input.height,
        consent_scope: input.consentScope,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (insert.error !== null) {
      await appendOperationLog("error", insert.error.message);
      throw insert.error;
    }

    const artwork = artworkFromRow(insert.data);
    const displayCharacter = await client.from("display_characters").upsert(
      {
        id: artwork.id,
        source_type: "artwork",
        source_id: artwork.id,
        label: artwork.givenName ?? artwork.displayLabel,
        image_path: artwork.imageBlobKey,
        // キオスクお絵かきは "hidden"(スタッフ承認待ち)、スタッフ登録は既定 "visible"
        status: input.characterStatus ?? "visible",
        display_scale: artwork.displayScale,
        tap_enabled: false,
        sort_order: Math.floor(Date.now() / 1000),
      },
      { onConflict: "source_type,source_id" },
    );
    if (displayCharacter.error !== null) {
      await appendOperationLog("error", displayCharacter.error.message, artwork.id);
      throw displayCharacter.error;
    }
    await cacheArtwork(artwork);
    await cacheImage(artwork.id, input.imageBlob);
    await appendOperationLog("register", "registered", artwork.id);
    return artwork;
  }

  async list(filter?: { status?: ArtworkStatus; query?: string }): Promise<Artwork[]> {
    const client = await this.clientPromise;
    const request = client.from("artworks").select("*").order("created_at", { ascending: false });
    const response = filter?.status === undefined ? await request : await request.eq("status", filter.status);
    if (response.error !== null) {
      const cached = await getCachedArtworks();
      await appendOperationLog("error", response.error.message);
      return filterArtworks(cached, filter);
    }
    const artworks = response.data.map(artworkFromRow);
    await cacheArtworks(artworks);
    return filterArtworks(artworks, filter);
  }

  async getById(id: string): Promise<Artwork | null> {
    const client = await this.clientPromise;
    const response = await client.from("artworks").select("*").eq("id", id).maybeSingle();
    if (response.error !== null) {
      return (await getCachedArtwork(id)) ?? null;
    }
    if (response.data === null) {
      return null;
    }
    const artwork = artworkFromRow(response.data);
    await cacheArtwork(artwork);
    return artwork;
  }

  async getImageURL(id: string): Promise<string> {
    const cached = await getCachedImage(id);
    if (cached !== undefined) {
      return objectUrlForBlob(id, cached);
    }
    const artwork = await this.getById(id);
    if (artwork === null) {
      throw new Error("artwork_not_found");
    }
    const client = await this.clientPromise;
    const publicUrl = client.storage.from(ARTWORK_BUCKET).getPublicUrl(artwork.imageBlobKey).data.publicUrl;
    return cacheImageFromPublicUrl(id, publicUrl);
  }

  async setStatus(id: string, status: ArtworkStatus): Promise<Artwork> {
    const client = await this.clientPromise;
    const response = await client.from("artworks").update({ status }).eq("id", id).select().single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, id);
      throw response.error;
    }
    const artwork = artworkFromRow(response.data);
    // Codexレビュー P1対応: 承認境界を閉じるため display_characters にも状態を同期する
    // (queued/hidden → hidden, visible → visible, archived → archived)
    const characterStatus: DisplayCharacterStatus = status === "archived" ? "archived" : status === "visible" ? "visible" : "hidden";
    const mirrored = await client.from("display_characters").update({ status: characterStatus }).eq("source_type", "artwork").eq("source_id", id);
    if (mirrored.error !== null) {
      await appendOperationLog("error", mirrored.error.message, id);
      throw mirrored.error;
    }
    await cacheArtwork(artwork);
    return artwork;
  }

  async setDisplayScale(id: string, scale: number): Promise<Artwork> {
    const client = await this.clientPromise;
    const boundedScale = Math.min(1, Math.max(0.1, Math.round(scale * 10) / 10));
    const response = await client.from("artworks").update({ display_scale: boundedScale }).eq("id", id).select().single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, id);
      throw response.error;
    }
    const artwork = artworkFromRow(response.data);
    await cacheArtwork(artwork);
    return artwork;
  }

  async markShown(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const client = await this.clientPromise;
    const shownAt = new Date().toISOString();
    await Promise.all(
      ids.map(async (id) => {
        const current = await this.getById(id);
        if (current === null) {
          return;
        }
        const response = await client
          .from("artworks")
          .update({ last_shown_at: shownAt, show_count: current.showCount + 1, status: "visible" })
          .eq("id", id)
          .select()
          .single();
        if (response.error === null) {
          await cacheArtwork(artworkFromRow(response.data));
        }
      }),
    );
  }

  subscribeArtworkChanges(onChange: (artwork: Artwork) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription {
    const client = getSupabaseClient();
    if (client === null) {
      onStatus("missing-config");
      return { unsubscribe: async () => undefined };
    }
    onStatus("connecting");
    const channel = client
      .channel("fuwafuwa-artworks")
      .on("postgres_changes", { event: "*", schema: "public", table: "artworks" }, (payload) => {
        const row = payload.new;
        if (isArtworkRow(row)) {
          const artwork = artworkFromRow(row);
          void cacheArtwork(artwork).then(() => onChange(artwork));
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
