// 運営管理画面v2(08_設計書 §4)。SPは下部固定タブ、PCは2カラム。
// ランドタブ: 劇的イベント7種の発火 + BGM選択/音量 + 統合キャラ管理。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Artwork, BgmTrackId, ConnectionStatus, DisplayEventType, DisplayState, FuwafuwaServices } from "../types";
import { DEFAULT_BGM_VOLUME } from "../types";
import { ArtworkList } from "./ArtworkList";
import { CharacterList } from "./CharacterList";
import { SpeechLinePanel } from "./SpeechLinePanel";

export type OperationsTab = "home" | "artworks" | "land" | "drawing" | "devices";

interface StaffPanelProps {
  services: FuwafuwaServices;
  /** /staff/<tab> ディープリンク用。指定時はタブを外部制御する。 */
  tab?: OperationsTab;
  onTabChange?: (tab: OperationsTab) => void;
}

const EMPTY_DISPLAY_STATE: DisplayState = {
  id: "current",
  visibleArtworkIds: [],
  mode: "idle",
  maxVisibleCount: 12,
  displayEvent: null,
  settings: {},
  updatedAt: new Date(0).toISOString(),
};

// イベント演出はおよそ15〜20秒(08_設計書 §3)。この時間はボタンをdisableして連打を防ぐ。
const EVENT_RUNNING_MS = 20_000;
const BGM_VOLUME_SAVE_DEBOUNCE_MS = 600;

const EVENT_CARDS: readonly { type: DisplayEventType; icon: string; title: string; detail: string }[] = [
  { type: "battle", icon: "⚔️", title: "ふわふわバトル", detail: "みんな集合して迎え撃つ登場演出" },
  { type: "rainbow", icon: "🌈", title: "にじのアーチ", detail: "空に虹→集合→一斉ジャンプ" },
  { type: "fireworks", icon: "🎆", title: "はなびたいかい", detail: "夜空に花火、みんなで見上げる" },
  { type: "candy_rain", icon: "🍬", title: "キャンディのあめ", detail: "キャンディが降ってキャッチ大会" },
  { type: "train", icon: "🚂", title: "ぷよぷよれっしゃ", detail: "一列につながって画面を横断" },
  { type: "bubbles", icon: "🫧", title: "シャボンだまタイム", detail: "シャボン玉に乗ってふわ〜り上昇" },
  { type: "hero", icon: "🦸", title: "ヒーローとうじょう", detail: "主役キャラが巨大化して大かつやく" },
];

const BGM_TRACKS: readonly { id: BgmTrackId; label: string }[] = [
  { id: "fuwafuwa_march", label: "ふわふわマーチ" },
  { id: "hidamari_sanpo", label: "ひだまりさんぽ" },
  { id: "omatsuri", label: "おまつりばやし" },
  { id: "hoshizora_waltz", label: "ほしぞらワルツ" },
  { id: "off", label: "BGMなし" },
];

const TAB_ITEMS: readonly { tab: OperationsTab; icon: string; label: string }[] = [
  { tab: "home", icon: "🏠", label: "ホーム" },
  { tab: "artworks", icon: "🖼️", label: "作品" },
  { tab: "land", icon: "✨", label: "ランド" },
  { tab: "drawing", icon: "🖍️", label: "おえかき" },
  { tab: "devices", icon: "📱", label: "端末" },
];

const HOME_ACTIONS: Record<Exclude<OperationsTab, "home">, { title: string; detail: string; icon: string }> = {
  artworks: { title: "作品を見る", detail: "確認待ち・登場中の作品を選びます", icon: "🖼️" },
  land: { title: "ランドを整える", detail: "大画面の表示と演出を操作します", icon: "✨" },
  drawing: { title: "次の子を準備", detail: "色や線の太さを確認します", icon: "🖍️" },
  devices: { title: "端末を確認", detail: "タブレット・大画面の状態を見ます", icon: "📱" },
};

function connectionLabel(status: ConnectionStatus): string {
  if (status === "online") return "同期中";
  if (status === "connecting") return "接続中";
  if (status === "offline") return "オフライン";
  if (status === "missing-config") return "未設定";
  return "要確認";
}

function artworkStatusLabel(status: Artwork["status"]): string {
  if (status === "queued") return "確認待ち";
  if (status === "visible") return "ランドに登場中";
  if (status === "hidden") return "非表示";
  return "保管済み";
}

function eventTitle(type: DisplayEventType): string {
  return EVENT_CARDS.find((card) => card.type === type)?.title ?? type;
}

export function StaffPanel({ services, tab: controlledTab, onTabChange }: StaffPanelProps) {
  const [internalTab, setInternalTab] = useState<OperationsTab>(controlledTab ?? "home");
  const tab = controlledTab ?? internalTab;
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [displayState, setDisplayState] = useState<DisplayState>(EMPTY_DISPLAY_STATE);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [message, setMessage] = useState("タブレットから届いた作品を確認できます。");
  const [drawingSettings, setDrawingSettings] = useState({ palette: "8色", brush: "太め", guide: true, sound: true });
  const [eventPending, setEventPending] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bgmVolume, setBgmVolume] = useState(DEFAULT_BGM_VOLUME);
  const volumeTimerRef = useRef<number | null>(null);

  const acceptDisplayState = useCallback((state: DisplayState): void => {
    setDisplayState(state);
    if (volumeTimerRef.current === null) {
      setBgmVolume(state.settings.bgmVolume ?? DEFAULT_BGM_VOLUME);
    }
  }, []);

  const setTab = (next: OperationsTab): void => {
    setInternalTab(next);
    onTabChange?.(next);
  };

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [nextArtworks, nextDisplayState] = await Promise.all([services.repository.list(), services.displayState.getDisplayState()]);
      setArtworks(nextArtworks);
      acceptDisplayState(nextDisplayState);
      setConnectionStatus("online");
    } catch (error) {
      setConnectionStatus("error");
      setMessage(error instanceof Error ? error.message : "読み込みに失敗しました");
    }
  }, [acceptDisplayState, services.displayState, services.repository]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const artworkSubscription = services.repository.subscribeArtworkChanges(
      (artwork) => setArtworks((current) => [artwork, ...current.filter((item) => item.id !== artwork.id)]),
      setConnectionStatus,
    );
    const displaySubscription = services.displayState.subscribeDisplayState(acceptDisplayState, setConnectionStatus);
    return () => {
      window.clearTimeout(refreshTimer);
      void artworkSubscription.unsubscribe();
      void displaySubscription.unsubscribe();
    };
  }, [acceptDisplayState, refresh, services.displayState, services.repository]);

  const queued = useMemo(() => artworks.filter((artwork) => artwork.status === "queued"), [artworks]);
  const visible = useMemo(() => artworks.filter((artwork) => artwork.status === "visible"), [artworks]);
  const currentArtwork = queued[0];

  // イベント実行中判定: 残り時間表示と連打防止に使う。
  const activeEvent = displayState.displayEvent ?? null;
  useEffect(() => {
    if (activeEvent === null) {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeEvent]);
  const eventElapsedMs = activeEvent === null ? Number.POSITIVE_INFINITY : nowMs - Date.parse(activeEvent.startedAt);
  const eventRunning = activeEvent !== null && eventElapsedMs < EVENT_RUNNING_MS;
  const eventRemainingSec = eventRunning ? Math.max(0, Math.ceil((EVENT_RUNNING_MS - eventElapsedMs) / 1000)) : 0;

  // BGM音量: ドラッグ中はローカル値を優先し、debounce保存。
  useEffect(() => {
    return () => {
      if (volumeTimerRef.current !== null) {
        window.clearTimeout(volumeTimerRef.current);
      }
    };
  }, []);

  const currentBgm: BgmTrackId = displayState.settings.bgmTrackId ?? "off";

  const fireEvent = (type: DisplayEventType): void => {
    if (eventPending || eventRunning) {
      return;
    }
    setEventPending(true);
    void services.displayState
      .startDisplayEvent(type)
      .then(() => {
        setMessage(`「${eventTitle(type)}」を開始しました。`);
        return refresh();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "イベントを開始できませんでした"))
      .finally(() => setEventPending(false));
  };

  const stopEvent = (): void => {
    void services.displayState
      .clearDisplayEvent()
      .then(() => {
        setMessage("イベントを停止しました。");
        return refresh();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "イベントを停止できませんでした"));
  };

  const selectBgm = (trackId: BgmTrackId): void => {
    setDisplayState((current) => ({ ...current, settings: { ...current.settings, bgmTrackId: trackId } }));
    void services.displayState
      .updateSettings({ bgmTrackId: trackId })
      .then(() => refresh())
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "BGMを切り替えられませんでした"));
  };

  const changeBgmVolume = (value: number): void => {
    setBgmVolume(value);
    if (volumeTimerRef.current !== null) {
      window.clearTimeout(volumeTimerRef.current);
    }
    volumeTimerRef.current = window.setTimeout(() => {
      volumeTimerRef.current = null;
      void services.displayState
        .updateSettings({ bgmVolume: value })
        .then(() => refresh())
        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "音量を保存できませんでした"));
    }, BGM_VOLUME_SAVE_DEBOUNCE_MS);
  };

  const showArtwork = (artwork: Artwork): void => {
    setMessage("ランドへ送り出しています…");
    void services.displayState
      .showArtwork(artwork.id, "featured")
      .then(() => {
        setMessage(`${artwork.givenName ?? artwork.displayLabel} がランドに到着しました！`);
        return refresh();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "登場操作に失敗しました"));
  };

  const hideArtwork = (artwork: Artwork): void => {
    void services.displayState
      .hideArtwork(artwork.id)
      .then(() => {
        setMessage(`${artwork.givenName ?? artwork.displayLabel} を非表示にしました。`);
        return refresh();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "非表示にできませんでした"));
  };

  return (
    <main className="fuwafuwa-operations">
      <header className="fuwafuwa-operations-header">
        <a className="fuwafuwa-operations-brand" href="/fuwafuwa">
          <span aria-hidden="true">✦</span>
          <strong>ふわふわランド</strong>
          <small>運営</small>
        </a>
        <div className={`fuwafuwa-connection is-${connectionStatus}`}>
          <i aria-hidden="true" /> {connectionLabel(connectionStatus)}
        </div>
        <a className="fuwafuwa-display-launch" href="/display" target="_blank" rel="noreferrer">
          大画面を開く ↗
        </a>
      </header>

      <nav className="fuwafuwa-operations-tabbar" aria-label="運営メニュー">
        {TAB_ITEMS.map((item) => (
          <button key={item.tab} type="button" className={tab === item.tab ? "is-active" : ""} aria-current={tab === item.tab ? "page" : undefined} onClick={() => setTab(item.tab)}>
            <span aria-hidden="true">{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

      <div className="fuwafuwa-operations-main">
        {tab === "home" ? (
          <section className="fuwafuwa-operations-home" aria-labelledby="operations-home-title">
            <div className="fuwafuwa-operations-title">
              <p>いまのようす</p>
              <h1 id="operations-home-title">子どもが描いたら、ここでランドへ迎え入れます。</h1>
              <span>{message}</span>
            </div>
            <div className="fuwafuwa-operations-stats">
              <article><span>確認待ち</span><strong>{queued.length}</strong><small>スタッフの確認を待っています</small></article>
              <article><span>ランドに登場中</span><strong>{visible.length}</strong><small>作品とキャラがふわふわ動いています</small></article>
              <article><span>表示上限</span><strong>{displayState.maxVisibleCount}</strong><small>いま表示できるキャラの数です</small></article>
            </div>
            <section className="fuwafuwa-queue-card" aria-label="確認待ちの作品">
              <div>
                <p>次に確認する作品</p>
                <h2>{currentArtwork === undefined ? "いまは待機中です" : currentArtwork.givenName ?? currentArtwork.displayLabel}</h2>
                <span>{currentArtwork === undefined ? "タブレットで「できた！」が押されると、ここに届きます。" : artworkStatusLabel(currentArtwork.status)}</span>
              </div>
              {currentArtwork === undefined ? (
                <a className="fuwafuwa-operations-secondary" href="/fuwafuwa/draw">子ども用お絵描きを開く</a>
              ) : (
                <div className="fuwafuwa-queue-actions">
                  <button type="button" className="fuwafuwa-operations-primary" onClick={() => showArtwork(currentArtwork)}>ランドへ！</button>
                  <button type="button" onClick={() => hideArtwork(currentArtwork)}>今回は見せない</button>
                </div>
              )}
            </section>
            <div className="fuwafuwa-operations-next">
              <a href="/fuwafuwa/draw">次の子のお絵描きへ</a>
              <button type="button" onClick={() => void refresh()}>状態を更新</button>
            </div>
            <section className="fuwafuwa-operations-quick-actions" aria-label="ホームから開く操作">
              {(Object.keys(HOME_ACTIONS) as Exclude<OperationsTab, "home">[]).map((item) => (
                <button key={item} type="button" onClick={() => setTab(item)}>
                  <span aria-hidden="true">{HOME_ACTIONS[item].icon}</span>
                  <strong>{HOME_ACTIONS[item].title}</strong>
                  <small>{HOME_ACTIONS[item].detail}</small>
                  <i aria-hidden="true">→</i>
                </button>
              ))}
            </section>
          </section>
        ) : null}

        {tab === "artworks" ? (
          <section className="fuwafuwa-operations-section">
            <div className="fuwafuwa-operations-section-title"><p>作品</p><h1>確認待ち、登場中、非表示をここで管理します。</h1></div>
            <ArtworkList artworks={artworks} repository={services.repository} displayState={services.displayState} onRefresh={() => void refresh()} />
          </section>
        ) : null}

        {tab === "land" ? (
          <section className="fuwafuwa-operations-section">
            <div className="fuwafuwa-operations-section-title"><p>ランド</p><h1>大画面の空気を、ここから整えます。</h1></div>

            <section className="fuwafuwa-event-section" aria-label="劇的イベント">
              <div className="fuwafuwa-panel-title">
                <strong>イベント発火</strong>
                <span>ワンタップで大画面に演出が流れます</span>
              </div>
              {activeEvent !== null ? (
                <div className="fuwafuwa-event-running" role="status">
                  <strong>「{eventTitle(activeEvent.type)}」{eventRunning ? ` 実行中 のこり約${eventRemainingSec}秒` : " の演出が終わりました"}</strong>
                  <button type="button" className="is-danger" onClick={stopEvent}>イベントを停止</button>
                </div>
              ) : null}
              <div className="fuwafuwa-event-grid">
                {EVENT_CARDS.map((card) => (
                  <button key={card.type} type="button" className="fuwafuwa-event-card" disabled={eventPending || eventRunning} onClick={() => fireEvent(card.type)}>
                    <span aria-hidden="true">{card.icon}</span>
                    <strong>{card.title}</strong>
                    <small>{card.detail}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="fuwafuwa-bgm-section" aria-label="BGM">
              <div className="fuwafuwa-panel-title">
                <strong>BGM</strong>
                <span>大画面の「音ON」後に流れます</span>
              </div>
              <div className="fuwafuwa-bgm-tracks" role="group" aria-label="BGM選択">
                {BGM_TRACKS.map((trackItem) => (
                  <button key={trackItem.id} type="button" className={currentBgm === trackItem.id ? "is-active" : ""} onClick={() => selectBgm(trackItem.id)}>
                    {trackItem.label}
                  </button>
                ))}
              </div>
              <label className="fuwafuwa-scale-control fuwafuwa-bgm-volume">
                <span>音量 {Math.round(bgmVolume * 100)}%</span>
                <input type="range" min="0" max="1" step="0.05" value={bgmVolume} onChange={(event) => changeBgmVolume(Number(event.currentTarget.value))} />
              </label>
            </section>

            {services.speechLines === undefined ? null : (
              <SpeechLinePanel services={services} speechIntervalMs={displayState.settings.speechIntervalMs} />
            )}

            <div className="fuwafuwa-land-controls">
              <article><strong>表示中 {visible.length}体</strong><span>作品と既存キャラがランドで動いています。</span><button type="button" onClick={() => void services.displayState.pauseToggle().then(refresh)}>一時停止 / 再開</button></article>
              <article><strong>安全操作</strong><span>問題があれば表示を止め、作品は非表示として残します。</span><button type="button" onClick={stopEvent}>イベントを停止</button></article>
            </div>

            <section className="fuwafuwa-character-section" aria-label="キャラクター管理">
              <div className="fuwafuwa-panel-title">
                <strong>キャラクター</strong>
                <span>名前・大きさ・表示・QR・タップコンテンツ</span>
              </div>
              <CharacterList repository={services.characterContent} artworkRepository={services.repository} />
            </section>
          </section>
        ) : null}

        {tab === "drawing" ? (
          <section className="fuwafuwa-operations-section">
            <div className="fuwafuwa-operations-section-title"><p>お絵描き設定</p><h1>次の子から使う、描きやすさの設定です。</h1><span>描いている途中の子の画面は変えません。</span></div>
            <div className="fuwafuwa-setting-grid">
              <label>色の数<select value={drawingSettings.palette} onChange={(event) => setDrawingSettings((current) => ({ ...current, palette: event.currentTarget.value }))}><option>8色</option><option>6色</option></select></label>
              <label>最初の線<select value={drawingSettings.brush} onChange={(event) => setDrawingSettings((current) => ({ ...current, brush: event.currentTarget.value }))}><option>太め</option><option>ふつう</option></select></label>
              <label className="fuwafuwa-setting-toggle"><input type="checkbox" checked={drawingSettings.guide} onChange={(event) => setDrawingSettings((current) => ({ ...current, guide: event.currentTarget.checked }))} /> 薄いお絵描きガイドを出す</label>
              <label className="fuwafuwa-setting-toggle"><input type="checkbox" checked={drawingSettings.sound} onChange={(event) => setDrawingSettings((current) => ({ ...current, sound: event.currentTarget.checked }))} /> 完成時に音を鳴らす</label>
            </div>
            <p className="fuwafuwa-setting-note">この設定はUIデモのローカル状態です。端末をまたいだ保存は、運営認証・同期方式のGate確定後に配線します。</p>
          </section>
        ) : null}

        {tab === "devices" ? (
          <section className="fuwafuwa-operations-section">
            <div className="fuwafuwa-operations-section-title"><p>端末・設定</p><h1>会場の端末が、同じ体験を見ているかを確認します。</h1></div>
            <div className="fuwafuwa-device-grid">
              <article><span>子ども用タブレット</span><strong>お絵描き専用</strong><small>描く以外の管理操作は表示しません。</small><a href="/fuwafuwa/draw">画面を開く</a></article>
              <article><span>運営PC / スマホ</span><strong>{connectionLabel(connectionStatus)}</strong><small>作品・ランド・設定は同じ状態を使います。</small><button type="button" onClick={() => void refresh()}>再接続を確認</button></article>
              <article><span>大画面</span><strong>表示専用</strong><small>会場モニターにはランドだけを映します。</small><a href="/display" target="_blank" rel="noreferrer">表示画面を開く</a></article>
            </div>
            <p className="fuwafuwa-setting-note">認証方式と、回線断時の新規作品同期は未確定です。本番配線前に運営認証・会場復旧方式を固定します。</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
