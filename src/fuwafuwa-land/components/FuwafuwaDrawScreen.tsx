import { useEffect, useState } from "react";
import { DigitalCanvas } from "../digital/DigitalCanvas";
import { setBuddy } from "../../shared/buddyStore";
import { track } from "../../shared/analytics";
import "../styles.css";

export function FuwafuwaDrawScreen() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("きみの“なかま”を描こう！どんな子でもいいぞ〜！");

  useEffect(() => {
    return () => {
      if (previewUrl !== null) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function complete(blob: Blob, width: number, height: number): Promise<void> {
    if (previewUrl !== null) {
      URL.revokeObjectURL(previewUrl);
    }
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
    setPreviewUrl(URL.createObjectURL(blob));
    setMessage("おお〜っ、いい子だ！村に つれて行こう！");
    track("cta_click", { surface: "fuwafuwa_draw", id: "set_buddy", url: "/" });
  }

  return (
    <main className="fuwafuwa-home fuwafuwa-draw-page">
      <section className="fuwafuwa-panel">
        <div className="fuwafuwa-draw-narrator">
          <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="わーわー村長" />
          <p>{message}</p>
        </div>
        <DigitalCanvas width={320} height={420} onComplete={(blob, width, height) => void complete(blob, width, height)} />
        <div className="fuwafuwa-demo-flags" aria-label="登場先">
          <span>ふわふわランド表示は管理画面で登録</span>
          <strong>すわぷよにも登場: ON</strong>
        </div>
        {previewUrl !== null ? (
          <div className="fuwafuwa-preview-wrap">
            <span>あたらしいなかま</span>
            <img src={previewUrl} alt="描いたなかま" className="fuwafuwa-preview" />
            <a className="fuwafuwa-primary-action fuwafuwa-play-link" href="/">
              すわぷよで遊ぶ
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
