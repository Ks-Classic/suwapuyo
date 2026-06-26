import { useRef, useState } from "react";
import type { Artwork, CharacterContentRepository, ConsentScope, ProcessedArtwork, RegisterArtworkInput, ArtworkRepository, TransparencyMode } from "../types";
import { captureVideoFrame, fileToCanvas, startEnvironmentCamera, stopCamera, waitForDrawableVideoFrame } from "../capture/camera";
import { processArtworkCanvas } from "../capture/processArtwork";
import { DigitalCanvas } from "../digital/DigitalCanvas";
import { normalizeGivenName } from "../utils/id";

interface RegisterFormProps {
  repository: ArtworkRepository;
  characterContent: CharacterContentRepository;
  onRegistered: (artwork: Artwork) => void;
}

type InputMode = "camera" | "upload" | "digital";

const TRANSPARENCY_OPTIONS: { mode: TransparencyMode; label: string; description: string }[] = [
  { mode: "coloring-sheet", label: "台紙用", description: "外枠を避けて白背景だけ透過" },
  { mode: "edge-white", label: "白背景", description: "端からつながる白だけ透過" },
  { mode: "none", label: "そのまま", description: "透過せず四角画像で登録" },
];

export function RegisterForm({ repository, characterContent, onRegistered }: RegisterFormProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceFallbackRef = useRef(true);
  const sourceMessageRef = useRef("プレビューを更新しました");
  const [processed, setProcessed] = useState<ProcessedArtwork | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [givenName, setGivenName] = useState("");
  const [consentScope, setConsentScope] = useState<ConsentScope>("event_only");
  const [transparencyMode, setTransparencyMode] = useState<TransparencyMode>("coloring-sheet");
  const [mode, setMode] = useState<InputMode>("camera");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasPreview = processed !== null;

  function setPreview(next: ProcessedArtwork): void {
    if (previewUrl !== null) {
      URL.revokeObjectURL(previewUrl);
    }
    setProcessed(next);
    setPreviewUrl(URL.createObjectURL(next.blob));
  }

  function clearPreview(): void {
    if (previewUrl !== null) {
      URL.revokeObjectURL(previewUrl);
    }
    setProcessed(null);
    setPreviewUrl(null);
  }

  function switchMode(nextMode: InputMode): void {
    if (nextMode !== "camera" && streamRef.current !== null) {
      stopCamera(streamRef.current);
      streamRef.current = null;
    }
    setMode(nextMode);
    setMessage(null);
  }

  async function processCanvas(canvas: HTMLCanvasElement, fallback: boolean, successMessage: string, modeOverride: TransparencyMode = transparencyMode): Promise<void> {
    setBusy(true);
    try {
      sourceCanvasRef.current = canvas;
      sourceFallbackRef.current = fallback;
      sourceMessageRef.current = successMessage;
      const next = await processArtworkCanvas(canvas, fallback, modeOverride);
      setPreview(next);
      setMessage(next.ok ? successMessage : "切り出しできなかったため、全体画像として登録準備しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "process_failed");
    } finally {
      setBusy(false);
    }
  }

  async function captureFromCamera(fallback: boolean, successMessage: string): Promise<void> {
    const video = videoRef.current;
    if (video === null) {
      setMessage("camera_not_ready");
      return;
    }
    setBusy(true);
    try {
      if (streamRef.current === null) {
        setMessage("カメラを起動しています");
        streamRef.current = await startEnvironmentCamera(video);
      }
      await waitForDrawableVideoFrame(video);
      await processCanvas(captureVideoFrame(video), fallback, successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "capture_failed");
      setBusy(false);
    }
  }

  async function processFile(file: File, successMessage: string): Promise<void> {
    try {
      const canvas = await fileToCanvas(file);
      await processCanvas(canvas, true, successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "file_load_failed");
    }
  }

  async function changeTransparencyMode(nextMode: TransparencyMode): Promise<void> {
    setTransparencyMode(nextMode);
    if (mode === "digital" || sourceCanvasRef.current === null || processed === null) {
      return;
    }
    await processCanvas(sourceCanvasRef.current, sourceFallbackRef.current, sourceMessageRef.current, nextMode);
  }

  async function register(showOnDisplay: boolean): Promise<void> {
    if (processed === null) {
      return;
    }
    setBusy(true);
    try {
      const input: RegisterArtworkInput = {
        source: mode === "digital" ? "digital" : "photo",
        imageBlob: processed.blob,
        width: processed.width,
        height: processed.height,
        givenName: normalizeGivenName(givenName),
        consentScope,
      };
      const artwork = await repository.register(input);
      if (!showOnDisplay) {
        await characterContent.setCharacterStatus(artwork.id, "hidden");
      }
      onRegistered(artwork);
      clearPreview();
      setGivenName("");
      setMessage(showOnDisplay ? "登録して表示キャラ一覧に追加しました" : "登録して非表示キャラ一覧に追加しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "register_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fuwafuwa-panel fuwafuwa-register-panel">
      <div className="fuwafuwa-mode-tabs" role="tablist" aria-label="入力方法">
        <button type="button" onClick={() => switchMode("camera")} className={mode === "camera" ? "is-active" : ""}>
          カメラ
        </button>
        <button type="button" onClick={() => switchMode("upload")} className={mode === "upload" ? "is-active" : ""}>
          画像
        </button>
        <button type="button" onClick={() => switchMode("digital")} className={mode === "digital" ? "is-active" : ""}>
          描く
        </button>
      </div>
      {mode === "camera" ? (
        <div className="fuwafuwa-stack">
          <label className="fuwafuwa-upload-drop fuwafuwa-camera-capture">
            <strong>カメラで撮って使う</strong>
            <span>スマホ標準カメラで撮影して、そのままプレビューします</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file !== undefined) {
                  void processFile(file, "撮影画像を登録準備しました");
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
          <video ref={videoRef} playsInline muted className="fuwafuwa-video" />
          <div className="fuwafuwa-action-grid">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const video = videoRef.current;
                if (video !== null) {
                  void startEnvironmentCamera(video)
                    .then((stream) => {
                      streamRef.current = stream;
                      setMessage("カメラ準備完了");
                    })
                    .catch((error: unknown) => {
                      setMessage(error instanceof Error ? error.message : "camera_start_failed");
                    });
                }
              }}
            >
              カメラ開始
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void captureFromCamera(false, "マーカー切り出し完了")}
            >
              撮影してプレビュー
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void captureFromCamera(true, "全体画像として登録準備しました")}
            >
              全体で使う
            </button>
            <button
              type="button"
              onClick={() => {
                if (streamRef.current !== null) {
                  stopCamera(streamRef.current);
                  streamRef.current = null;
                }
              }}
            >
              停止
            </button>
          </div>
        </div>
      ) : null}
      {mode === "upload" ? (
        <div className="fuwafuwa-stack">
          <label className="fuwafuwa-upload-drop">
            <strong>画像ファイルを選ぶ</strong>
            <span>撮影済みの絵やスクリーンショットをそのまま登録できます</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file !== undefined) {
                  void processFile(file, "画像を登録準備しました");
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      ) : null}
      {mode === "digital" ? (
        <DigitalCanvas
          width={320}
          height={420}
          onComplete={(blob, width, height) => {
            sourceCanvasRef.current = null;
            setPreview({ blob, width, height, ok: true, warnings: [] });
            setMode("digital");
          }}
        />
      ) : null}
      {mode !== "digital" ? (
        <div className="fuwafuwa-transparency-box" aria-label="透過モード">
          <div className="fuwafuwa-transparency-title">
            <strong>背景</strong>
            <span>{TRANSPARENCY_OPTIONS.find((item) => item.mode === transparencyMode)?.description}</span>
          </div>
          <div className="fuwafuwa-segmented">
            {TRANSPARENCY_OPTIONS.map((item) => (
              <button
                key={item.mode}
                type="button"
                disabled={busy}
                className={transparencyMode === item.mode ? "is-active" : ""}
                onClick={() => void changeTransparencyMode(item.mode)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {previewUrl !== null ? (
        <div className="fuwafuwa-preview-wrap">
          <span>プレビュー</span>
          <img src={previewUrl} alt="preview" className="fuwafuwa-preview" />
        </div>
      ) : null}
      <div className="fuwafuwa-form-grid">
        <input value={givenName} maxLength={24} placeholder="下の名前（任意）" onChange={(event) => setGivenName(event.currentTarget.value)} />
        <select value={consentScope} onChange={(event) => setConsentScope(event.currentTarget.value as ConsentScope)}>
          <option value="event_only">会場のみ</option>
          <option value="sns_allowed">SNS可</option>
          <option value="unknown">未確認</option>
        </select>
      </div>
      <div className="fuwafuwa-submit-bar">
        <button type="button" disabled={busy || !hasPreview} onClick={() => void register(true)} className="fuwafuwa-primary-action">
          登録して表示
        </button>
        <button type="button" disabled={busy || !hasPreview} onClick={() => void register(false)}>
          登録のみ
        </button>
      </div>
      {message !== null ? <p className="fuwafuwa-message">{message}</p> : null}
    </section>
  );
}
