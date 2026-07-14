# Rich menu asset gate

リッチメニューの最終画像は、GPT Image 2の生成物だけを採用する。

必須条件:

- `generation_model` が `gpt-image-2`
- `generation_method` が `openai-imagegen`
- `status` が `approved`
- 人が `visual` と `text_exact` を確認済み
- マニフェストのSHA-256と画像が一致
- 2500×1686、JPEG/PNG、1MB以下

GPT Image 2の成果物を取得できない場合は、代替の画像合成・文字オーバーレイを最終版にしない。`tools/line/richmenu.mjs validate` が失敗した状態で止める。

マニフェストの雛形は `asset-manifest.example.json`。
