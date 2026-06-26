import { SAMPLE_CHARACTERS } from "./renderer/sampleCharacters";

export interface SponsorSlide {
  src: string;
  kind?: "image" | "video";
  alt?: string;
}

export interface TappableSponsor {
  id: string;
  name: string;
  characterImg: string;
  slides: SponsorSlide[];
  body?: string;
  cta?: { label: string; url: string } | null;
  scale?: number;
}

export interface FuwafuwaConfig {
  brandId: string;
  background: { imageUrl?: string; color: number };
  sampleCharacters: { id: string; imageUrl: string }[];
  sponsors: TappableSponsor[];
  display: {
    standardCount: 12;
    maxCount: 30;
    selectableCounts: [8, 12, 20, 30];
  };
  motion: {
    driftSpeed: number;
    bobAmplitude: number;
    bobPeriodMs: number;
    rotationJitter: number;
  };
  capture: {
    outputLongEdge: 1280;
    minOutputLongEdge: 720;
    maxUploadBytes: 1_200_000;
    jpegQuality: 0.85;
    whiteKey: boolean;
  };
  card: {
    cornerRadius: number;
    shadow: boolean;
  };
  secretMode: {
    triggerSampleId: string;
    tapCount: 5;
    tapWindowMs: 2500;
    audioUrl: string;
    modeText: string;
    speedMultiplier: 1.5;
    rainCount: 20;
  };
  events: {
    battleDurationMs: 12_000;
    battleRestitution: 0.92;
  };
}

export const SUUSUU_CONFIG: FuwafuwaConfig = {
  brandId: "suusuu-waawaa",
  background: { imageUrl: "/content/fuwafuwa-land/backgrounds/village-bg.png", color: 0xb8e5f7 },
  sampleCharacters: SAMPLE_CHARACTERS.map(({ id, imageUrl }) => ({ id, imageUrl })),
  sponsors: [
    {
      id: "suusuu",
      name: "すーすー",
      characterImg: "/content/fuwafuwa-land/characters/display/suusuu.png",
      slides: [
        { src: "/content/yourtime-platform/videos/booth-introduction.mp4", kind: "video", alt: "ブースで流す紹介動画" },
      ],
      cta: null,
      scale: 1,
    },
  ],
  display: {
    standardCount: 12,
    maxCount: 30,
    selectableCounts: [8, 12, 20, 30],
  },
  motion: {
    driftSpeed: 0.09,
    bobAmplitude: 18,
    bobPeriodMs: 4200,
    rotationJitter: 0.05,
  },
  capture: {
    outputLongEdge: 1280,
    minOutputLongEdge: 720,
    maxUploadBytes: 1_200_000,
    jpegQuality: 0.85,
    whiteKey: true,
  },
  card: {
    cornerRadius: 22,
    shadow: true,
  },
  secretMode: {
    triggerSampleId: "sample-waawaa",
    tapCount: 5,
    tapWindowMs: 2500,
    audioUrl: "/content/fuwafuwa-land/audio/suwa-good-morning.mp3",
    modeText: "わーわーもーど!",
    speedMultiplier: 1.5,
    rainCount: 20,
  },
  events: {
    battleDurationMs: 12_000,
    battleRestitution: 0.92,
  },
};

export const ARTWORK_BUCKET = "artworks";
export const CHARACTER_CONTENT_BUCKET = "character-content";
export const DISPLAY_STATE_ID = "current";
