export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      announcements: {
        Row: {
          id: string;
          text: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          text?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
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
      character_claim_tokens: {
        Row: {
          token: string;
          display_character_id: string;
          status: "active" | "claimed" | "revoked";
          expires_at: string;
          created_at: string;
          claimed_at: string | null;
        };
        Insert: {
          token?: string;
          display_character_id: string;
          status?: "active" | "claimed" | "revoked";
          expires_at?: string;
          created_at?: string;
          claimed_at?: string | null;
        };
        Update: {
          display_character_id?: string;
          status?: "active" | "claimed" | "revoked";
          expires_at?: string;
          claimed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "character_claim_tokens_display_character_id_fkey";
            columns: ["display_character_id"];
            referencedRelation: "display_characters";
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
          settings: Json;
          updated_at: string;
        };
        Insert: {
          id?: "current";
          visible_artwork_ids?: string[];
          featured_artwork_id?: string | null;
          mode?: "idle" | "random" | "featured" | "paused";
          max_visible_count?: number;
          display_event?: Json | null;
          settings?: Json;
        };
        Update: {
          visible_artwork_ids?: string[];
          featured_artwork_id?: string | null;
          mode?: "idle" | "random" | "featured" | "paused";
          max_visible_count?: number;
          display_event?: Json | null;
          settings?: Json;
        };
        Relationships: [];
      };
      fuwafuwa_speech_lines: {
        Row: {
          id: string;
          text: string;
          character_id: string | null;
          category: "idle" | "booth_intro";
          booth_ref: string | null;
          weight: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          character_id?: string | null;
          category?: "idle" | "booth_intro";
          booth_ref?: string | null;
          weight?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          text?: string;
          character_id?: string | null;
          category?: "idle" | "booth_intro";
          booth_ref?: string | null;
          weight?: number;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "fuwafuwa_speech_lines_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "display_characters";
            referencedColumns: ["id"];
          },
        ];
      };
      line_character_links: {
        Row: {
          id: string;
          line_user_id: string;
          display_character_id: string;
          claim_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          line_user_id: string;
          display_character_id: string;
          claim_token?: string | null;
          created_at?: string;
        };
        Update: {
          line_user_id?: string;
          display_character_id?: string;
          claim_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "line_character_links_display_character_id_fkey";
            columns: ["display_character_id"];
            referencedRelation: "display_characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "line_character_links_claim_token_fkey";
            columns: ["claim_token"];
            referencedRelation: "character_claim_tokens";
            referencedColumns: ["token"];
          },
        ];
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
    Functions: {
      claim_character: {
        Args: {
          p_token: string;
          p_line_user_id: string;
        };
        Returns: {
          display_character_id: string;
          label: string;
          image_path: string;
          source_type: "sample" | "artwork" | "sponsor";
          source_id: string;
        }[];
      };
      list_my_characters: {
        Args: {
          p_line_user_id: string;
        };
        Returns: {
          display_character_id: string;
          label: string;
          image_path: string;
          source_type: "sample" | "artwork" | "sponsor";
          source_id: string;
          linked_at: string;
        }[];
      };
    };
    Enums: {
      character_source_type: "sample" | "artwork" | "sponsor";
      display_character_status: "visible" | "hidden" | "archived";
      tap_event_type: "tap" | "popup_open" | "item_view" | "audio_play" | "cta_click";
    };
    CompositeTypes: Record<string, never>;
  };
}
