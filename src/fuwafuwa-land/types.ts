export type ArtworkStatus = "queued" | "visible" | "hidden" | "archived";
export type ConsentScope = "event_only" | "sns_allowed" | "unknown";
export type DisplayMode = "idle" | "random" | "featured" | "paused";
export type DisplayEventType = "battle";
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

export interface DisplayState {
  id: "current";
  visibleArtworkIds: string[];
  featuredArtworkId?: string;
  mode: DisplayMode;
  maxVisibleCount: number;
  displayEvent?: DisplayEvent | null;
  updatedAt: string;
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
  clearDisplayEvent(): Promise<DisplayState>;
  subscribeDisplayState(onChange: (state: DisplayState) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
}

export interface FuwafuwaServices {
  repository: ArtworkRepository;
  displayState: DisplayStateService;
  characterContent: CharacterContentRepository;
}
