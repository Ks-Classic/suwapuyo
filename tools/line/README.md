# LINEリッチメニュー運用ツール

開催前リッチメニューを検証・登録するCLI。LINE公式アカウントを固定ホーム、`VITE_SUWAPUYO_LIFF_ID`の単一LIFFをWeb体験本体とする。

## 秘密値と公開値

- `VITE_SUWAPUYO_LIFF_ID`: 公開されるLIFF ID。ローカルは`.env.local`へ置いてよい。
- `LINE_CHANNEL_ACCESS_TOKEN`: Messaging APIの秘密値。Gitや`.env.local`へ保存せず、CLIを実行するWSL shellの環境変数へ一時設定する。
- `LINE_CHANNEL_SECRET`: Webhookを実装するときだけCloudflare Worker Secretへ設定する。リッチメニュー登録CLIには不要。

## Codex用LINE MCP（WSL）

この端末では、公式の `@line/line-bot-mcp-server@0.5.0` を `line-bot` としてCodexへ登録する。Node.js 22はWSLの`~/.local/opt`に置き、ランチャーは`~/.local/bin/line-bot-mcp`である。MCP設定とGitには秘密値を入れない。

最初の一度だけ、Messaging APIのチャネルアクセストークンを専用ファイルへ入れる。

```bash
mkdir -p ~/.config/suwapuyo
cp ~/.config/suwapuyo/line-mcp.env.example ~/.config/suwapuyo/line-mcp.env
chmod 600 ~/.config/suwapuyo/line-mcp.env
${EDITOR:-vi} ~/.config/suwapuyo/line-mcp.env
```

記入するのは`CHANNEL_ACCESS_TOKEN`だけ（テスト配信を使う場合だけ`DESTINATION_USER_ID`も）である。反映にはCodexを再起動して新しいtaskを開く。

公式MCPはpreview版で、`create_rich_menu`が画像を自動生成して既定化する仕様である。承認済みのGPT Image 2画像を使う本案件では、その作成ツールを使わない。MCPは一覧確認・削除・既定化・テスト送信に限定し、画像のGate検査と作成・画像uploadは下記CLIを正とする。

## WSLでの確認

```bash
cd /home/ykoha/projects/suwapuyo
node tools/line/richmenu.mjs validate
node tools/line/richmenu.mjs definition
```

`validate`は画像が2500×1686、1MB以下、PNG/JPEGであることを確認し、SHA-256、5つの有効領域、未通過Gateを表示する。ネットワークアクセスやLINE側の変更は行わない。

さらに、`tools/richmenu/asset-manifest.json` が必須。マニフェストでGPT Image 2生成、最終画像のSHA-256、人による目視確認、文字完全一致確認が承認されていない画像は、定義確認・作成・uploadへ進めない。画像生成に失敗した場合は、PILやImageMagickで代替生成してGateを通してはならない。

## LINE側の参照

トークンを現在のWSL shellへ一時的に設定してから実行する。シェル履歴へ残したくない場合は、値をコマンド行へ直接書かず対話入力を使う。

```bash
read -rsp 'LINE channel access token: ' LINE_CHANNEL_ACCESS_TOKEN
export LINE_CHANNEL_ACCESS_TOKEN
printf '\n'
node tools/line/richmenu.mjs info
node tools/line/richmenu.mjs list
node tools/line/richmenu.mjs current-default
node tools/line/richmenu.mjs remote-validate
unset LINE_CHANNEL_ACCESS_TOKEN
```

## 作成と切替

```bash
node tools/line/richmenu.mjs create --confirm-create
read -rsp 'LINE test user ID: ' LINE_TEST_USER_ID
export LINE_TEST_USER_ID
printf '\n'
node tools/line/richmenu.mjs link-test RICH_MENU_ID --confirm-test-user
# iOS／Androidのテスト後
node tools/line/richmenu.mjs unlink-test --confirm-test-user
unset LINE_TEST_USER_ID
node tools/line/richmenu.mjs set-default RICH_MENU_ID --confirm-production
```

- `remote-validate`はLINE公式の`/v2/bot/richmenu/validate`で定義を検査するが、メニューを作成しない。
- `create`は明示確認後、LINE公式の定義検査を通してから定義作成と画像uploadだけを行い、全ユーザーのdefaultにはしない。
- `link-test`／`unlink-test`は`LINE_TEST_USER_ID`で指定した1人だけを対象にし、user IDを出力しない。
- `set-default`だけが全ユーザーの表示を変更する。人の画像承認、キーワード応答、per-userテスト、iOS／Android実機確認後に実行する。
- 誤作成した未使用メニューは、対象IDを再確認して`node tools/line/richmenu.mjs delete RICH_MENU_ID --confirm-delete`で削除できる。

## 開催前のアクション

| 領域 | アクション |
|---|---|
| すわぷよで遊ぶ | 単一LIFF URI |
| YourTIME.出展ブース紹介 | message actionで同名キーワードを送信 |
| YourTIME.日時／アクセス | message actionで同名キーワードを送信 |
| すわぷよって？ | message actionで同名キーワードを送信 |
| すわぷよの作り手 | message actionで同名キーワードを送信 |

キーワード応答本文は `tools/line/replies.json` を正とする。Official Account Managerまたは承認済みWebhookへ、キーと本文を同じまま登録する。未確認の出展者個別情報は追加しない。
