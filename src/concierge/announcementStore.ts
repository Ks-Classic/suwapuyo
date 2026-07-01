import { getSupabaseClient } from "../fuwafuwa-land/lib/supabase";

export interface Announcement {
  id: string;
  text: string;
  active: boolean;
  created_at: string;
}

type AnnouncementHandler = (announcement: Announcement) => void;

function isAnnouncement(value: unknown): value is Announcement {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.text === "string" &&
    typeof row.active === "boolean" &&
    typeof row.created_at === "string"
  );
}

export async function sendAnnouncement(text: string): Promise<Announcement | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 160) {
    throw new Error("announcement_text_invalid");
  }
  const client = getSupabaseClient();
  if (client === null) {
    return null;
  }
  const { data, error } = await client
    .from("announcements")
    .insert({ id: `demo-${crypto.randomUUID()}`, text: trimmed, active: true })
    .select()
    .single();
  if (error !== null) {
    throw error;
  }
  return isAnnouncement(data) ? data : null;
}

export function subscribeAnnouncements(onReceive: AnnouncementHandler): () => void {
  const client = getSupabaseClient();
  if (client === null) {
    return () => undefined;
  }
  const channel = client
    .channel("concierge-announcements")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "announcements", filter: "active=eq.true" },
      (payload) => {
        if (isAnnouncement(payload.new)) {
          onReceive(payload.new);
        }
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
