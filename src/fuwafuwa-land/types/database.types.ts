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
      display_characters: {
        Row: {
          id: string;
          source_type: "sample" | "artwork" | "sponsor";
          source_id: string;
          label: string;
          image_path: string;
          source_image_path: string | null;
          status: "visible" | "hidden" | "archived";
          display_scale: number;
          tap_enabled: boolean;
          tap_content_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          source_type: "sample" | "artwork" | "sponsor";
          source_id: string;
          label: string;
          image_path: string;
          source_image_path?: string | null;
          status?: "visible" | "hidden" | "archived";
          display_scale?: number;
          tap_enabled?: boolean;
          tap_content_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_type?: "sample" | "artwork" | "sponsor";
          source_id?: string;
          label?: string;
          image_path?: string;
          source_image_path?: string | null;
          status?: "visible" | "hidden" | "archived";
          display_scale?: number;
          tap_enabled?: boolean;
          tap_content_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "display_characters_tap_content_id_fkey";
            columns: ["tap_content_id"];
            referencedRelation: "tap_contents";
            referencedColumns: ["id"];
          },
        ];
      };
      display_state: {
        Row: {
          id: "current";
          visible_artwork_ids: string[];
          featured_artwork_id: string | null;
          mode: "idle" | "random" | "featured" | "paused";
          max_visible_count: number;
          display_event: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: "current";
          visible_artwork_ids?: string[];
          featured_artwork_id?: string | null;
          mode?: "idle" | "random" | "featured" | "paused";
          max_visible_count?: number;
          display_event?: Json | null;
        };
        Update: {
          visible_artwork_ids?: string[];
          featured_artwork_id?: string | null;
          mode?: "idle" | "random" | "featured" | "paused";
          max_visible_count?: number;
          display_event?: Json | null;
        };
        Relationships: [];
      };
      tap_content_items: {
        Row: {
          id: string;
          tap_content_id: string;
          sort_order: number;
          title: string | null;
          caption: string | null;
          image_path: string | null;
          video_path: string | null;
          audio_path: string | null;
          alt: string | null;
          thumbnail_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tap_content_id: string;
          sort_order?: number;
          title?: string | null;
          caption?: string | null;
          image_path?: string | null;
          video_path?: string | null;
          audio_path?: string | null;
          alt?: string | null;
          thumbnail_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tap_content_id?: string;
          sort_order?: number;
          title?: string | null;
          caption?: string | null;
          image_path?: string | null;
          video_path?: string | null;
          audio_path?: string | null;
          alt?: string | null;
          thumbnail_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tap_content_items_tap_content_id_fkey";
            columns: ["tap_content_id"];
            referencedRelation: "tap_contents";
            referencedColumns: ["id"];
          },
        ];
      };
      tap_contents: {
        Row: {
          id: string;
          title: string;
          body: string | null;
          cta_label: string | null;
          cta_url: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          body?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      tap_events: {
        Row: {
          id: string;
          event_type: "tap" | "popup_open" | "item_view" | "audio_play" | "cta_click";
          character_id: string | null;
          tap_content_id: string | null;
          item_id: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: "tap" | "popup_open" | "item_view" | "audio_play" | "cta_click";
          character_id?: string | null;
          tap_content_id?: string | null;
          item_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          event_type?: "tap" | "popup_open" | "item_view" | "audio_play" | "cta_click";
          character_id?: string | null;
          tap_content_id?: string | null;
          item_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tap_events_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "display_characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tap_events_tap_content_id_fkey";
            columns: ["tap_content_id"];
            referencedRelation: "tap_contents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tap_events_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "tap_content_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      character_source_type: "sample" | "artwork" | "sponsor";
      display_character_status: "visible" | "hidden" | "archived";
      tap_event_type: "tap" | "popup_open" | "item_view" | "audio_play" | "cta_click";
    };
    CompositeTypes: Record<string, never>;
  };
}
