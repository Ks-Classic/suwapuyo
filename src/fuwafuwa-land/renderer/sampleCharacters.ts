import { DEFAULT_ARTWORK_DISPLAY_SCALE, type Artwork, type ArtworkStatus } from "../types";

export interface SampleCharacter {
  id: string;
  label: string;
  imageUrl: string;
  sourceImageUrl: string;
}

export const SAMPLE_CHARACTERS: SampleCharacter[] = [
  { id: "sample-suusuu", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/01_すーすー.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/01_すーすー.png", label: "すーすー" },
  { id: "sample-waawaa", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/02_わーわー.png", label: "わーわー" },
  { id: "sample-tanupei", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/03_たぬぺい.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/03_たぬぺい.png", label: "たぬぺい" },
  { id: "sample-wanono", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/04_わのの.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/04_わのの.png", label: "わのの" },
  { id: "sample-shinbo", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/05_シンボー.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/05_シンボー.png", label: "シンボー" },
  { id: "sample-ketonyan", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/06_けとにゃん.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/06_けとにゃん.png", label: "けとにゃん" },
  { id: "sample-mogupiyo", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/07_もぐぴよ.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/07_もぐぴよ.png", label: "もぐぴよ" },
  { id: "sample-chippippi", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/08_チッピッピ.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/08_チッピッピ.png", label: "チッピッピ" },
  { id: "sample-sanka", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/09_酸化.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/09_酸化.png", label: "酸化" },
  { id: "sample-touka", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/10_糖化.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/10_糖化.png", label: "糖化" },
  { id: "sample-enshou", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/11_炎症.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/11_炎症.png", label: "炎症" },
  { id: "sample-rapiko", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/12_ラピ子.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/12_ラピ子.png", label: "ラピ子" },
  { id: "sample-emahime", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/13_えまひめ.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/13_えまひめ.png", label: "えまひめ" },
  { id: "sample-hagurin", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/14_はぐりん.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/14_はぐりん.png", label: "はぐりん" },
  { id: "sample-mieru", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/15_ミエル.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/15_ミエル.png", label: "ミエル" },
  { id: "sample-tenpiyo", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/16_てんぴよ.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/16_てんぴよ.png", label: "てんぴよ" },
  { id: "sample-kamumu", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/17_かむむ.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/17_かむむ.png", label: "かむむ" },
  { id: "sample-sukusuke", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/18_すくすけ.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/18_すくすけ.png", label: "すくすけ" },
  { id: "sample-sukumaru", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/19_すくまる.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/19_すくまる.png", label: "すくまる" },
  { id: "sample-seiucchi", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/20_セイウッチー.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/20_セイウッチー.png", label: "セイウッチー" },
  { id: "sample-mamyu", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/21_マミュー.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/21_マミュー.png", label: "マミュー" },
  { id: "sample-haisha-gorisan", imageUrl: "/content/01_すわぷよ/01_キャラクター/02_表示用/22_歯医者のごりさん.png", sourceImageUrl: "/content/01_すわぷよ/01_キャラクター/01_原本/22_歯医者のごりさん.png", label: "歯医者のごりさん" },
];

export function isSampleCharacterId(id: string): boolean {
  return SAMPLE_CHARACTERS.some((sample) => sample.id === id);
}

export function createSampleArtwork(sample: SampleCharacter, status: ArtworkStatus): Artwork {
  return {
    id: sample.id,
    displayLabel: sample.label,
    givenName: sample.label,
    source: "digital",
    imageBlobKey: sample.imageUrl,
    width: 1024,
    height: 1024,
    displayScale: DEFAULT_ARTWORK_DISPLAY_SCALE,
    status,
    consentScope: "event_only",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    showCount: 0,
    notes: `Default sample from ${sample.sourceImageUrl}`,
  };
}
