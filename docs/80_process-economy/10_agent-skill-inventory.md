# 開発エージェントSkill棚卸し

> 更新日: 2026-07-13
> 対象: すわぷよ開発で見えるCodex Skill。アプリ本体の機能ではない。

## 判定

| 区分 | Skill / Plugin | 判定 | 対応 |
|---|---|---|---|
| workspace | `waawaa-short` | 廃止 | 正本Python・素材参照が失効していたため削除。動画制作を再開するときは現行`shorts/render.py`から新規設計する |
| workspace | `suwapuyo-sns-image` | 使用可 | 表示名を`すわぷよSNS画像制作`とし、4:5、文字、公式やす原画、公開Gateを検査する |
| 個人WSL | `webhook-resilience` | 配置不適切 | 個人領域から削除し、Liberate AIX workspaceの`review-webhook`へ移管 |
| Codex標準 | `imagegen`、`openai-docs`、Skill / Plugin管理 | 使用可・管理対象外 | 直接改名・削除しない |
| Plugin管理 | Browser、Chrome、Computer Use、Figma、GitHub、Gmail、Calendar、Documents、Presentations、Spreadsheets、Sites、Visualize | 必要時使用 | cacheを直接削除しない。不要ならPlugin単位で無効化する |

## 常用方針

- 常用: Browser、画像生成、ドキュメント、GitHub。
- 必要時だけ: Chrome、Computer Use、Figma、Gmail、Calendar、Sites、Presentations、Spreadsheets、Visualize。
- FigmaやGmail等を一定期間使わない場合、Skill個別ではなく提供Pluginを無効化する。
- System SkillとPlugin Skillの英語内部名は変更しない。workspace Skillは`agents/openai.yaml`の日本語表示名で用途を明確にする。

## workspace Skillの合格条件

1. 一つの明確な仕事だけを担当する。
2. 表示名だけで成果物が分かる。
3. SSoT、script、素材パスが存在する。
4. scriptを実行検証している。
5. `quick_validate.py`が成功する。
6. 壊れたSkillを注意書きだけで延命しない。必要なら削除し、現行実装から作り直す。

## 現在の正本

- SNS画像: `.agents/skills/suwapuyo-sns-image/`
- ショート動画: Skillなし。現行実装は`shorts/render.py`だが、既存sampleがvalidatorを通らないため再Skill化しない。
- Webhook: すわぷよ対象外。`/home/ykoha/projects/Liberate-aix/.agents/skills/review-webhook/`へ移管。
