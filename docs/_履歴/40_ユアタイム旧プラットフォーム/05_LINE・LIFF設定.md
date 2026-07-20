# 05 — LINE公式アカウント＋単一LIFF セットアップ手順

> **2026-07-13更新**: 旧「村の案内所」デモ手順を廃止し、すわぷよLINE公式アカウントを固定ホーム、`VITE_SUWAPUYO_LIFF_ID`のLIFF 1つをWeb体験本体とする現行手順へ更新した。公開先はCloudflare Pagesであり、Vercelは本番に使わない。
>
> 正本: `docs/_履歴/30_すわぷよ旧仕様/07_LINE必須LIFF仕様.md`。LINE Developersの画面・要件が変わり得るため、外部設定時は公式ドキュメントも再確認する。

---

## 全体像
```
LINE Developers Console
 ├ STEP1 プロバイダー確認
 ├ STEP2 LINE LoginチャネルにLIFFアプリを1つ登録
 └ STEP3 LIFFと既存Messaging APIチャネル（公式アカウント）を連携
LINE Official Account Manager
 └ STEP4 あいさつ、友だち追加QR、リッチメニュー、キーワード応答を設定
```

---

## STEP1: プロバイダー作成
1. https://developers.line.biz/console/ に **個人のLINEアカウント** でログイン。
2. 「Create a new provider」→ 名前（例: `TsunaYasu`）→ 作成。
   - プロバイダー＝アプリ群の入れ物。1つでよい。

## STEP2: LINE Loginチャネルと単一LIFFを確認

1. 既存のLINE Loginチャネルを使う。なければ、公式アカウントのMessaging APIチャネルと**同じプロバイダー内**に1つ作る。
2. LINE LoginチャネルのBasic settingsで、すわぷよLINE公式アカウントをLinked LINE Official Accountとして設定する。
3. LINE LoginチャネルのLIFFタブで既存のすわぷよLIFFを1つだけ使う。入口を増やす目的で新しいLIFFを複製しない。
4. 設定値:
   - LIFF app name: `すわぷよ`
   - Size: `Full`
   - Endpoint URL: `https://suwapuyo.pages.dev/`
   - Scope: `openid`、`profile`
   - Add friend option: `On (aggressive)`。起動後も`getFriendship()`で確認し、未追加／ブロック中は`requestFriendship()`の理由を表示する
5. 発行済みLIFF IDをローカルの`.env.local`では`VITE_SUWAPUYO_LIFF_ID`へ設定する。旧`VITE_LIFF_ID`を増やさない。

> LIFFアプリはLINE Loginチャネルへ追加する。Messaging APIチャネルへLIFFを直接追加する旧記述は使用しない。LINE LoginチャネルとMessaging APIチャネルが異なるプロバイダーにある場合、同じLINE user IDとして扱えないため、本番前に所属プロバイダーを確認する。
>
> LINE公式は新規アプリにLINE MINI Appも推奨しているが、今回は発行済みのすわぷよLIFFを統合先として維持する。別アプリへの移行は認証・URL・実機検証へ影響するため、この作業の中で暗黙に行わない。

## STEP3: 入口とrouteを分ける

- 通常入口: LINE公式アカウントの友だち追加QR → あいさつ／リッチメニュー → LIFF。
- リッチメニューのゲームURI: `https://liff.line.me/{VITE_SUWAPUYO_LIFF_ID}/?source=richmenu_before`。
- 作品QR: `https://liff.line.me/{VITE_SUWAPUYO_LIFF_ID}/claim/{opaque_token}`。作品ID、LINE user ID、個人情報をQRへ直接入れない。
- LIFF IDは1つのまま、ゲーム、マップ、ブース、スタンプ、作品受取をrouteで分ける。

## STEP4: 公式アカウント側の仕上げ（LINE Official Account Manager）
1. https://manager.line.biz/ に同じLINEアカウントでログイン → 該当アカウントを選択。
2. 友だち追加直後のあいさつで、リッチメニューから「すわぷよ」「出店ブース」「日時・アクセス」を開けることを短く説明する。
3. 友だち追加QR/URLを通常入口として取得する。
4. 開催前リッチメニューは`docs/70_すわぷよ・ユアタイム統合仕様/06_運用/04_5枠リッチメニュー制作・登録仕様.md`に従う。
5. `YourTIME 出店ブース`と`YourTIME 日時・アクセス`の応答は、確定情報だけをOfficial Account Managerまたは承認済みWebhookへ設定する。

---

## 木幡が用意して渡すもの（チェックリスト）
- [ ] `VITE_SUWAPUYO_LIFF_ID`とLIFF URL
- [ ] LINE LoginチャネルとMessaging APIチャネルが同じプロバイダーであること
- [ ] LIFFのEndpointがCloudflare Pages本番URLであること
- [ ] LINE公式アカウントの友だち追加QR
- [ ] 開催前リッチメニュー画像の最終承認
- [ ] 出店カテゴリ、日時、アクセス、申込／チケットの正規URL
- [ ] iOS／Android LINE内の実機確認

## つまずきポイント
- `VITE_SUWAPUYO_LIFF_ID`は公開IDであり、チャネルアクセストークンではない。
- `LINE_CHANNEL_ACCESS_TOKEN`はリッチメニューCLI実行中のWSL shell環境変数にだけ置き、`.env.local`、Git、`VITE_`変数、Cloudflare Pagesへ保存しない。
- クライアントから受け取ったID token/access tokenを本人確認の根拠にするときは、Product WorkerでLINEへ検証してから内部sessionを発行する。クライアント送信のuser ID文字列だけを信用しない。
- ログイン、友だち追加、サービス同意／データ利用説明を1つの同意として扱わない。
- 子ども単独利用と保護者確認年齢はONBOARD-303のGateが決まるまで推測しない。
