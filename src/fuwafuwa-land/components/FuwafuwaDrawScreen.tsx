import { useCallback, useEffect, useState } from "react";
import { DigitalCanvas } from "../digital/DigitalCanvas";
import { setBuddy } from "../../shared/buddyStore";
import { track } from "../../shared/analytics";
import type { FuwafuwaServices } from "../types";
import "../styles.css";

// 到着祝福のあと、自動で次の子のおえかき画面へ戻るまでの時間。
const ARRIVED_RESET_MS = 7000;
const INITIAL_MESSAGE = "きみの“なかま”を描こう！どんな子でもいいぞ〜！";

interface FuwafuwaDrawScreenProps {
  services?: FuwafuwaServices;
  /** テスト用に自動復帰時間を差し替える。 */
  arrivedResetMs?: number;
}

export function FuwafuwaDrawScreen({ services, arrivedResetMs = ARRIVED_RESET_MS }: FuwafuwaDrawScreenProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const [phase, setPhase] = useState<"drawing" | "sending" | "waiting" | "arrived">("drawing");
  const [artworkId, setArtworkId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl !== null) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (services === undefined || artworkId === null) return;
    const subscription = services.repository.subscribeArtworkChanges(
      (artwork) => {
        if (artwork.id === artworkId && artwork.status === "visible") {
          setPhase("arrived");
          setMessage("わあ！きみのなかまが ランドに とうちゃくしたよ！大きな画面を見てね！");
        }
      },
      () => undefined,
    );
    return () => {
      void subscription.unsubscribe();
    };
  }, [artworkId, services]);

  // 次の子がすぐ描けるように初期状態へ戻す(スタッフ操作なしで連続運用できる)。
  const resetForNext = useCallback((): void => {
    setPreviewUrl(null);
    setArtworkId(null);
    setPhase("drawing");
    setMessage(INITIAL_MESSAGE);
  }, []);

  // 承認されて到着したら、祝福演出のあと自動で新しいおえかきへ。
  useEffect(() => {
    if (phase !== "arrived") {
      return;
    }
    const timer = window.setTimeout(resetForNext, arrivedResetMs);
    return () => window.clearTimeout(timer);
  }, [arrivedResetMs, phase, resetForNext]);

  async function complete(blob: Blob, width: number, height: number): Promise<void> {
    if (previewUrl !== null) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(blob));
    setPhase("sending");
    setMessage("おお〜っ、いい子だ！村へ つれて行くじゅんび中だよ！");
    if (services !== undefined) {
      try {
        const artwork = await services.repository.register({
          source: "digital",
          imageBlob: blob,
          width,
          height,
          consentScope: "event_only",
          // キオスクからの投稿はスタッフ承認(表示操作)まで大画面に出さない
          characterStatus: "hidden",
        });
        setArtworkId(artwork.id);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "作品をあずかれませんでした。スタッフをよんでね。");
        setPhase("waiting");
        return;
      }
    } else {
      await setBuddy({
        artworkId: `local-${Date.now()}`,
        label: "自分の絵",
        image: blob,
        width,
        height,
        scale: 0.6,
        source: "fuwafuwa-local",
        createdAt: new Date().toISOString(),
      });
    }
    setMessage("おお〜っ、いい子だ！スタッフさんが村に つれて行ってくれるよ！");
    setPhase("waiting");
    track("cta_click", { surface: "fuwafuwa_draw", id: "set_buddy", url: "/" });
  }

  return (
    <main className="fuwafuwa-home fuwafuwa-draw-page">
      <section className="fuwafuwa-child-stage">
        <div className="fuwafuwa-draw-narrator">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="わーわー村長" />
          <p>{message}</p>
        </div>
        {phase === "drawing" ? <DigitalCanvas width={900} height={1200} onComplete={(blob, width, height) => void complete(blob, width, height)} /> : null}
        {previewUrl !== null ? (
          <div className="fuwafuwa-child-waiting" aria-live="polite">
            <span className="fuwafuwa-child-waiting-star" aria-hidden="true">✦</span>
            <span>あたらしいなかま</span>
            <img src={previewUrl} alt="描いたなかま" className="fuwafuwa-preview" />
            <strong>{phase === "sending" ? "村へ送っているよ…" : phase === "arrived" ? "とうちゃく！大きな画面を見てね！" : "もうすぐランドに とうちゃく！"}</strong>
            {phase === "arrived" ? <small className="fuwafuwa-draw-next-note">まもなく つぎのおえかきに もどるよ</small> : null}
            {phase === "waiting" ? (
              <button type="button" className="fuwafuwa-draw-again" onClick={resetForNext}>
                またかいてね
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
