// キャラQR発行モーダル(08_設計書 §4.2/§5.3)。
// 運営がキャラ行の「QR」から開き、claimトークンを発行してQRを表示・保存・印刷する。
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { ClaimToken, DisplayCharacter } from "../types";
import { createClaimToken, listClaimTokens, revokeClaimToken } from "../store/claimStore";

interface CharacterQrModalProps {
  character: DisplayCharacter;
  onClose: () => void;
  /** テスト差し替え用。省略時は VITE_SUWAPUYO_LIFF_ID を使う。 */
  liffId?: string;
}

const QR_CANVAS_SIZE = 280;

// QRに載せるURL。LIFF IDがあればLIFFディープリンク、なければ自ホストの /claim ルート。
export function buildClaimUrl(token: string, liffId: string | undefined, origin: string): string {
  const trimmedLiffId = liffId?.trim() ?? "";
  if (trimmedLiffId.length > 0) {
    return `https://liff.line.me/${trimmedLiffId}?claim=${encodeURIComponent(token)}`;
  }
  return `${origin}/claim?token=${encodeURIComponent(token)}`;
}

export function claimTokenStatusLabel(token: ClaimToken, now: Date = new Date()): string {
  if (token.status === "claimed") {
    return "使用済み";
  }
  if (token.status === "revoked") {
    return "失効";
  }
  if (Date.parse(token.expiresAt) < now.getTime()) {
    return "期限切れ";
  }
  return "有効";
}

function isUsableToken(token: ClaimToken): boolean {
  return token.status === "active" && Date.parse(token.expiresAt) > Date.now();
}

function envLiffId(): string | undefined {
  return import.meta.env.VITE_SUWAPUYO_LIFF_MODE === "demo" ? undefined : (import.meta.env.VITE_SUWAPUYO_LIFF_ID as string | undefined);
}

export function CharacterQrModal({ character, onClose, liffId = envLiffId() }: CharacterQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tokens, setTokens] = useState<ClaimToken[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const claimUrl = activeToken === null ? null : buildClaimUrl(activeToken, liffId, window.location.origin);

  const reloadTokens = useCallback(async (): Promise<ClaimToken[]> => {
    const loaded = await listClaimTokens(character.id);
    setTokens(loaded);
    return loaded;
  }, [character.id]);

  // 開いたとき: 既存の有効トークンがあれば再利用、なければ新規発行(QR1枚=1トークン)。
  useEffect(() => {
    let active = true;
    setBusy(true);
    void reloadTokens()
      .then(async (loaded) => {
        const usable = loaded.find(isUsableToken);
        if (usable !== undefined) {
          return usable.token;
        }
        const created = await createClaimToken(character.id);
        if (active) {
          setTokens((current) => [created, ...current]);
        }
        return created.token;
      })
      .then((token) => {
        if (active) {
          setActiveToken(token);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "qr_token_issue_failed");
        }
      })
      .finally(() => {
        if (active) {
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [character.id, reloadTokens]);

  // トークン確定後にcanvasへQR描画。
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || claimUrl === null) {
      return;
    }
    void QRCode.toCanvas(canvas, claimUrl, { width: QR_CANVAS_SIZE, margin: 2 }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "qr_render_failed");
    });
  }, [claimUrl]);

  const issueNewToken = (): void => {
    setBusy(true);
    void createClaimToken(character.id)
      .then((created) => {
        setActiveToken(created.token);
        setMessage("あたらしいQRを発行しました");
        return reloadTokens();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "qr_token_issue_failed"))
      .finally(() => setBusy(false));
  };

  const revoke = (token: string): void => {
    setBusy(true);
    void revokeClaimToken(token)
      .then(() => {
        setMessage("QRを失効させました");
        if (token === activeToken) {
          setActiveToken(null);
        }
        return reloadTokens();
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "qr_token_revoke_failed"))
      .finally(() => setBusy(false));
  };

  const savePng = (): void => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    canvas.toBlob((blob) => {
      if (blob === null) {
        setMessage("qr_png_failed");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${character.label}_QR.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="fuwafuwa-qr-overlay" role="dialog" aria-modal="true" aria-label={`${character.label} のQRコード`}>
      <div className="fuwafuwa-qr-modal">
        <button type="button" className="fuwafuwa-qr-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <div className="fuwafuwa-qr-print-area">
          <strong className="fuwafuwa-qr-name">{character.label}</strong>
          <div className="fuwafuwa-qr-canvas-wrap">
            {activeToken === null ? <span className="fuwafuwa-qr-placeholder">{busy ? "QRを発行中…" : "有効なQRがありません"}</span> : null}
            <canvas ref={canvasRef} width={QR_CANVAS_SIZE} height={QR_CANVAS_SIZE} aria-label="claim QRコード" />
          </div>
          <p className="fuwafuwa-qr-guide">すわぷよLINEで よみこんでね</p>
          {claimUrl !== null ? <small className="fuwafuwa-qr-url">{claimUrl}</small> : null}
        </div>
        <div className="fuwafuwa-qr-actions">
          <button type="button" disabled={busy || activeToken === null} onClick={savePng}>
            PNG保存
          </button>
          <button type="button" disabled={busy || activeToken === null} onClick={() => window.print()}>
            印刷
          </button>
          <button type="button" disabled={busy} onClick={issueNewToken}>
            あたらしいQRを発行
          </button>
        </div>
        <section className="fuwafuwa-qr-token-list" aria-label="発行済みトークン">
          <h3>発行済みQR</h3>
          {tokens.length === 0 ? <p className="fuwafuwa-message">まだ発行していません</p> : null}
          <ul>
            {tokens.map((token) => (
              <li key={token.token} className={token.token === activeToken ? "is-current" : ""}>
                <span className={`fuwafuwa-qr-token-status is-${token.status}`}>{claimTokenStatusLabel(token)}</span>
                <small>{new Date(token.createdAt).toLocaleString("ja-JP")} 発行</small>
                {isUsableToken(token) ? (
                  <button type="button" className="is-danger" disabled={busy} onClick={() => revoke(token.token)}>
                    失効
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        {message !== null ? <p className="fuwafuwa-message">{message}</p> : null}
      </div>
    </div>
  );
}
