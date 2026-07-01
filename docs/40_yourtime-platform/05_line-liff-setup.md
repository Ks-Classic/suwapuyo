# 05 — LINEテスト公式アカウント＋LIFF セットアップ手順

> 目的: 明日の感動デモ（`03`§12 / `04`）を動かすための **テスト用LINE公式アカウント＋LIFFアプリ** を用意し、Codexに渡す `LIFF_ID` を取得する。
> 所要: 30〜45分。**HTTPSのデプロイ先URLが要る**（先にVercel等へデモを上げるか、ローカルはトンネル）。
> ※ コンソールのボタン文言は時期で多少変わる。構造は同じ。

---

## 全体像（3ステップ＋仕上げ）
```
LINE Developers Console
 ├ STEP1 プロバイダー作成
 ├ STEP2 Messaging APIチャネル作成（＝公式アカウントが紐づく）
 └ STEP3 LIFFアプリ追加 → 【LIFF_ID / LIFF URL】取得 ★Codexに渡す
LINE Official Account Manager
 └ STEP4 あいさつメッセージ＋友だち追加QR（＝受付QR）
```

---

## STEP1: プロバイダー作成
1. https://developers.line.biz/console/ に **個人のLINEアカウント** でログイン。
2. 「Create a new provider」→ 名前（例: `TsunaYasu`）→ 作成。
   - プロバイダー＝アプリ群の入れ物。1つでよい。

## STEP2: Messaging APIチャネル作成（公式アカウントが付いてくる）
1. プロバイダー内 →「Create a new channel」→ **Messaging API** を選択。
2. 入力:
   - チャネル名（＝公式アカウント名）: 例 `村の案内所（テスト）`
   - 説明 / 大業種・小業種 / メール / 地域=日本 など必須項目。
3. 作成すると **LINE公式アカウントが自動で出来る**（友だち追加QRはSTEP4で取得）。
4. （会場アナウンスを**LINE全体配信でやる場合のみ**）「Messaging API設定」タブで **チャネルアクセストークン（long-lived）** を発行してメモ。Realtime方式（推奨）なら不要。
   - Webhookは今回 **不要**（あいさつは管理画面で設定するため）。

> 補足: LIFFで `userId` を取るのに必要な LINE Login は、Messaging APIチャネルにLIFFを足せば内部で有効になる（別途LINE Loginチャネルを作らなくてよい）。

## STEP3: LIFFアプリ追加（★ここで LIFF_ID が出る）
1. 作ったチャネル →「**LIFF**」タブ →「Add」。
2. 入力:
   - LIFF app name: 例 `村の案内所`
   - Size: **Full**（全画面）
   - **Endpoint URL**: デモのデプロイ先 ＋ `/concierge`
     - 例: `https://fuwafuwa-land.vercel.app/concierge`（または専用デプロイ/プレビューURL）
     - ローカル検証は `cloudflared`/`ngrok` のHTTPSを一時利用。
   - Scope: **`profile`** に必ずチェック（＝`liff.getProfile().userId`）。`openid` は任意。
   - Bot link feature: **On（Aggressive）** 任意（LIFFから友だち追加を促せる）。
3. 作成後に発行される:
   - **LIFF ID**: 例 `2000000000-xxxxxxxx`
   - **LIFF URL**: `https://liff.line.me/{LIFF_ID}`  ← **これがブースQRの素**
4. ★ **この2つ（LIFF_ID / LIFF URL）をCodexに渡す**（`04`の `{LIFF_ID}`）。
   - ブースQR = `https://liff.line.me/{LIFF_ID}?booth=demo-01` を `qrcode` でPNG化。
   - 標準カメラで撮ってもLINEが開く（ユニバーサルリンク）。

## STEP4: 公式アカウント側の仕上げ（LINE Official Account Manager）
1. https://manager.line.biz/ に同じLINEアカウントでログイン → 該当アカウントを選択。
2. **あいさつメッセージ**: 友だち追加直後に届くメッセージを設定。
   - 文面＋「**はじめる**」ボタン（リンク= LIFF URL `https://liff.line.me/{LIFF_ID}`）を入れる。
   - ※ 友だち追加で **自動的にLIFFは開かない**。「追加 → あいさつが届く → 『はじめる』をタップ → アンケート」の**1タップ挟む**のが実装上の正（デモ説明でもこの流れ）。
3. **友だち追加QR/URL**（＝**受付QR**）をここで取得 → 受付掲示や打合せで読んでもらう。
4. リッチメニュー（マップ/スタンプ帳/すわぷよ…）は本番で設定（デモは任意）。

---

## 木幡が用意して渡すもの（チェックリスト）
- [ ] **LIFF_ID / LIFF URL**（STEP3）→ Codex / config へ
- [ ] デモのデプロイ先HTTPS URL（Endpoint）
- [ ] 既存ふわふわランド **Supabase接続情報**（相乗り・会場アナウンスRealtime用）
- [ ] （LINE全体配信で会場アナウンスする場合のみ）**チャネルアクセストークン**
- [ ] **受付QR**（友だち追加・管理画面から）
- [ ] `map_sample.jpg` をリポに配置

## つまずきポイント
- Endpoint は **HTTPS必須**。`http://localhost` は不可 → デプロイ or トンネル。
- `userId` はLINEアプリ内（またはLIFFログイン後）でのみ取得可。外部ブラウザ直開きは `liff.login()` 経由。デモは諏訪さんのLINEで動かすので不問。
- Endpoint URLは後から変更可。先にURLを決めてデプロイ→LIFFに設定、の順が楽。
