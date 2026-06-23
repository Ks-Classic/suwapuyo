export type ArtworkStatus = "queued" | "visible" | "hidden" | "archived";
export type ConsentScope = "event_only" | "sns_allowed" | "unknown";
export type DisplayMode = "idle" | "random" | "featured" | "paused";
export type ArtworkSource = "photo" | "digital";
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

export interface DisplayState {
  id: "current";
  visibleArtworkIds: string[];
  featuredArtworkId?: string;
  mode: DisplayMode;
  maxVisibleCount: number;
  updatedAt: string;
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
  subscribeDisplayState(onChange: (state: DisplayState) => void, onStatus: (status: ConnectionStatus) => void): RealtimeSubscription;
}

export interface FuwafuwaServices {
  repository: ArtworkRepository;
  displayState: DisplayStateService;
}
