export type ArtworkStatus = "queued" | "visible" | "hidden" | "archived";
export type ConsentScope = "event_only" | "sns_allowed" | "unknown";
export type DisplayMode = "idle" | "random" | "featured" | "paused";
// 劇的イベント: 既存バトル + 08_設計書 §3 の6種
export type DisplayEventType = "battle" | "rainbow" | "fireworks" | "candy_rain" | "train" | "bubbles" | "hero";
export const DISPLAY_EVENT_TYPES: readonly DisplayEventType[] = ["battle", "rainbow", "fireworks", "candy_rain", "train", "bubbles", "hero"];
// BGM: WebAudio合成4曲 + OFF(08_設計書 §1.2)
export type BgmTrackId = "fuwafuwa_march" | "hidamari_sanpo" | "omatsuri" | "hoshizora_waltz" | "off";
export const BGM_TRACK_IDS: readonly BgmTrackId[] = ["fuwafuwa_march", "hidamari_sanpo", "omatsuri", "hoshizora_waltz", "off"];
export const DEFAULT_BGM_VOLUME = 0.5;
export const DEFAULT_SPEECH_INTERVAL_MS = 30_000;
export type ArtworkSource = "photo" | "digital";
export type DisplayCharacterSourceType = "sample" | "artwork" | "sponsor";
export type DisplayCharacterStatus = "visible" | "hidden" | "archived";
export type TapEventType = "tap" | "popup_open" | "item_view" | "audio_play" | "cta_click";
export type TapContentMediaKind = "image" | "video" | "audio";
export type ConnectionStatus = "missing-config" | "connecting" | "online" | "offline" | "error";
export type TransparencyMode = "coloring-sheet" | "edge-white" | "none";
export const DEFAULT_ARTWORK_DISPLAY_SCALE = 0.6;

export interface Artwork {
  id: string;
  displayLabel: string;
  givenName?: string;
  source: ArtworkSource;
  imageBlobKey: string;
  width: number;
  height: number;
  displayScale: number;
  status: ArtworkStatus;
  consentScope: ConsentScope;
  createdAt: string;
  updatedAt: string;
  lastShownAt?: string;
  showCount: number;
  notes?: string;
}

export interface DisplayCharacter {
  id: string;
  sourceType: DisplayCharacterSourceType;
  sourceId: string;
  label: string;
  imagePath: string;
  sourceImagePath?: string;
  status: DisplayCharacterStatus;
  displayScale: number;
  tapEnabled: boolean;
  tapContentId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TapContent {
  id: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TapContentItem {
  id: string;
  tapContentId: string;
  sortOrder: number;
  title?: string;
  caption?: string;
  imagePath?: string;
  videoPath?: string;
  audioPath?: string;
  alt?: string;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TapEventMeta {
  index?: number;
  sourceType?: DisplayCharacterSourceType;
  contentItemKind?: TapContentMediaKind;
}

export interface TapContentDraft {
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isPublished?: boolean;
}

export interface TapContentItemDraft {
  id?: string;
  sortOrder: number;
  title?: string;
  caption?: string;
  imagePath?: string;
  videoPath?: string;
  audioPath?: string;
  alt?: string;
  thumbnailPath?: string;
}

export interface CharacterContentBundle {
  character: DisplayCharacter;
  content: TapContent | null;
  items: TapContentItem[];
}

// display_state.settings (jsonb) に保存する表示画面の設定
export interface DisplaySettings {
  bgmTrackId?: BgmTrackId;
  bgmVolume?: number;
  speechIntervalMs?: number;
}

export type SpeechLineCategory = "idle" | "booth_intro";

export interface SpeechLine {
  id: string;
  text: string;
  characterId: string | null;
  category: SpeechLineCategory;
  boothRef: string | null;
  weight: number;
  active: boolean;
  createdAt: string;
}

export interface SpeechLineDraft {
  text: string;
  characterId: string | null;
  weight: number;
}

export interface DisplayState {
  id: "current";
  visibleArtworkIds: string[];
  featuredArtworkId?: string;
  mode: DisplayMode;
  maxVisibleCount: number;
  displayEvent?: DisplayEvent | null;
  settings: DisplaySettings;
  updatedAt: string;
}

// キャラQRクレーム用トークン(character_claim_tokens 行)
export type ClaimTokenStatus = "active" | "claimed" | "revoked";

export interface ClaimToken {
  token: string;
  displayCharacterId: string;
  status: ClaimTokenStatus;
  expiresAt: string;
  createdAt: string;
  claimedAt: string | null;
}

export interface DisplayEvent {
  id: string;
  type: DisplayEventType;
  startedAt: string;
}

export type OperationType = "register" | "show" | "feature" | "hide" | "archive" | "reset" | "random" | "error";

export interface OperationLog {
  id: string;
  type: OperationType;
  artworkId?: string;
  message: string;
  createdAt: string;
}

export interface RegisterArtworkInput {
  source: ArtworkSource;
  imageBlob: Blob;
  width: number;
  height: number;
  givenName?: string;
  consentScope: ConsentScope;
  notes?: string;
  // display_characters へ upsert する際の初期状態。省略時 "visible"(従来動作)。
  // キオスクお絵かきは "hidden" を渡してスタッフ承認待ちにする。
  characterStatus?: "visible" | "hidden";
}

export interface ProcessedArtwork {
  blob: Blob;
  width: number;
  height: number;
  templateId?: string;
  ok: boolean;
  warnings: string[];
}

export interface MetricsSnapshot {
  fps: number;
  artworkCount: number;
  visibleCount: number;
  connectionStatus: ConnectionStatus;
  storageUsageBytes?: number;
  storageQuotaBytes?: number;
  heapUsedBytes?: number;
}

export interface RealtimeSubscription {
  unsubscribe(): Promise<void>;
}

export interface ArtworkRepository {
  register(input: RegisterArtworkInput): Promise<Artwork>;
  list(filter?: { status?: ArtworkStatus; query?: string }): Promise<Artwork[]>;
  getById(id: string): Promise<Artwork | null>;
  getImageURL(id: string): Promise<string>;
  setStatus(id: string, status: ArtworkStatus): Promise<Artwork>;
  setDisplayScale(id: string, scale: number): Promise<Artwork>;
  markShown(ids: string[]): Promise<void>;
  subscribeArtworkChanges(onChange: (artwork: Artwork) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
}

export interface CharacterContentRepository {
  listCharacters(filter?: { status?: DisplayCharacterStatus; sourceType?: DisplayCharacterSourceType; query?: string }): Promise<DisplayCharacter[]>;
  getCharacterContent(characterId: string): Promise<CharacterContentBundle | null>;
  setCharacterStatus(id: string, status: DisplayCharacterStatus): Promise<DisplayCharacter>;
  setCharacterDisplayScale(id: string, scale: number): Promise<DisplayCharacter>;
  setCharacterLabel(id: string, label: string): Promise<void>;
  saveTapContent(characterId: string, draft: TapContentDraft, items: TapContentItemDraft[]): Promise<CharacterContentBundle>;
  getMediaPublicUrl(path: string): string;
  uploadMedia(input: { characterId: string; kind: TapContentMediaKind; file: File | Blob; contentType: string; extension: string }): Promise<string>;
  track(input: { type: TapEventType; characterId?: string; tapContentId?: string; itemId?: string; meta?: TapEventMeta }): Promise<void>;
  subscribeCharacterChanges(onChange: (character: DisplayCharacter) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
  subscribeContentChanges(onChange: () => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
}

export interface DisplayStateService {
  getDisplayState(): Promise<DisplayState>;
  updateDisplayState(patch: Partial<Omit<DisplayState, "id" | "updatedAt">>): Promise<DisplayState>;
  showArtwork(id: string, mode: "normal" | "featured"): Promise<DisplayState>;
  hideArtwork(id: string): Promise<DisplayState>;
  archiveArtwork(id: string): Promise<DisplayState>;
  resetDisplay(): Promise<DisplayState>;
  randomizeDisplay(count: number, includeAlreadyShown: boolean): Promise<DisplayState>;
  setMaxVisible(count: number): Promise<DisplayState>;
  pauseToggle(): Promise<DisplayState>;
  startBattleEvent(): Promise<DisplayState>;
  startDisplayEvent(type: DisplayEventType): Promise<void>;
  updateSettings(patch: Partial<DisplaySettings>): Promise<void>;
  clearDisplayEvent(): Promise<DisplayState>;
  subscribeDisplayState(onChange: (state: DisplayState) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
}

export interface SpeechLineRepository {
  list(): Promise<SpeechLine[]>;
  add(draft: SpeechLineDraft): Promise<SpeechLine>;
  remove(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<SpeechLine>;
  subscribeChanges(onChange: () => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
}

export interface FuwafuwaServices {
  repository: ArtworkRepository;
  displayState: DisplayStateService;
  characterContent: CharacterContentRepository;
  speechLines: SpeechLineRepository;
}
