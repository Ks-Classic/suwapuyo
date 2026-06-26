import { useEffect, useMemo, useRef, useState } from "react";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";
import {
  YOUR_TIME_EVENT_LINKS,
  YOUR_TIME_QUESTIONS,
  YOUR_TIME_THEMES,
  type YourTimeThemeId,
} from "../config/yourTimePlatform";
import { PUYO_TYPES } from "../config/puyoTypes";
import styles from "../styles/demo.module.css";

const recommendationLabels = {
  learn: "学ぶ",
  meet: "出会う",
  try: "やってみる",
} as const;

type GardenResident = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  home: GardenSpotId;
};

type GardenSpotId = "tree" | "house" | "well" | "pond" | "shop" | "path";

type GardenSpot = {
  id: GardenSpotId;
  label: string;
  x: number;
  y: number;
};

type ResidentMood = "curious" | "relaxed" | "chatty" | "helping";

type ResidentActor = {
  id: string;
  name: string;
  role: string;
  sprite: Sprite;
  label: Text;
  action: Text;
  mood: ResidentMood;
  target: GardenSpot;
  speed: number;
  waitMs: number;
  wanderSeed: number;
};

const GARDEN_WIDTH = 420;
const GARDEN_HEIGHT = 300;

const gardenSpots: GardenSpot[] = [
  { id: "tree", label: "木かげ", x: 72, y: 182 },
  { id: "house", label: "おうち", x: 340, y: 172 },
  { id: "well", label: "井戸", x: 176, y: 136 },
  { id: "pond", label: "池", x: 118, y: 238 },
  { id: "shop", label: "健康屋台", x: 300, y: 218 },
  { id: "path", label: "さんぽ道", x: 214, y: 224 },
];

const moodActions: Record<ResidentMood, string[]> = {
  curious: ["見に行く", "のぞいてる", "発見した"],
  relaxed: ["ひと休み", "深呼吸", "ぽかぽか"],
  chatty: ["おしゃべり", "あいさつ", "相談中"],
  helping: ["お手伝い", "配ってる", "準備中"],
};

const baseResidents: GardenResident[] = [
  {
    id: "blob",
    name: "すーすー",
    image: PUYO_TYPES.blob.sprites.idle,
    role: "木かげで休む",
    home: "tree",
  },
  {
    id: "tooth",
    name: "わーわー",
    image: PUYO_TYPES.tooth.sprites.idle,
    role: "井戸で歯みがき",
    home: "well",
  },
  {
    id: "ghost",
    name: "わのの",
    image: PUYO_TYPES.ghost.sprites.idle,
    role: "丘から見守る",
    home: "path",
  },
  {
    id: "tanuki",
    name: "たぬぺい",
    image: PUYO_TYPES.tanuki.sprites.idle,
    role: "お店を手伝う",
    home: "shop",
  },
];

function LifeGarden({
  myCharacterImage,
  myCharacterName,
}: {
  myCharacterImage: string | null;
  myCharacterName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const actorsRef = useRef<ResidentActor[]>([]);
  const myCharacterImageRef = useRef(myCharacterImage);
  const myCharacterNameRef = useRef(myCharacterName);

  const residents = useMemo<GardenResident[]>(
    () => [
      ...baseResidents,
      {
        id: "my-character",
        name: myCharacterName || "マイキャラ",
        image: myCharacterImage,
        role: "みんなに挨拶",
        home: "house",
      },
    ],
    [myCharacterImage, myCharacterName]
  );

  useEffect(() => {
    myCharacterImageRef.current = myCharacterImage;
    myCharacterNameRef.current = myCharacterName;
  }, [myCharacterImage, myCharacterName]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    let cancelled = false;
    const app = new Application();
    appRef.current = app;

    async function init() {
      await app.init({
        width: GARDEN_WIDTH,
        height: GARDEN_HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      if (!host) return;
      host.appendChild(app.canvas);
      app.canvas.className = styles.lifeGardenCanvas;

      drawGarden(app.stage);
      const actors = await createActors(app.stage, residents);
      actorsRef.current = actors;

      app.ticker.add((ticker) => {
        updateActors(actorsRef.current, ticker.deltaMS);
      });
    }

    init().catch((error) => {
      console.error("LifeGarden init error:", error);
    });

    return () => {
      cancelled = true;
      actorsRef.current = [];
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [residents]);

  return (
    <div className={styles.lifeGarden} ref={containerRef} aria-label="YOUR TIMEの暮らす庭">
      <p>YOUR TIMEの庭で、健康キャラたちが暮らしながら親子を案内する</p>
    </div>
  );
}

function drawGarden(stage: Container) {
  const bg = new Graphics();
  bg.roundRect(0, 0, GARDEN_WIDTH, GARDEN_HEIGHT, 22).fill(0xc5e8f7);
  bg.rect(0, 150, GARDEN_WIDTH, 150).fill(0xb8e9a6);
  bg.ellipse(210, 250, 175, 34).fill({ color: 0xfff5e0, alpha: 0.9 });
  bg.circle(360, 40, 22).fill(0xffd93d);
  bg.ellipse(86, 54, 46, 16).fill({ color: 0xffffff, alpha: 0.78 });
  bg.ellipse(262, 72, 38, 14).fill({ color: 0xffffff, alpha: 0.7 });
  stage.addChild(bg);

  drawTree(stage, 54, 158);
  drawHouse(stage, 328, 164);
  drawSpot(stage, "井戸", 176, 136, 0xffffff);
  drawSpot(stage, "池", 112, 236, 0x80d8f7, 92, 42);
  drawSpot(stage, "健康屋台", 300, 218, 0xfff8e7, 84, 38);

  for (const spot of gardenSpots) {
    const marker = new Graphics();
    marker.circle(spot.x, spot.y + 22, 4).fill({ color: 0xf5a623, alpha: 0.26 });
    stage.addChild(marker);
  }
}

function drawTree(stage: Container, x: number, y: number) {
  const tree = new Graphics();
  tree.roundRect(x + 22, y + 36, 14, 50, 8).fill(0x9b6a3d);
  tree.circle(x + 28, y + 26, 36).fill(0x6bbf4e);
  tree.circle(x + 12, y + 42, 26).fill(0x8bd46e);
  tree.circle(x + 46, y + 42, 28).fill(0x5dae3e);
  stage.addChild(tree);
}

function drawHouse(stage: Container, x: number, y: number) {
  const house = new Graphics();
  house.poly([x - 44, y - 10, x, y - 48, x + 44, y - 10]).fill(0xf5a623);
  house.roundRect(x - 38, y - 12, 76, 58, 8).fill(0xfff8e7);
  house.roundRect(x - 8, y + 12, 16, 34, 5).fill(0xb08860);
  stage.addChild(house);

  const label = makeText("おうち", 12, "#7A634E");
  label.anchor.set(0.5);
  label.x = x;
  label.y = y + 34;
  stage.addChild(label);
}

function drawSpot(
  stage: Container,
  labelText: string,
  x: number,
  y: number,
  color: number,
  width = 58,
  height = 32
) {
  const spot = new Graphics();
  spot.roundRect(x - width / 2, y - height / 2, width, height, height / 2).fill({
    color,
    alpha: 0.88,
  });
  spot.roundRect(x - width / 2, y - height / 2, width, height, height / 2).stroke({
    color: 0x7a634e,
    alpha: 0.12,
    width: 2,
  });
  stage.addChild(spot);

  const label = makeText(labelText, 11, "#4A3728");
  label.anchor.set(0.5);
  label.x = x;
  label.y = y;
  stage.addChild(label);
}

async function createActors(stage: Container, residents: GardenResident[]) {
  const actors: ResidentActor[] = [];
  const fallbackTexture = Texture.WHITE;

  for (const resident of residents) {
    const texture = resident.image
      ? await Assets.load<Texture>(resident.image).catch(() => fallbackTexture)
      : fallbackTexture;
    const spot = findSpot(resident.home);
    const wrap = new Container();
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = 52;
    sprite.height = 52;
    if (!resident.image) {
      sprite.tint = 0xfff8e7;
    }

    const name = makeText(resident.name, 11, "#4A3728");
    name.anchor.set(0.5);
    name.y = 34;

    const action = makeText(resident.role, 10, "#7A634E");
    action.anchor.set(0.5);
    action.y = -38;
    action.alpha = 0;

    wrap.addChild(sprite, name, action);
    wrap.x = spot.x + randomBetween(-16, 16);
    wrap.y = spot.y + randomBetween(-10, 10);
    stage.addChild(wrap);

    const mood = chooseMood(resident.id);
    actors.push({
      id: resident.id,
      name: resident.name,
      role: resident.role,
      sprite: wrap as unknown as Sprite,
      label: name,
      action,
      mood,
      target: pickNextSpot(spot.id),
      speed: randomBetween(0.018, 0.034),
      waitMs: randomBetween(400, 2200),
      wanderSeed: Math.random() * Math.PI * 2,
    });
  }

  return actors;
}

function updateActors(actors: ResidentActor[], dtMs: number) {
  const dt = Math.min(dtMs, 33);
  const now = performance.now();

  for (const actor of actors) {
    if (actor.waitMs > 0) {
      actor.waitMs -= dt;
      actor.sprite.y += Math.sin(now * 0.004 + actor.wanderSeed) * 0.018 * dt;
      actor.action.alpha = Math.max(0, Math.sin((now + actor.wanderSeed * 200) * 0.002));
      continue;
    }

    const dx = actor.target.x - actor.sprite.x;
    const dy = actor.target.y - actor.sprite.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 5) {
      actor.waitMs = randomBetween(900, 2600);
      actor.target = pickNextSpot(actor.target.id);
      actor.mood = randomMood();
      actor.action.text = randomAction(actor.mood);
      continue;
    }

    actor.sprite.x += (dx / distance) * actor.speed * dt;
    actor.sprite.y += (dy / distance) * actor.speed * dt;
    actor.sprite.rotation = Math.sin(now * 0.004 + actor.wanderSeed) * 0.08;
    actor.sprite.scale.x = dx < 0 ? -1 : 1;
    actor.action.alpha = 0.82;
  }
}

function makeText(text: string, fontSize: number, fill: string) {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: "'M PLUS Rounded 1c', sans-serif",
      fontSize,
      fontWeight: "900",
      fill,
      stroke: { color: "#ffffff", width: 3 },
    }),
  });
}

function findSpot(id: GardenSpotId) {
  return gardenSpots.find((spot) => spot.id === id) ?? gardenSpots[0];
}

function pickNextSpot(current: GardenSpotId) {
  const candidates = gardenSpots.filter((spot) => spot.id !== current);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function chooseMood(id: string): ResidentMood {
  if (id === "blob") return "relaxed";
  if (id === "tooth") return "chatty";
  if (id === "tanuki") return "helping";
  return "curious";
}

function randomMood(): ResidentMood {
  const moods: ResidentMood[] = ["curious", "relaxed", "chatty", "helping"];
  return moods[Math.floor(Math.random() * moods.length)];
}

function randomAction(mood: ResidentMood) {
  const actions = moodActions[mood];
  return actions[Math.floor(Math.random() * actions.length)];
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function getResultTheme(answers: Record<string, YourTimeThemeId>) {
  const counts: Record<YourTimeThemeId, number> = {
    rest: 0,
    oral: 0,
    mibyo: 0,
    continuity: 0,
  };

  for (const theme of Object.values(answers)) {
    counts[theme] += 1;
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as YourTimeThemeId;
}

export function YourTimeReflectionDemo() {
  const [answers, setAnswers] = useState<Record<string, YourTimeThemeId>>({});
  const [myCharacterName, setMyCharacterName] = useState("マイキャラ");
  const [myCharacterImage, setMyCharacterImage] = useState<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const isComplete = YOUR_TIME_QUESTIONS.every((question) => answers[question.id]);
  const resultThemeId = useMemo(
    () => (isComplete ? getResultTheme(answers) : null),
    [answers, isComplete]
  );
  const result = resultThemeId ? YOUR_TIME_THEMES[resultThemeId] : null;
  const character = result ? PUYO_TYPES[result.puyoType] : null;

  function chooseAnswer(questionId: string, theme: YourTimeThemeId) {
    setAnswers((current) => ({ ...current, [questionId]: theme }));
  }

  function reset() {
    setAnswers({});
  }

  function handleCharacterImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    imageUrlRef.current = nextUrl;
    setMyCharacterImage(nextUrl);
  }

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
    };
  }, []);

  return (
    <section className={styles.platformPanel} aria-label="YOUR TIMEふりかえり診断">
      <div className={styles.platformBody}>
        <div className={styles.platformHeading}>
          <p>YOUR TIME ふりかえり診断</p>
          <span>紙のスタンプラリー後に、親子の次の入口を見つける</span>
        </div>
        <div className={styles.platformIntro}>
          <p>
            診断ではなく、イベント後の小さなふりかえりです。ランキングではなく、
            親子に合いそうな「次の入口」を3つだけ出します。
          </p>
        </div>

        <LifeGarden
          myCharacterImage={myCharacterImage}
          myCharacterName={myCharacterName}
        />

        <div className={styles.myCharacterBuilder}>
          <div className={styles.myCharacterPreview}>
            {myCharacterImage ? (
              <img src={myCharacterImage} alt={myCharacterName} />
            ) : (
              <span>え</span>
            )}
          </div>
          <div className={styles.myCharacterControls}>
            <label>
              今日のマイキャラ名
              <input
                value={myCharacterName}
                onChange={(event) => setMyCharacterName(event.target.value)}
                maxLength={16}
              />
            </label>
            <label className={styles.uploadButton}>
              タブレットで描いた絵を入れる
              <input
                type="file"
                accept="image/*"
                onChange={handleCharacterImage}
              />
            </label>
            <p>
              その場で保存した絵を読み込むだけのデモです。画像は外部送信しません。
            </p>
          </div>
        </div>

        <div className={styles.questionList}>
          {YOUR_TIME_QUESTIONS.map((question, index) => (
            <fieldset key={question.id} className={styles.questionCard}>
              <legend>
                {index + 1}. {question.label}
              </legend>
              <div className={styles.optionGrid}>
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.theme;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={`${styles.answerButton} ${
                        selected ? styles.answerButtonSelected : ""
                      }`}
                      onClick={() => chooseAnswer(question.id, option.theme)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {result && character && (
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <img
                src={character.sprites.idle}
                alt={result.characterName}
                className={styles.resultCharacter}
              />
              <div>
                <p className={styles.resultKicker}>
                  今日の親子テーマ: {result.characterName}
                </p>
                <h2>{result.themeTitle}</h2>
              </div>
            </div>
            <p className={styles.resultCopy}>{result.resultCopy}</p>
            <div className={styles.weeklyAction}>
              <span>今週の小さな一歩</span>
              <strong>{result.weeklyAction}</strong>
            </div>
            {myCharacterImage && (
              <div className={styles.myCharacterResult}>
                <img src={myCharacterImage} alt={myCharacterName} />
                <div>
                  <span>今日生まれたマイキャラ</span>
                  <strong>{myCharacterName || "マイキャラ"}</strong>
                  <p>
                    {result.characterName}と一緒に、今週の親子ミッションを連れて帰ります。
                  </p>
                </div>
              </div>
            )}
            <div className={styles.recommendationList}>
              {result.recommendations.map((recommendation) => (
                <article key={recommendation.title} className={styles.recommendationCard}>
                  <span>{recommendationLabels[recommendation.kind]}</span>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.description}</p>
                  <small>{recommendation.reason}</small>
                </article>
              ))}
            </div>
            <button type="button" className={styles.resetButton} onClick={reset}>
              もう一度えらぶ
            </button>
          </div>
        )}
        <div className={styles.eventLinkPanel}>
          <div className={styles.eventLinkHeader}>
            <p>あとで見られるYOUR TIMEの入口</p>
            <span>公式発信・参加回・出展者紹介を控えめに表示</span>
          </div>
          <div className={styles.eventLinkList}>
            {YOUR_TIME_EVENT_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                <strong>{link.title}</strong>
                <span>{link.description}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
