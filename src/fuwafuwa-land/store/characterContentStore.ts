import { CHARACTER_CONTENT_BUCKET } from "../config";
import { getSupabaseClient, type FuwafuwaSupabaseClient } from "../lib/supabase";
import type {
  CharacterContentBundle,
  CharacterContentRepository,
  ConnectionStatus,
  DisplayCharacter,
  DisplayCharacterSourceType,
  DisplayCharacterStatus,
  TapContent,
  TapContentDraft,
  TapContentItem,
  TapContentItemDraft,
  TapContentMediaKind,
  TapEventMeta,
  TapEventType,
  RealtimeSubscription,
} from "../types";
import type { Database, Json } from "../types/database.types";
import { normalizeSearchQuery } from "../utils/id";
import { appendOperationLog } from "./operationLog";

type DisplayCharacterRow = Database["public"]["Tables"]["display_characters"]["Row"];
type TapContentRow = Database["public"]["Tables"]["tap_contents"]["Row"];
type TapContentItemRow = Database["public"]["Tables"]["tap_content_items"]["Row"];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const MEDIA_LIMITS: Record<TapContentMediaKind, { maxBytes: number; contentTypes: readonly string[] }> = {
  image: { maxBytes: MAX_IMAGE_BYTES, contentTypes: ["image/jpeg", "image/png", "image/webp"] },
  video: { maxBytes: MAX_VIDEO_BYTES, contentTypes: ["video/mp4", "video/webm"] },
  audio: { maxBytes: MAX_AUDIO_BYTES, contentTypes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm"] },
};

function optional(value: string | null): string | undefined {
  return value === null || value.length === 0 ? undefined : value;
}

function nullIfEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function displayCharacterFromRow(row: DisplayCharacterRow): DisplayCharacter {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    label: row.label,
    imagePath: row.image_path,
    sourceImagePath: optional(row.source_image_path),
    status: row.status,
    displayScale: Number(row.display_scale),
    tapEnabled: row.tap_enabled,
    tapContentId: optional(row.tap_content_id),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isDisplayCharacterRow(value: unknown): value is DisplayCharacterRow {
  return typeof value === "object" && value !== null && "id" in value && "source_type" in value && "image_path" in value;
}

function tapContentFromRow(row: TapContentRow): TapContent {
  return {
    id: row.id,
    title: row.title,
    body: optional(row.body),
    ctaLabel: optional(row.cta_label),
    ctaUrl: optional(row.cta_url),
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function tapContentItemFromRow(row: TapContentItemRow): TapContentItem {
  return {
    id: row.id,
    tapContentId: row.tap_content_id,
    sortOrder: row.sort_order,
    title: optional(row.title),
    caption: optional(row.caption),
    imagePath: optional(row.image_path),
    videoPath: optional(row.video_path),
    audioPath: optional(row.audio_path),
    alt: optional(row.alt),
    thumbnailPath: optional(row.thumbnail_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureClient(): Promise<FuwafuwaSupabaseClient> {
  const client = getSupabaseClient();
  if (client === null) {
    await appendOperationLog("error", "supabase_config_missing");
    throw new Error("supabase_config_missing");
  }
  return client;
}

function filterCharacters(characters: DisplayCharacter[], filter?: { status?: DisplayCharacterStatus; sourceType?: DisplayCharacterSourceType; query?: string }): DisplayCharacter[] {
  const query = filter?.query === undefined ? "" : normalizeSearchQuery(filter.query);
  return characters.filter((character) => {
    if (filter?.status !== undefined && character.status !== filter.status) {
      return false;
    }
    if (filter?.sourceType !== undefined && character.sourceType !== filter.sourceType) {
      return false;
    }
    if (query.length === 0) {
      return true;
    }
    return character.id.toLowerCase().includes(query) || character.sourceId.toLowerCase().includes(query) || character.label.toLowerCase().includes(query);
  });
}

function validateDraft(draft: TapContentDraft, items: TapContentItemDraft[]): TapContentDraft {
  const title = draft.title.trim();
  if (title.length === 0) {
    throw new Error("tap_content_title_required");
  }
  const ctaUrl = nullIfEmpty(draft.ctaUrl);
  if (ctaUrl !== null && !ctaUrl.startsWith("https://")) {
    throw new Error("tap_content_cta_url_https_required");
  }
  if (items.length === 0) {
    throw new Error("tap_content_item_required");
  }
  items.forEach((item) => {
    if (
      nullIfEmpty(item.caption) === null &&
      nullIfEmpty(item.imagePath) === null &&
      nullIfEmpty(item.videoPath) === null &&
      nullIfEmpty(item.audioPath) === null
    ) {
      throw new Error("tap_content_item_media_or_caption_required");
    }
  });
  return { ...draft, title, ctaUrl: ctaUrl ?? undefined };
}

function itemDraftToInsert(tapContentId: string, item: TapContentItemDraft, index: number): Database["public"]["Tables"]["tap_content_items"]["Insert"] {
  return {
    tap_content_id: tapContentId,
    sort_order: item.sortOrder ?? index,
    title: nullIfEmpty(item.title),
    caption: nullIfEmpty(item.caption),
    image_path: nullIfEmpty(item.imagePath),
    video_path: nullIfEmpty(item.videoPath),
    audio_path: nullIfEmpty(item.audioPath),
    alt: nullIfEmpty(item.alt),
    thumbnail_path: nullIfEmpty(item.thumbnailPath),
  };
}

function normalizeExtension(extension: string): string {
  const normalized = extension.trim().toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9]+$/.test(normalized)) {
    throw new Error("invalid_media_extension");
  }
  return normalized;
}

function uploadPath(characterId: string, kind: TapContentMediaKind, extension: string): string {
  return `${characterId}/${kind}/${crypto.randomUUID()}.${normalizeExtension(extension)}`;
}

function normalizeTapEventMeta(meta: TapEventMeta | undefined): Json {
  const normalized: Record<string, Json> = {};
  if (typeof meta?.index === "number" && Number.isFinite(meta.index)) {
    normalized.index = meta.index;
  }
  if (meta?.sourceType === "sample" || meta?.sourceType === "artwork" || meta?.sourceType === "sponsor") {
    normalized.sourceType = meta.sourceType;
  }
  if (meta?.contentItemKind === "image" || meta?.contentItemKind === "video" || meta?.contentItemKind === "audio") {
    normalized.contentItemKind = meta.contentItemKind;
  }
  return normalized;
}

function assertMedia(kind: TapContentMediaKind, file: Blob, contentType: string): void {
  const limit = MEDIA_LIMITS[kind];
  if (!limit.contentTypes.includes(contentType)) {
    throw new Error("unsupported_media_type");
  }
  if (file.size > limit.maxBytes) {
    throw new Error("media_file_too_large");
  }
}

export class SupabaseCharacterContentRepository implements CharacterContentRepository {
  private readonly clientPromise: Promise<FuwafuwaSupabaseClient>;

  constructor(clientPromise: Promise<FuwafuwaSupabaseClient> = ensureClient()) {
    this.clientPromise = clientPromise;
  }

  async listCharacters(filter?: { status?: DisplayCharacterStatus; sourceType?: DisplayCharacterSourceType; query?: string }): Promise<DisplayCharacter[]> {
    const client = await this.clientPromise;
    const request = client.from("display_characters").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    const statusFiltered = filter?.status === undefined ? request : request.eq("status", filter.status);
    const response = filter?.sourceType === undefined ? await statusFiltered : await statusFiltered.eq("source_type", filter.sourceType);
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message);
      throw response.error;
    }
    return filterCharacters(response.data.map(displayCharacterFromRow), filter);
  }

  async getCharacterContent(characterId: string): Promise<CharacterContentBundle | null> {
    const client = await this.clientPromise;
    const characterResponse = await client.from("display_characters").select("*").eq("id", characterId).maybeSingle();
    if (characterResponse.error !== null) {
      await appendOperationLog("error", characterResponse.error.message, characterId);
      throw characterResponse.error;
    }
    if (characterResponse.data === null) {
      return null;
    }
    const character = displayCharacterFromRow(characterResponse.data);
    if (character.tapContentId === undefined) {
      return { character, content: null, items: [] };
    }

    const [contentResponse, itemsResponse] = await Promise.all([
      client.from("tap_contents").select("*").eq("id", character.tapContentId).maybeSingle(),
      client.from("tap_content_items").select("*").eq("tap_content_id", character.tapContentId).order("sort_order", { ascending: true }),
    ]);
    if (contentResponse.error !== null) {
      await appendOperationLog("error", contentResponse.error.message, characterId);
      throw contentResponse.error;
    }
    if (itemsResponse.error !== null) {
      await appendOperationLog("error", itemsResponse.error.message, characterId);
      throw itemsResponse.error;
    }
    return {
      character,
      content: contentResponse.data === null ? null : tapContentFromRow(contentResponse.data),
      items: itemsResponse.data.map(tapContentItemFromRow),
    };
  }

  async setCharacterStatus(id: string, status: DisplayCharacterStatus): Promise<DisplayCharacter> {
    const client = await this.clientPromise;
    const response = await client.from("display_characters").update({ status }).eq("id", id).select().single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, id);
      throw response.error;
    }
    const character = displayCharacterFromRow(response.data);
    if (character.sourceType === "artwork") {
      const artworkResponse = await client.from("artworks").update({ status }).eq("id", character.sourceId);
      if (artworkResponse.error !== null) {
        await appendOperationLog("error", artworkResponse.error.message, id);
        throw artworkResponse.error;
      }
    }
    return character;
  }

  async setCharacterLabel(id: string, label: string): Promise<void> {
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      throw new Error("character_label_required");
    }
    const client = await this.clientPromise;
    const response = await client.from("display_characters").update({ label: trimmed }).eq("id", id).select().single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, id);
      throw response.error;
    }
    const character = displayCharacterFromRow(response.data);
    // 作品由来キャラは artworks.given_name にも名前を同期する(08_設計書 §4.2)
    if (character.sourceType === "artwork") {
      const artworkResponse = await client.from("artworks").update({ given_name: trimmed }).eq("id", character.sourceId);
      if (artworkResponse.error !== null) {
        await appendOperationLog("error", artworkResponse.error.message, id);
        throw artworkResponse.error;
      }
    }
  }

  async setCharacterDisplayScale(id: string, scale: number): Promise<DisplayCharacter> {
    const client = await this.clientPromise;
    const displayScale = Math.min(2, Math.max(0.1, Math.round(scale * 10) / 10));
    const response = await client.from("display_characters").update({ display_scale: displayScale }).eq("id", id).select().single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, id);
      throw response.error;
    }
    return displayCharacterFromRow(response.data);
  }

  async saveTapContent(characterId: string, draft: TapContentDraft, items: TapContentItemDraft[]): Promise<CharacterContentBundle> {
    const client = await this.clientPromise;
    const validDraft = validateDraft(draft, items);
    const current = await this.getCharacterContent(characterId);
    if (current === null) {
      throw new Error("display_character_not_found");
    }

    const tapContentId = current.content?.id ?? crypto.randomUUID();
    const contentPayload: Database["public"]["Tables"]["tap_contents"]["Insert"] = {
      id: tapContentId,
      title: validDraft.title,
      body: nullIfEmpty(validDraft.body),
      cta_label: nullIfEmpty(validDraft.ctaLabel),
      cta_url: nullIfEmpty(validDraft.ctaUrl),
      is_published: validDraft.isPublished ?? false,
    };
    const contentUpdate: Database["public"]["Tables"]["tap_contents"]["Update"] = {
      title: validDraft.title,
      body: nullIfEmpty(validDraft.body),
      cta_label: nullIfEmpty(validDraft.ctaLabel),
      cta_url: nullIfEmpty(validDraft.ctaUrl),
      is_published: validDraft.isPublished ?? false,
    };

    const contentResponse =
      current.content === null
        ? await client.from("tap_contents").insert(contentPayload).select().single()
        : await client.from("tap_contents").update(contentUpdate).eq("id", tapContentId).select().single();
    if (contentResponse.error !== null) {
      await appendOperationLog("error", contentResponse.error.message, characterId);
      throw contentResponse.error;
    }

    if (current.character.tapContentId === undefined) {
      const linkResponse = await client.from("display_characters").update({ tap_content_id: tapContentId, tap_enabled: true }).eq("id", characterId).select().single();
      if (linkResponse.error !== null) {
        await appendOperationLog("error", linkResponse.error.message, characterId);
        throw linkResponse.error;
      }
    }

    const deleteResponse = await client.from("tap_content_items").delete().eq("tap_content_id", tapContentId);
    if (deleteResponse.error !== null) {
      await appendOperationLog("error", deleteResponse.error.message, characterId);
      throw deleteResponse.error;
    }

    const itemRows = items.map((item, index) => itemDraftToInsert(tapContentId, item, index));
    const itemResponse = await client.from("tap_content_items").insert(itemRows).select().order("sort_order", { ascending: true });
    if (itemResponse.error !== null) {
      await appendOperationLog("error", itemResponse.error.message, characterId);
      throw itemResponse.error;
    }

    const characterResponse = await client.from("display_characters").select("*").eq("id", characterId).single();
    if (characterResponse.error !== null) {
      await appendOperationLog("error", characterResponse.error.message, characterId);
      throw characterResponse.error;
    }

    return {
      character: displayCharacterFromRow(characterResponse.data),
      content: tapContentFromRow(contentResponse.data),
      items: itemResponse.data.map(tapContentItemFromRow),
    };
  }

  getMediaPublicUrl(path: string): string {
    if (path.startsWith("/")) {
      return path;
    }
    const client = getSupabaseClient();
    if (client === null) {
      return path;
    }
    return client.storage.from(CHARACTER_CONTENT_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async uploadMedia(input: { characterId: string; kind: TapContentMediaKind; file: File | Blob; contentType: string; extension: string }): Promise<string> {
    assertMedia(input.kind, input.file, input.contentType);
    const client = await this.clientPromise;
    const path = uploadPath(input.characterId, input.kind, input.extension);
    const response = await client.storage.from(CHARACTER_CONTENT_BUCKET).upload(path, input.file, {
      contentType: input.contentType,
      upsert: false,
    });
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, input.characterId);
      throw response.error;
    }
    return path;
  }

  async track(input: { type: TapEventType; characterId?: string; tapContentId?: string; itemId?: string; meta?: TapEventMeta }): Promise<void> {
    const client = await this.clientPromise;
    const response = await client.from("tap_events").insert({
      event_type: input.type,
      character_id: input.characterId ?? null,
      tap_content_id: input.tapContentId ?? null,
      item_id: input.itemId ?? null,
      meta: normalizeTapEventMeta(input.meta),
    });
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message, input.characterId);
      throw response.error;
    }
  }

  subscribeCharacterChanges(onChange: (character: DisplayCharacter) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription {
    const client = getSupabaseClient();
    if (client === null) {
      onStatus("missing-config");
      return { unsubscribe: async () => undefined };
    }
    onStatus("connecting");
    const channel = client
      .channel("fuwafuwa-display-characters")
      .on("postgres_changes", { event: "*", schema: "public", table: "display_characters" }, (payload) => {
        const row = payload.new;
        if (isDisplayCharacterRow(row)) {
          onChange(displayCharacterFromRow(row));
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

  subscribeContentChanges(onChange: () => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription {
    const client = getSupabaseClient();
    if (client === null) {
      onStatus("missing-config");
      return { unsubscribe: async () => undefined };
    }
    onStatus("connecting");
    const channel = client
      .channel("fuwafuwa-tap-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "tap_contents" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "tap_content_items" }, onChange)
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
