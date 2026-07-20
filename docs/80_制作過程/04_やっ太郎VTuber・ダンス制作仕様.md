# いとこキャラ VTuber・トレンドダンス制作パイプライン 実装設計

> 文書状態: 実装前SSoT。2026-07-13時点の調査に基づく。いとこの造形・権利承認は取得済み。Character Masterの造形数値、3D制作担当、運営アカウント、商用音源方針はGate未通過
> 最終更新: 2026-07-13
> 対象: Instagram Reels / YouTube Shorts / TikTok / X動画 / Zoom / Google Meet / イベント収録
> 非対象: すわぷよアプリ本体へのGPT API組込み、SNS無承認自動投稿、他者動画の無断取得・複製

2D、Live2D、3D、GPT Image 2等を横断するキャラクター同一性、Character Master、生成物の承認・version・regression・rollbackは`05_やっ太郎キャラクター正本・生成統制.md`、用途別技術選定と2026-07比較は`06_キャラクター一貫性・技術調査_2026-07.md`を正とする。

## 1. 目的

いとこキャラを、静止画だけでなく「人の演技を受けて動けるキャラクターIP」にする。単発のAI動画を量産するのではなく、次の用途を同じキャラクター資産、モーション資産、権利台帳で横断できる状態を作る。

1. 木幡さん自身の顔・体の動きを、リアルタイムでいとこへ反映する。
2. Instagram、YouTube、TikTokで流行するダンスや動きへ、速く安全に参加する。
3. Zoom、Google Meet、配信、イベントで、いとこをバーチャルカメラとして使う。
4. 完成動画だけでなく、調査、権利判断、失敗、モーション修正、媒体別最適化をプロセスエコノミーの題材にする。
5. 将来、キャラクターVTuber化、SNS運用、動画制作、AI活用を出展者向け支援メニューへ展開できる実証を作る。

成功は「何本作ったか」だけで判定しない。キャラの一貫性、権利事故ゼロ、制作時間、投稿速度、完視聴、ループ、保存、指名検索、相談化までを評価する。

## 2. 基本原則

### 2.1 キャラクターの正本

- 公式やすは、既存原画のポーズ、顔、服、シャツの`Ai`、ベスト、しっぽを無断で変更しない。
- 本パイプラインの可動主役はいとことする。公式やすを動かす場合は、作者監修の別モデル・別許諾を先に用意する。
- いとこの2D原画、設定画、3Dモデル、リグ、表情、VRM、モーション、音声を別資産として台帳管理する。
- AI生成結果はキャラクターmasterを上書きしない。採用された表情・衣装・造形だけを監修後にmasterへ昇格する。

### 2.2 トレンドは「発見情報」であり素材ではない

- 公開投稿URL、投稿者、観測日時、地域、動きの特徴を記録してよい。
- 元動画や音源をダウンロードしてGit、Drive、学習データへ無断保存しない。
- 元動画の人物を消してキャラへ置換するだけでは公開許可を得たことにならない。
- クレジットは礼儀として重要だが、利用許諾の代替ではない。
- 特徴的な振付、長い連続、撮影構図、編集、字幕、衣装、背景を一体で複製しない。

### 2.3 共通masterと媒体ライセンスを分ける

- 制作正本は、音源なし、ウォーターマークなしの縦動画masterとする。
- 流行音源は原則としてInstagram、YouTube、TikTok各アプリ内で、その媒体の許諾範囲に従って付与する。
- 一つの媒体で利用できる音源を、書き出して別媒体へ転載しない。
- 商用・サービス訴求を含む投稿は、個人向け一般音源ライブラリを自動的に利用可能とは扱わない。

### 2.4 AI置換は実験レーンへ隔離する

- 本番の主力は、3Dモデルへ人の動きをリターゲットする決定論的な制作方式とする。
- Wan2.2-Animate、LTX-2等の人物置換・キャラクターアニメーションは、許諾済み自作motionでの比較pilotから始める。採用済み3D retargetを本番fallbackとして保持する。
- 生成AIレーンは、商用可否、モデルライセンス、入力素材許諾、顔・身体の同意、出力のキャラ同一性を個別に確認する。
- repository code、checkpoint、依存model、custom node、入力、出力のlicenseを分離し、一つでもlicense不在・研究限定・非商用なら、営業・広告・有償案件へ使わない。

## 3. ユースケースと採用方式

| ID | ユースケース | 採用方式 | MVP | 備考 |
|---|---|---|---:|---|
| UC-01 | 自分がカメラ前で踊り、いとこが同時に踊る | Webカメラ姿勢推定 → VRM → OBS | 対象 | 反応速度優先 |
| UC-02 | ダンスを収録し、後から品質を整えて投稿 | 動画姿勢推定 → motion clip → Blender補正 → VRM収録 | 対象 | 投稿の主力 |
| UC-03 | Zoomでいとことして参加 | レンダラー → OBS Virtual Camera → Zoom | 対象 | 自分の映像は出さない設定を確認 |
| UC-04 | Google Meetでいとことして参加 | レンダラー → OBS Virtual Camera → Meet | 検証 | OS・ブラウザごとに認識確認 |
| UC-05 | 流行動画の人物をキャラへ直接置換 | 生成AI video-to-video | 実験のみ | 権利・一貫性・GPU負荷が大きい |
| UC-06 | Instagram/TikTok内カメラで直接キャラ化 | ネイティブAR effect | 将来 | 審査、SDK、プラットフォーム依存が大きい |
| UC-07 | イベント会場で来場者がいとこを動かす | ローカルWebカメラ → VRM → 大画面 | 将来 | 撮影同意・子ども対応を別設計 |

## 4. 技術方針

### 4.1 3D資産形式

キャラクター配布正本は`VRM 1.0`を第一候補とする。VRMはglTF 2.0を基礎とし、Humanoid骨格、表情、揺れ物、作者・利用条件を一つのファイルへ含められる。編集正本はBlenderファイルとし、配信用にVRMを生成する。

```text
character-master/
  cousin-design-reference.pdf    # 作者監修済み設定画
  cousin-master.blend             # 編集正本。公開リポジトリへ置かない判断も可
  textures/                       # 元テクスチャ
  licenses/                       # 作者・用途・再許諾・AI利用条件
  exports/
    cousin-stream.vrm             # リアルタイム軽量版
    cousin-render.vrm             # 高品質収録版
    cousin-vrm-meta.json          # version/hash/author/license/approved_at
```

必要骨格:

- hips、spine、chest、neck、head
- left/right upper arm、lower arm、hand
- left/right upper leg、lower leg、foot、toes
- 指はMVP任意。ただし、指さし、手振り、ピースを使うなら主要指を追加する。
- しっぽはHumanoid外の追加骨。腰回転と独立した揺れ、手動ポーズ、衝突を持つ。
- 頭身が人間と大きく異なるため、膝・肘・足首の曲がる位置を見た目基準で監修する。

必須表情:

- neutral、happy、surprised、angry-lite、sad-lite、blink、blink-left、blink-right
- mouth-a/i/u/e/o、smile、oops、determined
- いとこ固有: `やっちゃった`、`次いこ次`、`暴走中`、`反省3秒`

ポリゴン・描画目安:

- stream版: 30〜60fpsを維持できる軽量構成。テクスチャ2K以下を基準に実測する。
- render版: 1080×1920収録時に輪郭と表情が崩れない品質を優先する。
- toon outlineの太さは画角・解像度で変わるため、顔アップ、全身、Zoom小窓の3条件で確認する。

### 4.2 実行ソフトの選定

第一検証候補は`SysMocap + OBS`とする。SysMocapはMPL-2.0で公開され、Windows/macOS、VRM 0.x/1.0、全身モーション、OBS連携を掲げている。採用前に、配布バイナリ、依存モデル、商用出力、通信先、クラッシュ復帰をローカルで確認する。

第二検証候補は`XR Animator + OBS`とする。Webカメラ・動画から顔、体、手を追跡し、VRM、VMD/BVH/glTF motion、VMCへ展開できる。ただしソース改変・サービス化にはCC BY-NC-SA 4.0が適用されるため、有償サービスへ組み込まない。自社素材から生成した動画出力には同ソフトが権利を主張しない旨が示されているが、第三者依存素材は別確認する。

`Warudo`は短期検証の有力fallbackとする。完成度、VMC、MediaPipe、OBS/Virtual Camera等の利点があるが、OSS前提の内製基盤とは分離し、利用規約・商用条件・更新依存を採用時に記録する。

`VTube Studio`はLive2D向けであり、3D VRMの主力にはしない。将来、いとこの2D上半身配信モデルを別制作する場合だけ再評価する。

### 4.3 自作する場合の構成

既存ツールで品質・運用・ライセンス要件を満たせない場合のみ自作する。

```text
Camera / Video file
  ↓
CaptureAdapter
  ↓
MediaPipe Pose Landmarker / Face / Hands
  ↓
LandmarkNormalizer
  ├─ confidence gate
  ├─ left/right correction
  ├─ missing-point interpolation
  └─ temporal smoothing
  ↓
HumanoidRetargeter
  ├─ human proportions → cousin proportions
  ├─ floor / foot lock
  ├─ joint limit
  └─ tail secondary motion
  ↓
VRMRenderer
  ├─ live preview
  ├─ transparent output
  └─ motion recording
  ↓
OBS / FFmpeg / VRMA export
```

MediaPipe Pose Landmarkerは、画像・動画・LIVE_STREAMを扱い、正規化座標と3D world coordinate、33個の姿勢ランドマーク、任意のsegmentation maskを出力できる。これはリグへ直接流せる完成品ではない。比例変換、関節制限、接地、欠損補間、平滑化が必要である。

自作境界インターフェース案:

```ts
type TrackingFrame = {
  capturedAtMs: number;
  sourceFrameIndex: number;
  body: LandmarkSet;
  face?: BlendshapeSet;
  hands?: { left?: LandmarkSet; right?: LandmarkSet };
  confidence: number;
};

type RetargetedPose = {
  timestampMs: number;
  rootPosition: Vec3;
  boneRotations: Record<HumanoidBoneName, Quaternion>;
  expressions: Record<ExpressionName, number>;
  qualityFlags: MotionQualityFlag[];
};

interface Tracker {
  start(source: CameraSource | VideoSource): Promise<void>;
  frames(): AsyncIterable<TrackingFrame>;
  stop(): Promise<void>;
}

interface Retargeter {
  calibrate(tPose: TrackingFrame, profile: AvatarProfile): Calibration;
  retarget(frame: TrackingFrame, calibration: Calibration): RetargetedPose;
}
```

## 5. トレンド発見フロー

### 5.1 発見元

- TikTok: Creative CenterのTrends、ハッシュタグ、楽曲、関連動画を人が確認する。
- YouTube: Shortsアプリ内の音源・テンプレート、YouTube Charts、Data APIの公開情報を補助的に使う。`mostPopular`は2025-07以降、音楽・映画・ゲームchart中心へ変更され、Shortsダンス専用ランキングではないため、それだけでトレンド判定しない。
- Instagram: Reelsの音源ページ、テンプレート、保存、競合・近接領域の公開投稿を人が確認する。非公開APIやスクレイピングを前提にしない。
- X/Threads: トレンド発見の補助と反応観測に使い、音源ライセンスの根拠にはしない。

### 5.2 TrendObservation

動画ファイルではなく観測事実を保存する。

```ts
type TrendObservation = {
  trendId: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'x' | 'threads';
  sourceUrl: string;
  creatorHandle: string;
  observedAt: string;
  region: string;
  movementSummary: string;
  signatureElements: string[];
  audioTitle?: string;
  platformAudioId?: string;
  durationSec?: number;
  apparentTrendAge: 'emerging' | 'rising' | 'saturated' | 'declining' | 'unknown';
  relevance: {
    cousinFit: 1 | 2 | 3 | 4 | 5;
    suwapuyoFit: 1 | 2 | 3 | 4 | 5;
    yourtimeFit: 1 | 2 | 3 | 4 | 5;
  };
  rightsStatus: 'inspiration-only' | 'platform-remix-available' | 'permission-requested' | 'permission-granted';
  notes: string;
};
```

保存禁止:

- 無断ダウンロードした動画・音声
- 投稿者の顔特徴量、姿勢データ、音声特徴量
- 非公開アカウントの内容
- 子どもと思われる人物の動画から抽出した動作データ
- source URLから推測した個人属性

### 5.3 採用スコア

候補は次で評価する。

```text
TrendScore =
  freshness 25
  cousin_character_fit 20
  recognizable_in_1_second 15
  reproducibility 10
  loopability 10
  story_connection 10
  platform_audio_availability 5
  production_cost 5
  - rights_risk 0..50
  - safety_risk 0..50
```

スコアが高くても、権利・安全Gateが未通過なら制作しない。単純なステップや短いジェスチャーは着想として再構成できる可能性が高いが、独創的な振付のまとまりは許諾または各媒体の正式Remix機能を優先する。

## 6. モーション取得・編集フロー

### 6.1 推奨MVP

1. TrendObservationを作成する。
2. 元動画を見ながら、動きの要素を言語化する。動画ファイルは取得しない。
3. 木幡さんまたは許諾済み演者が、自分のカメラで動きを再演する。
4. 収録前にTポーズ、正面、左右一歩、手振り、しゃがみを校正する。
5. motion captureでBVH / VMD / VRMA相当へ記録する。
6. Blender等でfoot sliding、手の貫通、肩、しっぽ、顔を補正する。
7. いとこへ適用し、無音・無ウォーターマークのmasterを収録する。
8. 各媒体アプリで許諾された音源を付与する。
9. 投稿前Gateを人が確認する。
10. 24時間、72時間、7日で結果を記録する。

### 6.2 いとこ体型へのリターゲット

人間の関節位置をそのまま写すと、短い脚、大きい頭、長いしっぽで破綻する。次の補正をキャラprofileとして固定する。

```ts
type AvatarRetargetProfile = {
  avatarId: 'yasu-cousin';
  modelVersion: string;
  hipHeightScale: number;
  armReachScale: number;
  legStrideScale: number;
  headRotationLimitDeg: number;
  elbowBendBias: number;
  kneeBendBias: number;
  footLockThreshold: number;
  handSmoothing: number;
  bodySmoothing: number;
  expressionSmoothing: number;
  tailMode: 'secondary-physics' | 'authored' | 'hybrid';
};
```

品質規則:

- 足接地中はworld positionをロックし、滑りを抑える。
- 片足が隠れた場合は、直前速度と接地状態から補間し、突然反転させない。
- 手が胴体へ入ったら、肩・肘の順で外側へ補正する。
- 頭は人の角度をそのまま増幅せず、かわいさを壊さない上限を設ける。
- しっぽは体の遅れとして動かし、振付の主動作を邪魔しない。
- 速いダンスでは平滑化を弱め、会話・Meetでは平滑化を強めるpresetを分ける。

### 6.3 MotionClip台帳

```ts
type MotionClip = {
  motionId: string;
  title: string;
  version: number;
  sourceType: 'original-performance' | 'licensed-choreography' | 'platform-remix' | 'motion-library';
  performerId: string;
  performerConsentId: string;
  inspirationUrls: string[];
  author?: string;
  license: string;
  commercialUse: boolean;
  redistribution: boolean;
  allowedPlatforms: string[];
  recordedAt: string;
  durationMs: number;
  fps: number;
  skeleton: string;
  rawVideoRetention: 'discard-after-extraction' | 'private-until-date';
  rawVideoDeleteAt?: string;
  motionFilePath: string;
  approvedBy: string;
  approvalDate: string;
};
```

## 7. 動画制作仕様

### 7.1 共通master

- canvas: 1080×1920、9:16
- frame rate: 30fpsを基準。高速振付は60fps収録→30fps納品を比較する。
- codec: H.264、yuv420p、音源なしまたは自作guide clickのみ
- duration: トレンド参加は6〜20秒を第一候補。物語・解説は20〜45秒。
- safe zone: 上下UI、右側リアクションUI、下部captionと衝突しない。
- 最初の0.5〜1.0秒で、顔・特徴動作・状況のいずれかを見せる。
- 最終フレームを冒頭へ自然につなげ、ループ可能性を確認する。
- 他媒体ロゴ、透かし、UIキャプチャを含めない。

### 7.2 Scene preset

| Preset | 用途 | 構図 | 背景 | カメラ |
|---|---|---|---|---|
| `dance-full` | 全身ダンス | 全身＋上下余白 | すわぷよ村 | 固定、軽い追従 |
| `dance-close` | 手・顔中心 | 膝上 | シンプル背景 | beatごとに微ズーム |
| `meta-room` | 制作裏側 | 腰上＋PC/メモ | 制作部屋 | ゆっくり寄る |
| `yourtime-stage` | イベント訴求 | 全身＋ロゴsafe area | 許諾済みイベント世界 | 固定 |
| `meeting` | Zoom/Meet | 胸上 | 無地/ブランド背景 | 固定 |

### 7.3 キャラ演技の追加

ただ踊りをコピーせず、いとこの物語を1点足す。

- 冒頭でフライングして音より先に動く。
- 途中で一度失敗し、即座に戻る。
- 最後に「できた顔」をするが、しっぽだけ遅れて転ぶ。
- 公式やすが画面端からチェック表を出す。
- メタ層として「この振付、ぼくの足の長さ想定してないよね？」と字幕を入れる。

毎回失敗させると無能キャラになるため、`成功 6 : 小失敗 3 : 大実験 1`を初期比率とする。

## 8. 媒体別公開設計

### 8.1 Instagram Reels

- 共通masterをアップロードし、音源はReels内で選ぶ。
- 一般のlicensed music libraryは個人・非商用用途が基本で、business accountや投稿種別により利用できない場合がある。
- 事業・サービスの訴求を含む投稿はMeta Sound Collectionまたは個別許諾音源を優先する。
- coverはプロフィール一覧の中央cropでも顔と動作が分かる。
- captionには物語、制作裏側、YourTIME/すわぷよとの接続を1つだけ置く。

### 8.2 YouTube Shorts

- 著作権音源を使う場合は、YouTube Shortsの`Use this sound`等の公式作成機能を使う。
- YouTube外で音源を焼き込んだ動画は、Content ID claim、削除、strikeの可能性がある。
- Shorts Audio Libraryの音源と、YouTube Studio Audio Libraryのroyalty-free音源を区別する。
- 公式Remix元が削除・制限されると、remix動画のmute、Unlisted化、削除が起こり得るため、無音masterを残す。
- titleは「キャラ名＋状況＋違和感」の一文とし、同一文の量産を避ける。

### 8.3 TikTok

- Creative Centerで地域・業種・期間を指定してトレンドを観測する。
- ブランド、商品、サービスを宣伝する投稿はCommercial Music Libraryを原則とする。
- CML外のoriginal sound/musicを使う場合は、権利を取得した証拠とMusic Usage Confirmationの対応を記録する。
- Business Accountは一般music libraryを商用目的で使えるとは扱わない。
- challenge参加時も、元動画の映像を取得せず、自作演技＋媒体内音源で制作する。

### 8.4 X / Threads

- 音源ライセンスをInstagram/TikTokから持ち出さない。
- 自作音源、個別許諾音源、各媒体でも利用可能な共通ライセンス音源だけを焼き込む。
- Xは技術・失敗・比較を短く添え、Threadsは迷い・問い・次の改善を会話として添える。

### 8.5 Zoom / Google Meet

- OBS Virtual CameraのProgram出力を会議カメラとして使う。
- meeting presetは胸上、口・目・手振りを優先し、全身追跡は切れる構図にしない。
- 会議前に、カメラ選択、左右反転、音声同期、CPU/GPU負荷、復帰手順を確認する。
- MeetはOS・ブラウザ・管理者policyでVirtual Cameraの見え方が異なる可能性があるため、対応済みとは実機確認まで表記しない。
- 重要商談では、1操作で通常カメラまたは静止画へ戻せるfallbackを用意する。

## 9. 音源・振付・人物の権利Gate

### 9.1 音源

公開前に次を全て記録する。

- 音源名、作者、platform audio ID、取得元
- 使用媒体、地域、投稿種別（organic / brand promotion / ad）
- 媒体内付与か、ファイルへ焼込みか
- 商用利用可否、期限、帰属表示
- 他媒体へ再利用可能か

`Instagramで選べた`、`TikTokで流行している`、`YouTubeに投稿されている`だけでは、他媒体や広告での利用許可にならない。

### 9.2 振付・動き

次の順で安全性を高く扱う。

1. 自分たちのオリジナル動作
2. 明示的な商用利用許諾を得た振付
3. 各媒体の正式Remix/Template機能内で許される利用
4. 短く一般的な動作要素を組み替えた独自演技
5. 特徴的な振付の一対一再現

5は許諾なしでは採用しない。法的保護の有無だけでなく、コミュニティからの盗用認識、投稿者への敬意、ブランド信頼を判断する。

### 9.3 演者・元動画

- 動作抽出に使う演者は本人同意を必須とする。
- 生の顔・体動画は、標準ではmotion抽出後に削除する。
- 顔、体、声をAIモデルの学習・fine-tuneへ使う場合は別同意とする。
- 子どもの演技収録、トレンド動画からの子ども動作抽出は本MVP対象外。
- 他者のInstagram/TikTok/YouTube動画をAI置換入力へ入れない。本人・権利者から具体的許可を得た検証だけ別管理する。

## 10. プライバシー・セキュリティ

- Webカメラ解析はローカル処理を第一候補とする。
- raw camera frameをanalytics、ログ、例外報告へ送らない。
- pose landmarksも演者と時刻を組み合わせれば個人関連情報になり得るため、公開リポジトリへ置かない。
- motion fileから元人物を再現できる可能性を考慮し、公開範囲を台帳で指定する。
- OBS sceneに通知、メール、ブラウザタブ、個人名が映らない専用OS profileを使う。
- Virtual Camera起動中は物理カメラ映像が誤ってsceneへ出ないことを確認する。
- stream key、SNS token、API key、meeting URLを動画・スクリーンショット・Gitへ含めない。

## 11. 制作データ構造

Source動画はGit外、Structured metadataと公開可能なmasterだけを条件付きでGit管理する。

```text
private-コンテンツ/                         # Git外・アクセス制御
  performers/{performer_id}/consent/
  captures/{capture_id}/raw/
  licensed-reference/{license_id}/

public/content/04_ツナやす_ブランド/
  cousin-vtuber/
    models/                              # 公開許諾があるexportだけ
    motions/                             # 再配布可能motionだけ
    scenes/
    renders/
      master/
      instagram/
      youtube/
      tiktok/

docs/80_制作過程/
  記録/
    YYYY-MM-DD_cousin-motion-{topic}.md
  証拠/
    YYYY-MM-DD_cousin-motion-{topic}/
  SNS/
    trend-observations/
    motion-register.json
    publication-register.json
```

既存のディレクトリ再編が完了するまで、上記を推測で作成しない。現行の`public/content/04_ツナやす_ブランド/`を素材正本とするか、別のbrand masterを持つかは再編担当の確定後に同期する。

## 12. PublicationJob

```ts
type PublicationJob = {
  jobId: string;
  conceptId: string;
  characterModelVersion: string;
  motionId: string;
  scenePreset: string;
  masterVideoPath: string;
  generatedWithAi: boolean;
  aiTools: string[];
  platforms: Array<{
    platform: 'instagram' | 'youtube' | 'tiktok' | 'x' | 'threads';
    accountId: string;
    audioMode: 'none' | 'platform-library' | 'commercial-library' | 'owned-audio' | 'licensed-file';
    platformAudioId?: string;
    rightsEvidenceId?: string;
    captionDraft: string;
    disclosure: string[];
    status: 'draft' | 'reviewed' | 'approved' | 'posted' | 'rejected';
    postUrl?: string;
    postedAt?: string;
  }>;
  reviews: {
    character: ReviewResult;
    rights: ReviewResult;
    safety: ReviewResult;
    quality: ReviewResult;
    factual: ReviewResult;
  };
};
```

投稿API連携は初期スコープ外とし、`approved`から`posted`への変更は人が実際の投稿URLを確認して行う。媒体の音源追加や最終cropを自動化すると、ライセンス選択と画面確認を飛ばすため、MVPは手動投稿を維持する。

## 13. 品質Gate

### 13.1 キャラクター

- いとこの顔、色、服、額記号、しっぽがapproved referenceと一致する。
- フレーム間で目、歯、指、模様、服が増減しない。
- 公式やすと誤認されず、並べるといとこと分かる。
- 性格に合う動作であり、毎回ただの流行コピーになっていない。

### 13.2 モーション

- 主要beatの±2 frame以内で動作が合う。
- 足滑りが連続3 frame以上目立たない。
- 肩、肘、膝が逆関節にならない。
- 手・しっぽ・服が胴体を大きく貫通しない。
- tracking欠損時に瞬間移動しない。
- loop境界で大きな位置jumpがない。

### 13.3 動画

- 1080×1920、音ズレ、黒frame、破損がない。
- 1秒以内に主役が分かる。
- UI safe zoneに顔・字幕・CTAが入らない。
- 他媒体watermarkがない。
- 自動字幕の誤変換、健康効果保証、権利誤認、他者攻撃がない。

### 13.4 公開

- motion、音源、背景、フォント、ロゴの権利証拠がある。
- AI生成の申告が媒体規約または内容上必要なら設定済み。
- 商用・サービス訴求を含むか判定済み。
- 個人情報、通知、内部画面、secretが映っていない。
- 投稿者、削除責任者、訂正窓口が決まっている。

## 14. テスト計画

### 14.1 モデル受入

- T-pose、歩行、180度回転、しゃがみ、ジャンプ、手振り、指さしを実行。
- 正面、斜め、横、顔アップ、全身で輪郭を確認。
- stream版を30分動かし、memory増加、温度、fps低下、tracking停止を確認。
- 低照度、逆光、背景に人物、手が顔を隠す、片足画面外を試す。

### 14.2 配信受入

- OBS preview、録画、Virtual Cameraを同時実行する。
- Zoom Windows/macOS、Google Meet Chromeで認識を確認する。
- camera disconnect、tracker crash、OBS再起動から60秒以内に復帰する。
- 通常カメラへ戻すfallbackを1操作で実行する。

### 14.3 投稿受入

- Instagram、YouTube、TikTokの投稿前previewでcropと音源を確認する。
- 無音masterのhashと投稿variantを対応付ける。
- 投稿後に音源名、credit、AI label、画質、caption、linkを再確認する。
- 24時間後にmute、claim、block、権利通知がないか確認する。

## 15. 計測・学習

プラットフォーム間でview定義が異なるため、単純合算しない。YouTube Shortsは2025-03-31以降、再生開始・再再生がviewに含まれるため、過去データや他媒体と同じ定義として扱わない。

記録指標:

- reach / views / unique viewers（取得できる範囲）
- 1秒、3秒、平均視聴時間、完視聴、loop/replay
- like、comment、save、share
- profile visit、follow、リンク遷移
- すわぷよ起動、LINE友だち追加、YourTIME情報閲覧
- 制作時間、修正回数、rights review時間、投稿までのtrend age
- キャラらしさの定性コメント

学習単位:

```text
仮説 → 投稿 → 数値 → コメント → キャラ適合 → 権利/制作コスト → 次の変更1つ
```

同時に多数の要素を変えない。最初はhook、尺、camera preset、失敗演技の有無のいずれか一つを比較する。

## 16. 段階導入

### Phase 0: 権利・キャラ確定

- いとこの正式デザイン、名称、作者・監修、AI入力、3D化、商用動画、再許諾を確定。
- 公式やすは本パイプライン対象外であることを確認。
- SNSアカウントがcreator活動と事業訴求のどちらを含むか確定。

### Phase 1: 技術spike

- 仮VRMでSysMocap、XR Animator、Warudoを比較。
- 5動作、10秒動画、Zoom小窓でfps、遅延、足滑り、表情、運用難度を採点。
- OSS採用候補のライセンス、依存、外部通信、保守性を記録。

### Phase 2: 正式3Dモデル

- ツナマヨさん監修のreference sheetからBlender/VRM 1.0を制作。
- stream版とrender版を分け、表情・しっぽ・衣装のQAを行う。
- VRM metadataへ作者・利用条件・versionを設定。

### Phase 3: オリジナル動画MVP

- 流行音源を使わず、オリジナル動作3本を収録。
- Instagram、YouTube、TikTokへ媒体別に手動投稿。
- 制作時間、crop、画質、キャラ反応を確認。

### Phase 4: トレンド参加MVP

- TrendObservationを週3〜10件作成。
- 権利Gateを通過した1〜2件だけ制作。
- 媒体内音源を使い、無音masterと公開variantを分離。

### Phase 5: 会議・イベント

- OBS Virtual CameraでZoom/Meetを実機確認。
- イベント会場での来場者操作は、撮影同意、子ども、保存、待ち時間を別Gateで設計。

### Phase 6: 生成AI pilot

- 自分の許諾済み動画といとこ専用referenceだけでWan2.2-Animate / LTX-2等を比較。
- 研究目的限定や非商用条件のモデルは、公開営業素材へ使わない。
- 3D retargetと同一briefで、キャラ一貫性、時間方向flicker、GPU費用、生成時間、破綻率、権利説明を比較し、記事化する。

## 17. 完了条件

本機能のMVP完了は次を全て満たした時とする。

- いとこの正式VRM 1.0モデルと利用許諾が確定している。
- 権利確認済み演者の動きで、10〜20秒の全身動画を3本制作できる。
- 1本あたりの人手制作時間と修正回数を計測している。
- Instagram、YouTube、TikTokの各previewで9:16表示を確認している。
- 音源なし共通masterと媒体別音源variantを追跡できる。
- ZoomでOBS Virtual Cameraが動き、通常カメラへ即復帰できる。
- 元動画無断保存、他媒体音源転載、子どもの動作抽出を行っていない。
- キャラ、権利、安全、品質、事実の5レビューを通過している。
- 実装・運用結果をprocess recordとして残している。

## 18. 未確定Gate

- VTUBE-01: いとこの造形・権利承認は取得済み。正式名称とCharacter Masterの形状・色・線・衣装・口調を確定。
- VTUBE-02: 3D、AI入力、動画、商用、広告は承認済み範囲として進行。一般配布、学習weight、無制限再許諾だけ別Gate。
- VTUBE-03: Blender/VRM制作担当、費用、納品物、修正回数、source引渡し。
- VTUBE-04: SNSアカウントをcreator/personalで始めるかbusiness運用にするか。音源範囲へ影響する。
- VTUBE-05: トレンド参加を有機投稿だけにするか、案件・サービス訴求・広告にも使うか。
- VTUBE-06: 演者同意書、raw動画保持期限、motion再利用・販売範囲。
- VTUBE-07: SysMocap / XR Animator / Warudoの実機spike結果と採用判断。
- VTUBE-08: Zoom/Meet利用時の表示名、録画、相手への説明方針。
- VTUBE-09: YourTIME名・会場・ロゴを含む動画の運営確認フロー。
- VTUBE-10: 生成AI動画を公開する場合の表示・透かし・監修方針。

## 19. 2026-07-13時点の一次情報

- [VRM Consortium](https://vrm-consortium.org/en/): VRM 1.0、Humanoid、表情、作者・利用条件metadataを含む3D avatar形式。
- [VRM Animation](https://vrm.dev/en/vrma/): VRM animation仕様と対応状況。
- [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender): BlenderでVRM import/export/editを行うOSS add-on。
- [SysMocap](https://github.com/xianfei/SysMocap): MPL-2.0、VRM 0.x/1.0、全身motion capture、OBS連携。
- [XR Animator](https://github.com/ButzYung/SystemAnimatorOnline): webcam/video全身追跡、VRM、motion export、VMC。source adaptationはCC BY-NC-SA 4.0。
- [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker): image/video/live stream、33個の3D pose landmarks、segmentation mask。
- [OBS Virtual Camera](https://obsproject.com/kb/virtual-camera-guide): OBS sceneをZoom等のwebcam入力へ渡す機能。
- [Warudo](https://warudo.app/): webcam/iPhone tracking、VRM、OBS/NDI/virtual camera。採用時に規約を再確認する。
- [Wan2.2 / Wan2.2-Animate](https://github.com/Wan-Video/Wan2.2): Apache-2.0の公式repositoryにAnimate-14Bのcharacter animation / replacementを収録。採用時は正確なcheckpointと依存条件を固定する。
- [LTX-Video / LTX-2](https://github.com/Lightricks/LTX-Video): keyframe、LoRA、image-to-video、同期A/Vの候補。codeとcheckpointのlicenseを分けて確認する。
- [TikTok Creative Center Trends](https://ads.tiktok.com/help/article/how-to-use-trends): 業種・期間別trend observation。
- [TikTok: Commercial use of music](https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/commercial-use-of-music-on-tiktok): 商用投稿ではCMLを推奨し、CML外は権利確認が必要。
- [Instagram: licensed music library](https://www.facebook.com/help/instagram/402084904469945): 一般licensed libraryはpersonal/non-commercial用途が基本。business向けにSound Collectionがある。
- [YouTube: Shorts remix](https://support.google.com/youtube/answer/10623810): platform内remix、source attribution、外部焼込み時のclaim/removalリスク。
- [YouTube Audio Library](https://support.google.com/youtube/answer/3376882): YouTube内でcopyright-safeとして提供される音源・効果音。
- [YouTube Data API revision history](https://developers.google.com/youtube/v3/revision_history): `mostPopular`変更、Shorts view count定義変更。

本書は実装・運用上の安全設計であり、個別の振付・音源・契約に関する法的助言を代替しない。プラットフォーム仕様とライセンスは投稿直前にも再確認する。
