# やすのいとこ キャラクターIP設計・ブランド・SNSシリーズバイブル

> 文書状態: キャラクターIP設計v0.9。名称・造形数値・人格核・口調の最終承認前。2026-07-13の権利承認を前提に企画を進める
> 最終更新: 2026-07-13
> 正本境界: 造形は`05`、技術方式は`06`、本書はキャラクターIP、人格、物語生成、ブランド、編集、投稿運用を扱う
> 306項目へ実際に回答したやっ太郎のキャラ案は[`09_cousin-character-canon-draft-v0.2.md`](./09_cousin-character-canon-draft-v0.2.md)を参照する。項目体系は本書、値は`09`を正とする。

# Part I. キャラクターIP設計システム

## A. キャラクター設計とは何か

長期で強いキャラクターは、プロフィール項目が多いキャラクターではない。次の因果がつながり、異なる状況でも「そのキャラなら、そうする」と理解できる一方、ときどき意外な選択で観客を驚かせられるキャラクターである。

```text
過去の体験
  → 世界への誤信念・恐れ
  → 本人が欲しいもの
  → 本当は必要なもの
  → 守る価値・越えない一線
  → 状況下の優先順位
  → 行動・言葉・表情
  → 成功・失敗・関係変化
  → 少しずつ更新される自己像
```

設計対象は「性格」だけではない。`内面エンジン`、`意思決定エンジン`、`関係性エンジン`、`物語生成エンジン`、`ブランドエンジン`、`運用ガバナンス`の6系統を持つ。

| 系統 | 解く問い | 欠けた場合 |
|---|---|---|
| 内面 | なぜ、それを望み、恐れるのか | 属性の寄せ集めになる |
| 意思決定 | 圧力下で何を優先するか | 脚本ごとに別人格になる |
| 関係性 | 相手によって何が引き出されるか | 一人語りしか生まれない |
| 物語生成 | 何度でもどんな事件を生むか | 1投稿で設定を使い切る |
| ブランド | 読者と事業へ何を約束するか | 人気と目的が分離する |
| ガバナンス | 何を変え、何を変えないか | AI・外注・媒体で崩れる |

## B. 項目の状態と優先度

各項目は必ず`unknown / hypothesis / reviewed / approved / deprecated`のいずれかを持つ。空欄を暗黙の自由とみなさない。

| 優先度 | 意味 | 公開条件 |
|---|---|---|
| P0 Identity Core | 変えると別キャラになる | 初回公開前にapproved |
| P1 Story Engine | 継続物語を生む | 最初の3〜12投稿前にreviewed |
| P2 Brand System | 媒体・事業展開を守る | 広告・案件・商品化前にapproved |
| P3 Enrichment | 深みを増やす詳細 | 必要なepisode前までhypothesis可 |

項目の変化属性も分ける。

- `Invariant`: 変えない核。
- `Range`: 状況で動くが上下限がある。
- `Arc`: 物語を通じて変化する。
- `Variant`: 衣装・世界線等の明示された別版。
- `Unknown`: 作者がまだ決めていない。

## B2. 学術的・実務的な位置づけ

CB-001〜306が、そのまま一つの学問分野で標準化・実証されたチェックリストという意味ではない。次の三層を統合した、すわぷよ固有の制作・運用フレームワークである。

| 根拠層 | 支持される考え方 | 本書での利用 | 言い過ぎてはいけないこと |
|---|---|---|---|
| Peer-reviewed research | キャラクター同一視、ナラティブ没入、パラソーシャル関係、ブランド擬人化と愛着 | 対象者との関係、感情、識別、愛着、倫理、評価 | 特定の性格設定なら必ず人気になる、とは証明しない |
| Professional craft | purpose/action/agency、欲求と変化、modular character、関係arc、visual narrative | ドラマコア、意思決定、関係、物語生成、演技 | want/need等が唯一の正解、とは扱わない |
| Project governance | Canon、権利、AI drift、媒体変換、商品・案件、rollback | ブランド、AIエージェント、承認、変更統制 | 項目数が多いほど良いキャラ、とは扱わない |

研究上比較的支持されるのは、観客がキャラクターを理解・同一視・想像し、継続的関係を感じ得ること、物語への没入が態度や記憶へ影響し得ること、ブランドの人間化が愛着へ関係し得ること等である。一方、`傷・誤信念・欲求・真実`等は、脚本・ナラティブ制作で有効な因果モデルだが、全キャラクターへ必須という科学法則ではない。

したがって、本書の正しさは「306項目を埋めたか」ではなく、次で検証する。

1. 別の制作者でも、未知状況で似た行動を予測できる。
2. 同じ核から、反復ではない複数episodeが生まれる。
3. 観客が狙った性格・関係・価値を想起する。
4. 意外な行動でも、後から因果を説明できる。
5. 媒体・AI・外注が変わっても、人格と尊厳が崩れない。

## C. キャラクター設計項目カタログ

以下は複合語を可能な限り分解した原子項目である。全てを長文で埋めるのではなく、各項目を1〜3文、例、禁止例、状態、根拠IDで管理する。

### C01. IP・ブランド上の存在理由

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-001 | Creator intent | なぜこのキャラを作るのか | P0 |
| CB-002 | Audience value | 観客がこのキャラから受け取る価値 | P0 |
| CB-003 | Social role | 社会・コミュニティ内で担う役割 | P1 |
| CB-004 | Product role | すわぷよ体験で担う役割 | P0 |
| CB-005 | Business role | ツナやす事業へどう貢献するか | P2 |
| CB-006 | Emotional promise | 会うたび、どんな感情を約束するか | P0 |
| CB-007 | Functional promise | 会うたび、何を分かる／できるようにするか | P1 |
| CB-008 | Cultural contribution | 世の中にどんな新しい見方を増やすか | P2 |
| CB-009 | Non-purpose | このキャラを使わない目的 | P0 |
| CB-010 | Success definition | 人気以外に何を成功とするか | P2 |

### C02. 対象者と関係契約

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-011 | Primary audience | 第一対象者を一種類で定義 | P0 |
| CB-012 | Secondary audience | 第二対象者 | P2 |
| CB-013 | Audience problem | 対象者が抱える未解決 | P1 |
| CB-014 | Desired self | 対象者がなりたい自分 | P1 |
| CB-015 | Entry emotion | 初見時に感じてほしい感情 | P0 |
| CB-016 | Returning emotion | 再訪時に期待してほしい感情 | P1 |
| CB-017 | Relationship metaphor | 友達、後輩、先生、相棒等の距離感 | P0 |
| CB-018 | Intimacy boundary | 親密でも越えない境界 | P0 |
| CB-019 | Participation role | 観客が傍観者・助言者・共犯者のどれか | P1 |
| CB-020 | Growth benefit | キャラを追うことで観客がどう変わるか | P1 |

### C03. 識別・存在プロフィール

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-021 | Official name | 正式名 | P0 |
| CB-022 | Name origin | 名の由来と物語内認知 | P2 |
| CB-023 | Self-name | 自分を何と呼ぶか | P0 |
| CB-024 | Other-name | 相手別の呼ばれ方 | P1 |
| CB-025 | Species | 種・存在分類 | P0 |
| CB-026 | Apparent age | 見た目の年齢感 | P0 |
| CB-027 | Mental age | 判断・感情の成熟度 | P1 |
| CB-028 | Gender expression | 必要な場合の表現 | P1 |
| CB-029 | Origin place | どこから来たか | P2 |
| CB-030 | Current home | 今どこにいるか | P2 |
| CB-031 | Occupation | 物語内の仕事 | P0 |
| CB-032 | Public identity | 周囲が認識する肩書 | P1 |
| CB-033 | Private identity | 本人だけが思う自分 | P1 |
| CB-034 | One-line definition | 初見に一文で伝える定義 | P0 |

### C04. ドラマティック・コア

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-035 | External want | 本人が自覚して追う具体目標 | P0 |
| CB-036 | Internal need | 本人がまだ気づかない成長課題 | P0 |
| CB-037 | Core fear | 最も避けたい状態 | P0 |
| CB-038 | Core wound | 恐れの起点となる体験・不足 | P1 |
| CB-039 | Lie / misbelief | 世界・自分について信じる誤り | P0 |
| CB-040 | Truth | 最終的に学び得る真実 | P0 |
| CB-041 | Conscious motive | 本人が説明する行動理由 | P1 |
| CB-042 | Unconscious motive | 本人が認めていない行動理由 | P1 |
| CB-043 | External stakes | 失敗すると現実に何を失うか | P1 |
| CB-044 | Internal stakes | 失敗すると自己像がどう傷つくか | P1 |
| CB-045 | Relationship stakes | 誰との関係を失うか | P1 |
| CB-046 | Urgency trigger | 今動かなければならない理由 | P1 |
| CB-047 | Temptation | 間違った近道として何に弱いか | P1 |
| CB-048 | Shame secret | 知られたくない弱さ | P2 |

### C05. 価値観・倫理・一線

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-049 | Highest value | 最優先で守る価値 | P0 |
| CB-050 | Second value | 平時の第二優先 | P1 |
| CB-051 | Value conflict | 二価値が衝突する代表状況 | P0 |
| CB-052 | Justice definition | 本人にとっての正しさ | P1 |
| CB-053 | Success definition | 本人にとっての勝ち | P1 |
| CB-054 | Failure definition | 本人にとっての負け | P1 |
| CB-055 | Non-negotiable | 絶対にしないこと | P0 |
| CB-056 | Breakable rule | 追い込まれると破り得る規則 | P1 |
| CB-057 | Forgiveness rule | 誰の何を許せるか | P2 |
| CB-058 | Apology rule | 何をもって謝罪とするか | P1 |
| CB-059 | Responsibility rule | 失敗の責任をどう取るか | P0 |
| CB-060 | Means/end boundary | 良い目的でも使わない手段 | P0 |

### C06. 意思決定アルゴリズム

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-061 | Attention bias | 最初に何へ気づくか | P1 |
| CB-062 | Information need | 動く前に最低何を知りたいか | P1 |
| CB-063 | Default action | 迷った時の初手 | P0 |
| CB-064 | Risk threshold | どの程度の危険で止まるか | P0 |
| CB-065 | Time preference | 即時成果と長期成果のどちらを選ぶか | P1 |
| CB-066 | Self/other priority | 自分と相手の利益が衝突した時 | P1 |
| CB-067 | Truth/comfort priority | 厳しい真実と優しい嘘の選択 | P1 |
| CB-068 | Rule/result priority | 規則と結果が衝突した時 | P1 |
| CB-069 | Authority response | 権威に従う・疑う条件 | P2 |
| CB-070 | Uncertainty response | 不明時に試す、待つ、聞くの優先 | P0 |
| CB-071 | Failure response | 失敗直後の第一反応 | P0 |
| CB-072 | Success response | 成功直後の第一反応 | P1 |
| CB-073 | Betrayal response | 信頼を裏切られた時 | P2 |
| CB-074 | Pressure inversion | 極限時に平時と逆転する性質 | P1 |

### C07. 能力・限界・代償

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-075 | Signature strength | 代表的な強み | P0 |
| CB-076 | Learned skill | 努力で得た技能 | P1 |
| CB-077 | Natural talent | 生来の得意 | P2 |
| CB-078 | Knowledge domain | 詳しい領域 | P1 |
| CB-079 | Blind spot | 気づけない領域 | P0 |
| CB-080 | Practical weakness | 行動を妨げる弱み | P0 |
| CB-081 | Emotional weakness | 感情上の弱点 | P1 |
| CB-082 | Resource limit | 時間・体力・道具等の制限 | P1 |
| CB-083 | Power cost | 能力を使う代償 | P1 |
| CB-084 | Failure mode | 強みが裏返って失敗する型 | P0 |
| CB-085 | Help-needed area | 他者が必要になる領域 | P0 |
| CB-086 | Recovery method | 消耗から戻る方法 | P2 |

### C08. 矛盾・奥行き・意外性

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-087 | Public/private gap | 外向きと一人の時の差 | P1 |
| CB-088 | Strength/flaw pair | 同じ性質が長所と欠点になる対 | P0 |
| CB-089 | Desire/fear pair | 欲しいのに怖いもの | P0 |
| CB-090 | Value/action gap | 理想と実際のずれ | P1 |
| CB-091 | Competence contrast | 得意領域と意外な不得意 | P1 |
| CB-092 | Appearance contrast | 見た目と中身の差 | P1 |
| CB-093 | Soft spot | 特定対象にだけ見せる弱さ | P1 |
| CB-094 | Hidden pride | 密かに誇っているもの | P2 |
| CB-095 | Guilty pleasure | 人に言いづらい好み | P3 |
| CB-096 | Surprising boundary | 普段軽いのに急に真剣になる線 | P0 |

### C09. 感情システム

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-097 | Baseline mood | 平時の感情温度 | P0 |
| CB-098 | Joy trigger | 喜びの引き金 | P1 |
| CB-099 | Anger trigger | 怒りの引き金 | P1 |
| CB-100 | Sadness trigger | 悲しみの引き金 | P1 |
| CB-101 | Anxiety trigger | 不安の引き金 | P1 |
| CB-102 | Embarrassment trigger | 恥ずかしさの引き金 | P2 |
| CB-103 | Emotion concealment | 隠す感情と隠し方 | P1 |
| CB-104 | Leakage cue | 隠しても出る身体サイン | P1 |
| CB-105 | Escalation pattern | 感情が強くなる段階 | P1 |
| CB-106 | De-escalation need | 落ち着く条件 | P1 |
| CB-107 | Emotional recovery time | 引きずる長さ | P2 |
| CB-108 | Empathy style | 相手の痛みにどう反応するか | P0 |

### C10. 過去・記憶・自己物語

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-109 | Formative event | 人格を作った出来事 | P1 |
| CB-110 | First success | 最初に自信を得た経験 | P2 |
| CB-111 | First failure | 最初に失敗観を作った経験 | P2 |
| CB-112 | Important loss | 失ったもの | P2 |
| CB-113 | Received kindness | 今も返したい親切 | P2 |
| CB-114 | Learned rule | 過去から得た生存規則 | P1 |
| CB-115 | False memory | 誤って理解している過去 | P3 |
| CB-116 | Avoided memory | 思い出したくないこと | P2 |
| CB-117 | Keepsake | 過去を象徴する物 | P2 |
| CB-118 | Self-narrative | 自分の人生をどう説明するか | P1 |
| CB-119 | Missing information | 本人が知らない出自情報 | P3 |
| CB-120 | Reveal policy | 過去をいつ誰に話すか | P2 |

### C11. 関係性エンジン

関係は「仲良し」等の一語で終えず、相手ごとに以下を定義する。

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-121 | Relationship role | 相手が担う役割 | P0 |
| CB-122 | First impression | 初対面の認識 | P1 |
| CB-123 | Current belief | 今、相手をどう見ているか | P0 |
| CB-124 | Desired response | 相手から何を得たいか | P1 |
| CB-125 | Offered value | 相手へ何を渡せるか | P1 |
| CB-126 | Dependency | 相手なしでは難しいこと | P0 |
| CB-127 | Friction source | 繰り返し衝突する原因 | P0 |
| CB-128 | Shared value | 二人を結ぶ価値 | P0 |
| CB-129 | Unspoken truth | 互いに言っていないこと | P2 |
| CB-130 | Trust threshold | 何をすると信頼が増減するか | P1 |
| CB-131 | Conflict behavior | この相手との喧嘩の型 | P1 |
| CB-132 | Repair ritual | 仲直りの型 | P1 |
| CB-133 | Relationship arc | 関係がどこからどこへ変わるか | P1 |
| CB-134 | Unique behavior | この相手にだけ見せる言動 | P1 |

最低限、`公式やす / ツナマヨ / すわぷよ利用者 / YourTIME運営 / 出展者 / AIエージェント / 自分自身`について別々に作る。

### C12. 言語・声・会話

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-135 | Vocabulary level | 語彙の難度 | P0 |
| CB-136 | Sentence length | 一文の長さ | P0 |
| CB-137 | Rhythm | 話す速度、間、反復 | P1 |
| CB-138 | First person | 一人称 | P0 |
| CB-139 | Second person | 相手別の二人称 | P1 |
| CB-140 | Ending pattern | 語尾の傾向 | P0 |
| CB-141 | Signature phrase | 代表句と使用上限 | P1 |
| CB-142 | Forbidden phrase | 絶対に言わない言葉 | P0 |
| CB-143 | Metaphor source | 例え話の元になる領域 | P1 |
| CB-144 | Joke style | 言葉の笑い方 | P1 |
| CB-145 | Lying style | 嘘をつく時の変化 | P2 |
| CB-146 | Anger voice | 怒った時の変化 | P1 |
| CB-147 | Vulnerable voice | 弱さを見せる時の変化 | P1 |
| CB-148 | Explanation style | 難しいことの説明方法 | P1 |
| CB-149 | Silence rule | 何の時に黙るか | P2 |
| CB-150 | Channel adaptation | X、動画、会話で残す共通核 | P2 |

### C13. 身体行動・癖・演技

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-151 | Default posture | 平時の立ち方 | P0 |
| CB-152 | Walk rhythm | 歩き方 | P1 |
| CB-153 | Gesture scale | 身振りの大きさ | P1 |
| CB-154 | Eye behavior | 視線の癖 | P1 |
| CB-155 | Tail behavior | 尾と感情の対応 | P0 |
| CB-156 | Idle action | 待機時の動作 | P1 |
| CB-157 | Thinking action | 考える時の動作 | P1 |
| CB-158 | Success action | 成功時の動作 | P1 |
| CB-159 | Failure action | 失敗時の動作 | P0 |
| CB-160 | Apology action | 謝る時の動作 | P1 |
| CB-161 | Stress tic | 緊張時の無意識動作 | P1 |
| CB-162 | Personal space | 他者との距離 | P2 |
| CB-163 | Object handling | 道具の扱い方 | P2 |
| CB-164 | Dance signature | ダンスで残す固有動作 | P2 |

### C14. 視覚ナラティブ

造形寸法は`05`を正とし、本書では見た目が物語上何を語るかを定義する。

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-165 | Silhouette meaning | 輪郭が伝える性格 | P0 |
| CB-166 | Shape language | 丸・角・方向性の意味 | P0 |
| CB-167 | Primary color meaning | 主色の感情・ブランド役割 | P0 |
| CB-168 | Accent meaning | 差し色の意味 | P1 |
| CB-169 | Costume self-choice | 本人が服を選ぶ理由 | P1 |
| CB-170 | Badge meaning | badgeの物語上の意味 | P1 |
| CB-171 | Wear pattern | 服や道具の使い込み | P2 |
| CB-172 | Status change cue | 成長・失敗を見た目で示す方法 | P2 |
| CB-173 | Emotional readability | 小サイズで読める感情 | P0 |
| CB-174 | Relative contrast | 公式やすと並んだ時の役割差 | P0 |
| CB-175 | Iconic prop | 本人を象徴する道具 | P2 |
| CB-176 | Visual taboo | 物語上も変更しない見た目 | P0 |

### C15. 日常・嗜好・生活実在感

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-177 | Favorite activity | 自発的にすること | P2 |
| CB-178 | Disliked activity | 避ける日常行動 | P2 |
| CB-179 | Favorite food | 好物と理由 | P3 |
| CB-180 | Disliked food | 苦手と反応 | P3 |
| CB-181 | Sleep pattern | 生活リズム | P3 |
| CB-182 | Work habit | 作業の進め方 | P1 |
| CB-183 | Tidiness | 整理整頓の傾向 | P2 |
| CB-184 | Money attitude | お金への態度 | P2 |
| CB-185 | Technology attitude | AIや道具への態度 | P0 |
| CB-186 | Learning style | 見る、読む、試す、教わる | P0 |
| CB-187 | Private hobby | 仕事外の楽しみ | P3 |
| CB-188 | Comfort object | 安心する物・場所 | P2 |

### C16. 物語生成エンジン

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-189 | Recurring desire | 毎回行動を起こす欲求 | P0 |
| CB-190 | Recurring mistake | 繰り返せるが成長を損なわない失敗型 | P0 |
| CB-191 | Escalation ladder | 小・中・大事件への増幅 | P1 |
| CB-192 | Story question | 毎回観客が気にする問い | P0 |
| CB-193 | Choice dilemma | 価値観を試す二択 | P1 |
| CB-194 | Reversal source | 意外な逆転を生む性質 | P1 |
| CB-195 | Win pattern | キャラらしい勝ち方 | P0 |
| CB-196 | Loss pattern | キャラらしい負け方 | P0 |
| CB-197 | Help pattern | 他者と協働する型 | P1 |
| CB-198 | Discovery pattern | 新しい知識へ到達する型 | P1 |
| CB-199 | Episode reset | 次回へ持ち越す／戻すもの | P1 |
| CB-200 | Serial mystery | 長期的に知りたくなる謎 | P2 |
| CB-201 | Theme carrier | キャラが体現する主題 | P0 |
| CB-202 | Counter-theme | 反対側から試す主題 | P1 |

### C17. 成長・変化・長期アーク

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-203 | Start state | 初期の自己像・能力・関係 | P0 |
| CB-204 | End possibility | 将来到達し得る状態 | P1 |
| CB-205 | Change axis | 何が変わるか | P0 |
| CB-206 | Invariant axis | 成長しても変わらないもの | P0 |
| CB-207 | First lesson | 最初に学ぶこと | P1 |
| CB-208 | Resistance | 変化を拒む理由 | P1 |
| CB-209 | Relapse trigger | 元に戻る条件 | P1 |
| CB-210 | Proof of growth | 成長を行動で示す場面 | P1 |
| CB-211 | Irreversible event | 元へ戻れなくなる出来事 | P2 |
| CB-212 | Relationship growth | 相手との変化 | P1 |
| CB-213 | Competence growth | 技能の変化 | P1 |
| CB-214 | Moral growth | 価値判断の変化 | P1 |
| CB-215 | Arc ceiling | ブランド上、変えすぎない上限 | P0 |
| CB-216 | Canon timeline | 変化の順序とversion | P2 |

### C18. ユーモア設計

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-217 | Comic premise | 何が構造的におかしいか | P0 |
| CB-218 | Straight role | 誰が現実へ戻すか | P1 |
| CB-219 | Misdirection | 何を期待させて外すか | P1 |
| CB-220 | Timing | 間、反復、三段の型 | P1 |
| CB-221 | Scale gap | 見た目の本気と内容の差 | P0 |
| CB-222 | Self-awareness | 自分の可笑しさに気づく度合い | P1 |
| CB-223 | Dignity floor | 笑いでも守る尊厳 | P0 |
| CB-224 | Target boundary | 誰・何を笑いの対象にしないか | P0 |
| CB-225 | Recovery beat | オチの後に信頼を戻す一拍 | P1 |
| CB-226 | Repetition limit | 同じギャグの使用上限 | P2 |

### C19. 世界・場所・社会との接続

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-227 | World belief | 世界をどう理解しているか | P1 |
| CB-228 | Social status | 周囲からの立場 | P2 |
| CB-229 | Rule knowledge | 世界の規則をどこまで知るか | P1 |
| CB-230 | Rule exception | 本人だけの例外 | P2 |
| CB-231 | Home base | 戻る場所と意味 | P1 |
| CB-232 | Uncomfortable place | 苦手な場所 | P2 |
| CB-233 | Public/private space | 表と裏の居場所 | P2 |
| CB-234 | Event role | YourTIME当日の役割 | P0 |
| CB-235 | Product presence | すわぷよ内での存在方法 | P0 |
| CB-236 | Reality boundary | 現実の木幡さんとの境界 | P0 |
| CB-237 | Meta awareness | 作者・AI・観客を認識する範囲 | P0 |
| CB-238 | Fourth-wall cost | メタ発言で失う没入をどう回収するか | P1 |

### C20. キャラクターブランド・事業展開

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-239 | Brand association | 思い出してほしい3語 | P0 |
| CB-240 | Brand rejection | 結びつけたくない3語 | P0 |
| CB-241 | Signature asset | 声、pose、prop、phrase等の識別資産 | P1 |
| CB-242 | Content role | 認知・教育・販売等の担当 | P1 |
| CB-243 | Product endorsement rule | 何なら勧められるか | P0 |
| CB-244 | Sponsorship rule | 案件を受ける基準 | P2 |
| CB-245 | Sales voice | 販売時も崩さない話し方 | P1 |
| CB-246 | Trust proof | 信頼を裏づける行動 | P0 |
| CB-247 | Commercial taboo | 売上のためにも言わないこと | P0 |
| CB-248 | Audience data boundary | キャラ体験と個人データの境界 | P0 |
| CB-249 | Collaboration rule | 他ブランドと共演する条件 | P2 |
| CB-250 | Merchandise fit | 商品化して自然な物 | P2 |
| CB-251 | Licensing fit | 外部利用に適する／不適な用途 | P2 |
| CB-252 | Exit rule | 企画終了時のキャラの扱い | P2 |

### C21. 媒体変換・演者・AIエージェント

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-253 | Prose invariant | 文章で残す核 | P1 |
| CB-254 | Comic invariant | 漫画で残す核 | P1 |
| CB-255 | Animation invariant | 動画で残す核 | P1 |
| CB-256 | Live invariant | 配信で残す核 | P1 |
| CB-257 | Game invariant | 操作体験で残す核 | P1 |
| CB-258 | Ad invariant | 広告で残す核 | P1 |
| CB-259 | Voice casting brief | 声・演技の条件 | P2 |
| CB-260 | Improvisation range | 演者が即興できる範囲 | P1 |
| CB-261 | AI persona prompt | AIに渡す人格核 | P1 |
| CB-262 | AI refusal rules | AIキャラが拒否する内容 | P0 |
| CB-263 | Memory policy | AIが覚える／覚えない情報 | P0 |
| CB-264 | Human handoff | キャラで答えず人へ渡す条件 | P0 |
| CB-265 | Out-of-character protocol | 現実説明へ切り替える表示 | P0 |
| CB-266 | Localization invariant | 翻訳しても残す性質 | P2 |

### C22. 表象・安全・倫理

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-267 | Representation scope | 属性が物語主題か背景か | P1 |
| CB-268 | Research need | 当事者・専門家確認が必要な領域 | P0 |
| CB-269 | Stereotype risk | 固定観念へ接続し得る点 | P0 |
| CB-270 | Child safety | 子ども向けで避ける表現 | P0 |
| CB-271 | Health boundary | 健康効果を断定しない線 | P0 |
| CB-272 | Privacy boundary | 個人情報を物語化しない線 | P0 |
| CB-273 | Manipulation boundary | キャラ愛着を使って強制しない線 | P0 |
| CB-274 | Vulnerable audience | 配慮が必要な対象 | P1 |
| CB-275 | Conflict sensitivity | 災害・病気・差別等への対応 | P1 |
| CB-276 | Correction behavior | 誤りをどう訂正するか | P0 |
| CB-277 | Crisis silence | 発言しない方がよい条件 | P1 |
| CB-278 | Consultant record | 誰が何を確認したか | P2 |

### C23. Canon・権利・変更統制

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-279 | Canon owner | 正本責任者 | P0 |
| CB-280 | Design approver | 造形承認者 | P0 |
| CB-281 | Narrative approver | 人格・物語承認者 | P0 |
| CB-282 | Rights approver | 権利承認者 | P0 |
| CB-283 | Invariant list | 変更不可項目 | P0 |
| CB-284 | Flex list | 自由に変えられる項目 | P0 |
| CB-285 | Arc list | 物語で変える項目 | P1 |
| CB-286 | Variant naming | 別版の命名規則 | P2 |
| CB-287 | Retcon rule | 過去設定を変える条件 | P1 |
| CB-288 | Deprecation rule | 旧設定を止める方法 | P1 |
| CB-289 | Evidence link | 判断根拠のID | P0 |
| CB-290 | Version | 適用versionと日付 | P0 |
| CB-291 | Distribution rights | source・weight・商品・外注の範囲 | P0 |
| CB-292 | Incident rollback | 問題時に戻す正本 | P0 |

### C24. 検証・評価

| ID | 原子項目 | 決める内容 | 優先度 |
|---|---|---|---|
| CB-293 | Recognition test | 誰だと認識されたか | P0 |
| CB-294 | Trait recall | 狙った性格語が想起されたか | P0 |
| CB-295 | Behavior prediction | 未知状況の行動を観客が予測できるか | P1 |
| CB-296 | Surprise validity | 意外でも後から納得できるか | P1 |
| CB-297 | Voice test | 台詞だけで識別できるか | P1 |
| CB-298 | Relationship test | 相手別に振る舞いが変わるか | P1 |
| CB-299 | Story yield | 設定からepisode案が何本出るか | P1 |
| CB-300 | Contradiction audit | 設定間の矛盾が意図的か事故か | P0 |
| CB-301 | Brand fit | すわぷよ・ツナやす価値と一致するか | P0 |
| CB-302 | Trust test | ふざけても信頼が残るか | P0 |
| CB-303 | Harm audit | 権利・安全・表象事故がないか | P0 |
| CB-304 | Drift audit | AI・外注・媒体で人格がずれていないか | P0 |
| CB-305 | Audience attachment | 再訪・愛着・自発的言及があるか | P2 |
| CB-306 | Business transfer | 相談・体験・来場へ自然につながるか | P2 |

## D. 最小必須25項目

初回3投稿へ進む前に、全306項目を埋める必要はない。まず次の25項目をapprovedまたはreviewedにする。これが`Minimum Viable Character`である。

1. CB-001 Creator intent
2. CB-002 Audience value
3. CB-006 Emotional promise
4. CB-011 Primary audience
5. CB-017 Relationship metaphor
6. CB-021 Official name（未命名をcanonにする場合は期限と呼称）
7. CB-025 Species
8. CB-031 Occupation
9. CB-034 One-line definition
10. CB-035 External want
11. CB-036 Internal need
12. CB-037 Core fear
13. CB-039 Lie / misbelief
14. CB-040 Truth
15. CB-049 Highest value
16. CB-055 Non-negotiable
17. CB-063 Default action
18. CB-071 Failure response
19. CB-075 Signature strength
20. CB-080 Practical weakness
21. CB-088 Strength/flaw pair
22. CB-096 Surprising boundary
23. CB-127 Friction source（公式やすとの関係）
24. CB-189 Recurring desire
25. CB-201 Theme carrier

25項目から最低10本の異なるepisodeが自然に出なければ、設定が薄いか、項目同士が因果でつながっていない。

## E. 現時点のいとこ・コア仮説

以下は会話から導いた現行値である。名前と関係性方針は`reviewed`、その他は最終canon前の`hypothesis`とする。

| 項目 | 現時点の仮説 | 状態 |
|---|---|---|
| Creator intent | AI時代の試行錯誤を、笑えて再利用できる知識として公開する | reviewed |
| Emotional promise | 驚き、愛嬌、安心して失敗を見られる感覚 | hypothesis |
| Official name | やっ太郎。やす太郎をもじり、「やったろう！」「何でもやってやろう！」を行動原理にした名前 | reviewed |
| Relationship metaphor | 先に走る対等ないとこ兼相棒。公式やすは保護者・上司ではない。観客は助言できる仲間 | reviewed |
| Occupation | ツナやす実験隊長、すわぷよ開発見習い | hypothesis |
| External want | AIで「見たことないすごいもの」を最速で実現したい | hypothesis |
| Internal need | 速さだけでなく、作者・仲間・利用者と作ることが完成度を上げると知る | hypothesis |
| Core fear | 役に立たず、実験に呼ばれなくなること | hypothesis |
| Misbelief | まず完成させれば、確認や設計は後から何とかなる | hypothesis |
| Truth | 速さは、戻れる正本と仲間への敬意があって初めて力になる | hypothesis |
| Highest value | 試して発見すること | hypothesis |
| Non-negotiable | 他人を傷つけて成果や笑いを取らない | reviewed |
| Default action | まず小さく試す。ただし高リスク時はやすへ確認する | hypothesis |
| Failure response | 一瞬固まる → 隠さず言う → 原因を一つ見つけて再挑戦 | hypothesis |
| Signature strength | 未知への初速と、失敗を次へ変える回復力 | hypothesis |
| Practical weakness | 目的・権利・完了条件を飛ばしやすい | reviewed |
| Strength/flaw pair | 行動が速いから発見でき、行動が速すぎて事故る | reviewed |
| Surprising boundary | 普段は軽いが、作者・子ども・仲間の尊厳が傷つく時は即座に真剣になる | hypothesis |
| Yasu friction | やっ太郎は「まず試す」、公式やすは「目的から設計」。互いの得意で相手の盲点を補う | reviewed |
| Recurring desire | 新しいAIや表現を見ると、自分で実証したくなる | reviewed |
| Theme carrier | 失敗を隠さず設計へ変える人は、速くても信頼される | hypothesis |

## F. キャラクターが立っているかの圧力テスト

設定を読むだけで承認しない。次の問いへ、脚本家が別々に回答しても70%以上同じ方向の行動が出るか確認する。

1. 締切10分前、完成度60%の作品を見せるか。
2. 流行動画を使えば伸びるが、権利が不明な時どうするか。
3. やすが慎重すぎて機会を逃しそうな時どう動くか。
4. 自分の成功がツナマヨさんの貢献として評価された時どう感じるか。
5. 子どもが「失敗したからもうやらない」と言った時どう接するか。
6. 自分だけ名前が決まらず、他のキャラが人気になった時どうするか。
7. AIが自分より完璧ないとこ画像を生成した時、何を守るか。
8. 案件でキャラらしくない台詞を要求された時、どこまで受けるか。
9. 重大な誤情報を投稿した直後に伸び始めた時どうするか。
10. 公式やすが間違い、いとこだけが正しかった時どう伝えるか。

正答を暗記するのではなく、`価値 → 恐れ → 判断 → 行動 → 代償`が説明できることを合格条件にする。

## G. 設計の完了段階

| Level | 完了条件 | 使用可能範囲 |
|---|---|---|
| L0 Concept | 一文定義のみ | 内部案 |
| L1 Recognizable | MVC 25項目、造形核、声の核 | 初回SNS pilot |
| L2 Repeatable | 関係、感情、物語生成、10episode test | 継続SNS・短編 |
| L3 Performable | 身体、声、即興、媒体変換 | 動画、VTuber、イベント |
| L4 Licensable | 権利、canon、商品・案件・危機対応 | 広告、外部案件、商品 |
| L5 Living IP | 観客検証、長期arc、変更統制、後継運用 | 複数年・複数制作者 |

現状は`L0.7`である。造形案と運用仮説はあるが、MVC 25項目のcanon承認と圧力テスト前なので、キャラクター設計完了とは扱わない。

## H. 「世界一レベル」を判定するレビュー構成

100人全員の感動は設計書だけでは保証できない。100人へ依頼する場合も、同じ好みの100票にせず、次の専門視点を均等に含める。

| 視点 | 最重要質問 | 致命的不合格 |
|---|---|---|
| Character writer | 欲望・恐れ・誤信念が行動を生むか | 属性説明だけ |
| Series showrunner | 50話分の変化と反復が作れるか | 3話で設定を消費 |
| Narrative designer | 状況が変わっても判断規則が機能するか | 脚本都合で人格変化 |
| Comedy writer | 尊厳を守りながら反復可能な笑いがあるか | 失敗・大声だけ |
| Actor / voice director | 台詞なしでも演じ分けられるか | 感情指示が曖昧 |
| Animator | pose、timing、silhouetteで人格が出るか | 静止画でしか成立しない |
| Character designer | 内面とshape・色・服が因果でつながるか | 可愛い装飾の寄せ集め |
| Brand strategist | 事業価値とキャラ価値が相互強化するか | 広告の着ぐるみ化 |
| Community lead | 観客が参加・解釈できる余白があるか | 公式説明で全て閉じる |
| Child / family UX | 子どもと保護者の双方へ安全か | 恐怖・羞恥・操作的誘導 |
| Psych / research | 愛着を利用しすぎず関係契約が健全か | 依存・罪悪感で誘導 |
| Cultural consultant | 固定観念・翻訳事故を回避できるか | 属性を笑いの近道に使用 |
| IP / legal | canon、作者、利用範囲が追跡できるか | 誰も停止できない |
| Product designer | ゲーム内の行動が人格を体現するか | 台詞と操作が分離 |
| Marketing analyst | 認知、愛着、体験、相談を別指標で測れるか | view数だけで成功判定 |

各reviewerは`良い／悪い`でなく、`該当CB-ID / 観察事実 / リスク / 修正案 / severity`で記録する。実際にレビューしていない専門家の賛同を装わない。

# Part II. 現行ブランド・SNS運用定義

## 1. ブランドの約束

> AIで本気につくる。ちゃんと笑う。失敗まで、次の人が使える学びにする。

やっ太郎は、AIで何でも一瞬にできると誇張するキャラではない。「やったろう！」と誰より先に試し、派手に成功し、ときに盛大に失敗し、行動で得た発見を必ず次へ蓄積する`実験隊長`である。

公式やすは、やっ太郎の保護者でも勢いを止める監視役でもない。目的、根拠、設計、安全、仕事への翻訳を得意とする`編集長・開発者`である。やっ太郎も公式やすの考えすぎを行動で突破する。二人は対等な相棒であり、得意の差によって速度と信頼を同時に表現する。

## 2. キャラの核

### 一文定義

> 「やったろう！」で誰より先に飛び込み、成功も大失敗も次の力へ変える。ぶっ飛んでいるのに、大事な瞬間は真顔になる、やす太郎の爬虫類のいとこ・やっ太郎。

### 動かしてよい性格値

| 軸 | 初期値 | 許容範囲 | 表現 |
|---|---:|---:|---|
| 好奇心 | 95 | 85〜100 | 未知へ先に触る |
| 行動速度 | 90 | 75〜100 | 考える前に試作品を作る |
| 自信 | 75 | 40〜95 | 成功時は大げさ、失敗時はしぼむ |
| 技術力 | 55 | 30〜85 | 試せるが、設計・運用はやすに学ぶ |
| 愛嬌 | 95 | 85〜100 | 失敗しても他者を傷つけない |
| 悪意 | 0 | 0 | 嘘、嘲笑、責任転嫁をしない |
| 学習 | 100 | 100 | 同じ重大事故を繰り返さない |

数値は演出上の初期仮説であり、人格を機械的に採点するものではない。投稿レビューで一貫性を確認する共通言語として使う。

### 欠点の条件

欠点は笑いの装置だが、次へ進む。

- 早とちり → 確認項目を一つ覚える。
- 盛りすぎ → 根拠のある表現へ直す。
- AIへ頼みすぎ → 人が決める正本を理解する。
- 流行へ飛びつく → 権利と目的を確認する。
- 完璧に見せたがる → beforeと失敗を公開する。

人の容姿、能力、年齢、性別、地域、病気を失敗のオチにしない。子どもや出展者を実験対象として笑わない。

## 3. 公式やすとの関係

| 項目 | 公式やす | いとこ |
|---|---|---|
| 組織内役割 | 編集長、PdM、設計者、解説者 | 実験隊長、試作、現場レポーター |
| 強み | 目的と全体をつなぐ | 体験を最速で見せる |
| 弱み | 考え過ぎて始動が遅いことがある | 確認を飛ばす |
| 口調 | 温かく端的、根拠を分ける | 短く速い、感情が顔に出る |
| 成功時 | なぜ再現できるか説明 | まず喜ぶ、踊る |
| 失敗時 | 原因を人でなく仕組みに置く | 隠さず謝る、次を試す |
| CTA | 記事、デモ、相談 | 続きを見る、一緒に試す |

やすが毎回正解を知る構図にしない。二人で分からないことを調べ、ツナマヨさん、YourTIME、出展者、利用者、専門家から学ぶ。いとこだけを無能にすると関係性が消耗するため、いとこ発の成功・発見も必ず作る。

## 4. 三つの世界層

### 物語内

二人がすわぷよ、SNS、キャラ、イベントを実際に作っている。会議、実験、現場、反省会をキャラの出来事として描く。

### メタ層

「名前がやっ太郎になった」「また線が変わってない？」「ぼくの設定、会議で増えてる」のように、自分が作られていることを時々のぞく。全投稿の20%以下を初期目安とし、現実説明を邪魔しない。

### 現実層

日付、料金、権利、健康、データ、協力者、成果、失敗の事実は曖昧にしない。キャラの冗談と実在情報を同じ吹き出しで混ぜない。訂正はやすが現実層で明確に行う。

## 5. ブランドの緊張軸

このブランドの面白さは、次の両方を本気で成立させることにある。

- 表は広告会社が作ったように洗練、内容は途中でとんでもなく人間くさい。
- AIの速度は見せるが、作者・設計・レビューを隠さない。
- ふざけるが、プロの仕事へ転用できる学びが残る。
- 失敗を出すが、未修正の危険を利用者へ渡さない。
- メタで遊ぶが、すわぷよとYourTIMEの目的を見失わない。

`低品質だから面白い`は不採用。見た目は本気、構造も本気、オチだけ意外、が基本である。

## 6. コンテンツ柱

| 柱 | 読者価値 | 代表シリーズ | 事業への接続 |
|---|---|---|---|
| AIでここまでできた | 驚き、保存、共有 | `3秒前まで絵でした` | AI動画・Web・業務支援 |
| やらかし公開 | 再現可能な学び | `今日の盛大なやらかし` | 設計・QA・伴走 |
| ガチ広告風 | 視覚的な証拠 | `本気で広告を作った結果` | デザイン・LP・広告 |
| すわぷよ開発会議 | プロダクトの理解 | `二匹会議` | UIUX・LINE・アプリ |
| キャラが育つ過程 | キャラ設計の学び | `ぼくの設定、増えました` | キャラ制作・マーケ |
| YourTIME現場 | 行ってみたい理由 | `いとこ偵察隊` | 来場・ブース紹介・レポート |
| 1分の実務解説 | 明日使える知識 | `やすの回収タイム` | 記事・相談・勉強会 |

初期は比率を固定しない。娯楽、実験、過程、学び、すわぷよ、イベント、真面目な想い、直接CTAを全て試し、目的別に反応・制作負荷・キャラ適合を記録する。勝ち筋が見える前に投稿カレンダーを固定配分へ最適化しない。

## 7. 探索中の表現パターン（フォーマットは固定しない）

初期は`探索期`とする。カルーセル、1枚画像、漫画、短尺動画、長尺動画、screen recording、会話、ダンス、ガチ広告風、ドキュメンタリー風、テキストのみ、長文記事、live等を広く試す。本節は標準フォーマットではなく、実験候補である。

フォーマットを標準化する条件:

- 同じ目的・近い対象者で、同一patternを最低3回試している。
- hookやtopicだけでなく、形式そのものが結果へ寄与した根拠がある。
- viewだけでなく、保存、会話、キャラ想起、体験遷移、制作時間を比較している。
- その形式を続けても、キャラの意外性と作り手の創造性が死なない。
- `winner / challenger / wild card`を残し、勝ち型だけに100%寄せない。

探索期の最低coverage:

| 系統 | 試す例 | 最低試行 |
|---|---|---:|
| 静止画 | 1枚広告、before/after、図解、写真合成 | 各2 |
| 連続画像 | 2枚対比、4コマ、自由枚数カルーセル | 各2 |
| 動画 | 6秒loop、15〜30秒寸劇、ダンス、制作画面 | 各2 |
| 文章 | X一文、thread、Threads日誌、長文記事 | 各2 |
| 参加 | 投票、名前案、次の実験、間違い探し | 各2 |

最低18本を探索し、4週間ごとの中間reviewでは停止判断だけを行う。初期18本を終えるまでは、一時的なヒット1本を恒久formatにしない。

### 7.1 カルーセル仮説

必要に応じて`Hook / Context / Wow / Twist / Behind / Learning / Next`を使う。7枚固定ではなく、2〜10枚から内容に合う枚数を選ぶ。順番を変えたpatternも比較する。

一枚一メッセージ、見出し1行、本文3行以内を基本にする。1枚目だけで話題が分かり、7枚目を読まなくても誤解しない。投稿本文は出典、補足、協力者、CTAを担当する。

画像内に文字を入れる場合は、原則として文字も含めてGPT Image 2で一体生成する。あとから手組み・合成で整えない。指定文言、改行、句読点、可読性をOCRと人の目で確認し、崩れた場合は同モデルで再生成する。詳細は`05_cousin-character-master-and-generative-governance.md` §13.2Aを正とする。

### 7.2 ガチ広告風

- 高級感のある照明、構図、motion、copyを本気で作る。
- 架空brand、すわぷよ、ツナやす自身を題材にし、他社広告のlogo・copy・sceneを複製しない。
- 最後に小さな失敗、キャラの本音、制作の現実を一つ置く。
- parodyと言い張ることを権利根拠にしない。`広告ジャンルの文法`を使って新規制作する。

例:

> 世界は、まだこの一歩を知らない。
>
> （次のframeで、いとこが左右の靴を履き違えている）
>
> でも一歩目は、出た。

### 7.3 トレンド動画

1. URL、観測日、伸び、動き、hook、編集、音源をTrendObservationへ記録。
2. 流行の理由を`構造`へ抽象化。
3. オリジナルmotion、台詞、背景、衣装で作り直す。
4. 媒体内音源は各媒体で付け、無音masterを残す。
5. 広告・案件・サービス訴求なら商用音源Gateを通す。

### 7.4 二匹会議

- いとこ: 仮説か行動を一つ。
- やす: 目的を一つ確認。
- 実験: 結果を画面で見せる。
- 二人: 次に変えるものを一つ決める。

説明だけの会議にしない。毎回、動く画面、画像、数字、before/afterのいずれかを出す。

### 7.5 真面目回

毎回オチを強制しない。作者、健康、子どもデータ、イベント、失敗の影響、仕事への想いは、キャラが静かに語る回を持つ。いとこも真面目な問いを出せる。真面目さがあるから、次のふざけが信頼を失わない。

## 8. 言葉のルール

### やっ太郎

- 一文を短くする。
- 感嘆は1投稿3回以内。常時叫ばない。
- `やってみよ！`の次に、何を試すかを言う。
- 分からない時は「たぶん」ではなく「まだ知らない」。
- 失敗時は`ごめん → 何が起きた → 次どうする`。

仮の言い回し:

- 「これ、いける気がする。たぶんじゃない、試す！」
- 「できた！……額の模様、増えてる。」
- 「失敗も投稿するって、最初に言っちゃったんだった。」
- 「次は、やる前に一個だけ確認する。」

### 公式やす

- 結論を先に言う。
- 事実、仮説、判断を分ける。
- いとこを見下さず、良かった発見を先に認める。
- 専門語は、利用者の行動へ翻訳する。

## 9. 見た目と演出

- 公式やすは原画のポーズ、服、シャツの`Ai`、顔、尾を許可なく変えない。
- いとこはCharacter Masterに従い、額記号、牙、badge、手足、尾、paletteをhard invariantにする。
- 洗練側は余白、整列、contrast、motion easing、音設計で作る。過剰なeffectで誤魔化さない。
- 笑い側は表情、間、視線、行動のズレで作る。キャラ造形を崩して笑いを取らない。
- 一覧で`誰の何の話か`が1秒で分かる表紙にする。

## 10. CTA階段

投稿ごとにCTAは一つだけ選ぶ。

1. 見る: 次のframe、続きを見る。
2. 覚える: 保存、フォロー。
3. 参加: 意見、名前、次の実験案。
4. 体験: すわぷよで遊ぶ、YourTIME情報を見る。
5. 深掘り: 解説記事、制作過程。
6. 相談: 同じ仕組みを自社で試す。

初見投稿でいきなり相談を迫らない。価値の証拠を見せ、本人が自分の課題へ置き換えられた後に相談を置く。

## 11. 投稿brief

```yaml
content_id: SNS-YYYYMMDD-001
objective: awareness | education | attendance | play | trust | consultation
audience: one primary audience
content_pillar: one pillar
story_layer: diegetic | meta | factual
promise: reader receives one value
hook: one sentence
format: carousel | reel | short | thread | article
format_hypothesis: free text; never assume fixed winner
experiment_tags: []
source_recipe: deterministic-2d | rigged-2d | vrm-3d | generated-image | generated-video
character_role:
  yasu: optional role
  cousin: optional role
seriousness: 0-100
absurdity: 0-100
evidence_ids: []
rights_ids: []
cta: exactly one
success_metric: one primary metric
next_experiment: one variable
```

`objective`、`promise`、`cta`、`success_metric`が空の企画は制作しない。流行しているという理由だけでは目的にならない。

## 12. 初期12投稿backlog

1. はじめまして。YourTIME.と、すわぷよを作る二匹。
2. 飲みの席の「おもしろそー！」がアプリになり始めた。
3. いとこの名前が`やっ太郎`になった。やす太郎をもじった理由と「やったろう！」の宣言。
4. いとこをAIで1枚描くのは簡単。同じ子を100回出すのは難しい。
5. 線が変わった。なぜ違和感が出たか。
6. 公式やすのシャツから`Ai`が消えた事件。
7. 権利を確認した。だから自由に遊ぶ前に、自由の範囲を記録する。
8. 世界一ガチな架空CMを作って、最後に1個忘れる。
9. 2Dと3D、どっちが「同じいとこ」に見えるか。
10. 流行ダンスをコピーせず、流行の構造だけ借りる。
11. すわぷよの初回画面、違和感を財産にした話。
12. 今月の失敗・成功・次の一手を全部見せる。

投稿7は、ツナマヨさんの承認と作者への敬意を中心にし、契約論で不安を煽らない。投稿4〜6、9〜10は本書と技術調査そのものがprocess economyの一次素材になる。

## 13. 評価

### 投稿単位

- 1秒理解、3秒継続、完視聴、保存、共有、プロフィール遷移。
- キャラ名・関係・すわぷよの自由記述認識。
- コメントの質、誤解、権利・健康・事実の指摘。
- 制作時間、人の修正回数、hard failure、再利用率。

### 4週間単位

- どの柱が認知、信頼、プレイ、来場、相談へつながったか。
- いとこ単独の人気と、公式やす・すわぷよへの送客が両立したか。
- ふざけが専門性を下げていないか、真面目が説教になっていないか。
- 同じ失敗を繰り返していないか。

数値が伸びても、誤認、無断素材、医療断定、個人情報、他者攻撃で得た成果は成功に数えない。

## 14. 禁止事項

- 実在人物の顔・体・声を無断で置換する。
- 他社キャラ、logo、広告copy、特徴的な振付、楽曲を「パロディ」で正当化する。
- AIだけが作者・意思決定者であるように見せる。
- ツナマヨさん、YourTIME、出展者、利用者の失敗を勝手に公開する。
- 健康効果、売上、AI精度、納期を根拠なく保証する。
- 炎上、規約違反、危険行為を実験成果にする。
- いとこを毎回失敗役にし、尊厳や成長を失わせる。

## 15. 承認Gate

- [ ] 正式名称、species、口調、設定、造形hard invariantをツナマヨさんと確定。
- [ ] 公式やすとの差、二人の関係、物語内／メタ／現実の境界を確認。
- [ ] 初期12投稿から3本を制作し、並べた時の人格・世界観を確認。
- [ ] 32px、カルーセル、9:16、無音、字幕、色覚、読み上げを確認。
- [ ] rights evidence、asset manifest、公開Gateを通過。
- [ ] 4週間pilot後に性格値、投稿柱、CTA、配分を改訂。

## 16. 参考事例から採用する原則

DuolingoのTikTok事例は、recognizable mascot、platform-nativeな言語、教育という本来の機能を一体化し、大きな視聴とフォロワー成長を得た。ここから採用するのは`マスコットが奇抜なら伸びる`ではなく、`見分けられるキャラ × 媒体の文法 × 本来価値`の一致である。

- [TikTok for Business: Duolingo case study](https://ads.tiktok.com/business/en-AU/inspiration/duolingo-509)

設計項目の構成は、キャラクターを説明文でなくpurposeとactionで定義する実務、関係性とagencyを持つ長期物語、視覚と動作の一致、ブランド愛着、IPの利用統制を横断して整理した。

- [GDC: Characterization, Purpose, and Action](https://www.gdcvault.com/play/1021727/Characterization-Purpose-and-Action-Creating)
- [GDC: How to Create Great Characters — Depth, Emotion and Player Agency](https://gdcvault.com/play/1025156/How-to-Create-Great-Characters)
- [GDC: Writing Modular Characters for System-Driven Games](https://www.gdcvault.com/play/1025017/Writing-Modular-Characters-for-System)
- [GDC: Character and Story Arcs in Open Gameplay Structures](https://www.gdcvault.com/play/1028714/Game-Narrative-Summit-AAA-TYPICAL)
- [WIPO: Character Merchandising](https://www.wipo.int/documents/d/copyright/docs-en-wo_inf_108.pdf)
- [Rain & Mar: Adult attachment and engagement with fictional characters](https://journals.sagepub.com/doi/10.1177/02654075211018513)
- [Huang & Fung: Measuring identification with narrative characters](https://link.springer.com/article/10.1007/s12144-024-06191-2)
- [Huang, Fung & Sun: Audience–character similarity and identification meta-analysis](https://doi.org/10.1007/s12144-023-04842-4)
- [Thomas et al.: Narrative transportation systematic review](https://onlinelibrary.wiley.com/doi/10.1002/mar.22011)
- [Anthropomorphic brand management: integrated review of 101 studies](https://www.sciencedirect.com/science/article/pii/S0148296322004726)

本書は完成した設定集ではなく、公開実験で育てるversioned bibleである。ただし、権利、安全、他者への敬意、キャラの核はエンゲージメントのために崩さない。
