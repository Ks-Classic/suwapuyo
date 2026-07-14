# すわぷよ・ツナやす 制作過程アーカイブ

> 文書状態: 制作過程、失敗、判断、証拠を再利用可能な資産へ変える正本
> 最終更新: 2026-07-13

## 1. 目的

完成品だけでなく、途中の違和感、バグ、判断の迷い、AIとの分担、修正前後、検証結果を保存し、次の4用途へ再利用する。

1. 実装時のセルフレビューと再発防止。
2. UIUX・サービス設計の判断根拠。
3. X、Instagram、Threads、note、自社サイト、解説モードの発信素材。
4. ツナやすが提供できる設計・制作・AI活用の実証。

本アーカイブは`.codex`等のエージェント内部ログを公開する場所ではない。秘密・個人情報・未許諾素材を除き、人が検証可能な事実と判断をプロジェクト資産として残す。

## 2. 情報の3段階

| 段階 | 内容 | Git | 公開 |
|---|---|---:|---:|
| Source | 外部会話URL、未加工録音、未許諾画像、内部ログ | 原則不可 | 不可 |
| Structured | 出典、発言者確度、論点、決定、失敗、証拠への参照 | 可 | 要レビュー |
| Publishable | 匿名化、許諾、事実確認、権利確認を通した記事・画像 | 可 | 公開可 |

Sourceを保存する必要がある場合は、アクセス制御されたDrive等を正とし、リポジトリにはURL、取得日、管理者、公開可否だけを記録する。

## 3. ディレクトリ

```text
docs/80_process-economy/
  00_index.md
  01_capture-and-publication-policy.md
  02_character-ip-and-account-strategy.md
  03_sns-launch-and-creative-spec.md
  04_cousin-vtuber-dance-pipeline-spec.md
  05_cousin-character-master-and-generative-governance.md
  06_character-consistency-technology-landscape-2026-07.md
  07_cousin-brand-and-social-series-bible.md
  08_operations-handbook.html
  09_cousin-character-canon-draft-v0.2.md
  10_agent-skill-inventory.md
  sns/01_やっ太郎_最初のやったろう_v0.1-rejected.md
  sns/02_やっ太郎_最初のやったろう_v0.2_最終回からつくる.md
  character-system/
    cousin-character-master.schema.json
    cousin-character-master.v0.1-observed.json
    cousin-generation-manifest.schema.json
    cousin-generation-manifest.template.json
  assets/
    asset-register.md
  evidence/
    README.md
    YYYY-MM-DD_topic/
      before-mobile.png
      after-mobile.png
      context.md
  records/
    YYYY-MM-DD_topic.md
  sources/
    source-register.md
  templates/
    process-record-template.md
```

## 4. 既存証拠との関係

- 結合テストの正式証拠は`docs/70_すわぷよ・ユアタイム統合仕様/05_テスト/evidence/`を正とする。
- 本アーカイブは、その証拠が「なぜ必要になり、何を学んだか」を説明する。
- 同じ画像を複製せず、可能な限り相対リンクで参照する。

## 5. 公開判定

公開候補は次を全て満たす。

- secret、token、生LINE ID、個人の年月・性別・行動個票がない。
- 会話参加者、出展者、キャラクター、画像、ロゴの公開許諾がある。
- 発言者が不明な内容を断定していない。
- 健康効果、成果、売上、検索順位等を根拠以上に表現していない。
- 未修正バグを公開しても利用者やシステムの安全を損なわない。
- 他者を失敗の責任者として見せず、仕組みと学びを中心にしている。

## 6. 読み順

1. `01_capture-and-publication-policy.md`
2. `02_character-ip-and-account-strategy.md`
3. `03_sns-launch-and-creative-spec.md`
4. `04_cousin-vtuber-dance-pipeline-spec.md`
5. `05_cousin-character-master-and-generative-governance.md`
6. `06_character-consistency-technology-landscape-2026-07.md`
7. `07_cousin-brand-and-social-series-bible.md`
8. `08_operations-handbook.html`
9. `09_cousin-character-canon-draft-v0.2.md`
10. `sns/01_やっ太郎_最初のやったろう_v0.1-rejected.md`
11. `sns/02_やっ太郎_最初のやったろう_v0.2_最終回からつくる.md`
12. `character-system/cousin-character-master.v0.1-observed.json`
13. `sources/source-register.md`
14. `records/`
