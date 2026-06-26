import { DEFAULT_ARTWORK_DISPLAY_SCALE, type Artwork, type ArtworkStatus } from "../types";

export interface SampleCharacter {
  id: string;
  label: string;
  imageUrl: string;
  sourceImageUrl: string;
}

export const SAMPLE_CHARACTERS: SampleCharacter[] = [
  { id: "sample-suusuu", imageUrl: "/content/fuwafuwa-land/characters/display/suusuu.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/01_すーすー.png", label: "すーすー" },
  { id: "sample-waawaa", imageUrl: "/content/fuwafuwa-land/characters/display/waawaa.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/02_わーわー.png", label: "わーわー" },
  { id: "sample-tanupei", imageUrl: "/content/fuwafuwa-land/characters/display/tanupei.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/03_たぬぺい.png", label: "たぬぺい" },
  { id: "sample-wanono", imageUrl: "/content/fuwafuwa-land/characters/display/wanono.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/04_わのの.png", label: "わのの" },
  { id: "sample-shinbo", imageUrl: "/content/fuwafuwa-land/characters/display/shinbo.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/05_シンボー.png", label: "シンボー" },
  { id: "sample-ketonyan", imageUrl: "/content/fuwafuwa-land/characters/display/ketonyan.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/06_けとにゃん.png", label: "けとにゃん" },
  { id: "sample-mogupiyo", imageUrl: "/content/fuwafuwa-land/characters/display/mogupiyo.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/07_もぐぴよ.png", label: "もぐぴよ" },
  { id: "sample-chippippi", imageUrl: "/content/fuwafuwa-land/characters/display/chippippi.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/08_チッピッピ.png", label: "チッピッピ" },
  { id: "sample-sanka", imageUrl: "/content/fuwafuwa-land/characters/display/sanka.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/09_酸化.png", label: "酸化" },
  { id: "sample-touka", imageUrl: "/content/fuwafuwa-land/characters/display/touka.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/10_糖化.png", label: "糖化" },
  { id: "sample-enshou", imageUrl: "/content/fuwafuwa-land/characters/display/enshou.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/11_炎症.png", label: "炎症" },
  { id: "sample-rapiko", imageUrl: "/content/fuwafuwa-land/characters/display/rapiko.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/12_ラピ子.png", label: "ラピ子" },
  { id: "sample-emahime", imageUrl: "/content/fuwafuwa-land/characters/display/emahime.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/13_えまひめ.png", label: "えまひめ" },
  { id: "sample-hagurin", imageUrl: "/content/fuwafuwa-land/characters/display/hagurin.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/14_はぐりん.png", label: "はぐりん" },
  { id: "sample-mieru", imageUrl: "/content/fuwafuwa-land/characters/display/mieru.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/15_ミエル.png", label: "ミエル" },
  { id: "sample-tenpiyo", imageUrl: "/content/fuwafuwa-land/characters/display/tenpiyo.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/16_てんぴよ.png", label: "てんぴよ" },
  { id: "sample-kamumu", imageUrl: "/content/fuwafuwa-land/characters/display/kamumu.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/かむむ.png", label: "かむむ" },
  { id: "sample-sukusuke", imageUrl: "/content/fuwafuwa-land/characters/display/sukusuke.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/すくすけ.png", label: "すくすけ" },
  { id: "sample-sukumaru", imageUrl: "/content/fuwafuwa-land/characters/display/sukumaru.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/すくまる.png", label: "すくまる" },
  { id: "sample-seiucchi", imageUrl: "/content/fuwafuwa-land/characters/display/seiucchi.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/セイウッチー.png", label: "セイウッチー" },
  { id: "sample-mamyu", imageUrl: "/content/fuwafuwa-land/characters/display/mamyu.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/マミュー.png", label: "マミュー" },
  { id: "sample-haisha-gorisan", imageUrl: "/content/fuwafuwa-land/characters/display/haisha-gorisan.png", sourceImageUrl: "/content/fuwafuwa-land/characters/originals/歯医者のごりさん.png", label: "歯医者のごりさん" },
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
