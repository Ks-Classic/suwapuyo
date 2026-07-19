import { getSupabaseClient, type FuwafuwaSupabaseClient } from "../lib/supabase";
import type { ConnectionStatus, RealtimeSubscription, SpeechLine, SpeechLineDraft, SpeechLineRepository } from "../types";
import type { Database } from "../types/database.types";
import { appendOperationLog } from "./operationLog";

type SpeechLineRow = Database["public"]["Tables"]["fuwafuwa_speech_lines"]["Row"];

async function ensureClient(): Promise<FuwafuwaSupabaseClient> {
  const client = getSupabaseClient();
  if (client === null) {
    await appendOperationLog("error", "supabase_config_missing");
    throw new Error("supabase_config_missing");
  }
  return client;
}

function speechLineFromRow(row: SpeechLineRow): SpeechLine {
  return {
    id: row.id,
    text: row.text,
    characterId: row.character_id,
    category: row.category,
    boothRef: row.booth_ref,
    weight: row.weight,
    active: row.active,
    createdAt: row.created_at,
  };
}

function validateDraft(draft: SpeechLineDraft): SpeechLineDraft {
  const text = draft.text.trim();
  if (text.length < 1 || text.length > 40) {
    throw new Error("speech_line_text_length_invalid");
  }
  if (!Number.isInteger(draft.weight) || draft.weight < 1 || draft.weight > 5) {
    throw new Error("speech_line_weight_invalid");
  }
  return { ...draft, text };
}

export class SupabaseSpeechLineRepository implements SpeechLineRepository {
  private readonly clientPromise: Promise<FuwafuwaSupabaseClient>;

  constructor(clientPromise: Promise<FuwafuwaSupabaseClient> = ensureClient()) {
    this.clientPromise = clientPromise;
  }

  async list(): Promise<SpeechLine[]> {
    const client = await this.clientPromise;
    const response = await client
      .from("fuwafuwa_speech_lines")
      .select("*")
      .eq("category", "idle")
      .order("created_at", { ascending: false });
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message);
      throw response.error;
    }
    return response.data.map(speechLineFromRow);
  }

  async add(input: SpeechLineDraft): Promise<SpeechLine> {
    const draft = validateDraft(input);
    const client = await this.clientPromise;
    const response = await client
      .from("fuwafuwa_speech_lines")
      .insert({ text: draft.text, character_id: draft.characterId, category: "idle", weight: draft.weight, active: true })
      .select("*")
      .single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message);
      throw response.error;
    }
    return speechLineFromRow(response.data);
  }

  async remove(id: string): Promise<void> {
    const client = await this.clientPromise;
    const response = await client.from("fuwafuwa_speech_lines").delete().eq("id", id);
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message);
      throw response.error;
    }
  }

  async setActive(id: string, active: boolean): Promise<SpeechLine> {
    const client = await this.clientPromise;
    const response = await client.from("fuwafuwa_speech_lines").update({ active }).eq("id", id).select("*").single();
    if (response.error !== null) {
      await appendOperationLog("error", response.error.message);
      throw response.error;
    }
    return speechLineFromRow(response.data);
  }

  subscribeChanges(onChange: () => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription {
    let channel: ReturnType<FuwafuwaSupabaseClient["channel"]> | null = null;
    void this.clientPromise.then((client) => {
      channel = client
        .channel("fuwafuwa-speech-lines")
        .on("postgres_changes", { event: "*", schema: "public", table: "fuwafuwa_speech_lines" }, onChange)
        .subscribe((status) => onStatus(status === "SUBSCRIBED" ? "online" : "connecting"));
    });
    return {
      unsubscribe: async () => {
        const client = await this.clientPromise;
        if (channel !== null) {
          await client.removeChannel(channel);
        }
      },
    };
  }
}
