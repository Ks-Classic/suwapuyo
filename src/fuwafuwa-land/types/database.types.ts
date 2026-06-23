export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string;
          display_label: string;
          given_name: string | null;
          source: "photo" | "digital";
          image_path: string;
          width: number;
          height: number;
          display_scale: number;
          status: "queued" | "visible" | "hidden" | "archived";
          consent_scope: "event_only" | "sns_allowed" | "unknown";
          created_at: string;
          updated_at: string;
          last_shown_at: string | null;
          show_count: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          given_name?: string | null;
          source: "photo" | "digital";
          image_path: string;
          width: number;
          height: number;
          display_scale?: number;
          status?: "queued" | "visible" | "hidden" | "archived";
          consent_scope?: "event_only" | "sns_allowed" | "unknown";
          last_shown_at?: string | null;
          show_count?: number;
          notes?: string | null;
        };
        Update: {
          given_name?: string | null;
          source?: "photo" | "digital";
          image_path?: string;
          width?: number;
          height?: number;
          display_scale?: number;
          status?: "queued" | "visible" | "hidden" | "archived";
          consent_scope?: "event_only" | "sns_allowed" | "unknown";
          last_shown_at?: string | null;
          show_count?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      display_state: {
        Row: {
          id: "current";
          visible_artwork_ids: string[];
          featured_artwork_id: string | null;
          mode: "idle" | "random" | "featured" | "paused";
          max_visible_count: number;
          updated_at: string;
        };
        Insert: {
          id?: "current";
          visible_artwork_ids?: string[];
          featured_artwork_id?: string | null;
          mode?: "idle" | "random" | "featured" | "paused";
          max_visible_count?: number;
        };
        Update: {
          visible_artwork_ids?: string[];
          featured_artwork_id?: string | null;
          mode?: "idle" | "random" | "featured" | "paused";
          max_visible_count?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
