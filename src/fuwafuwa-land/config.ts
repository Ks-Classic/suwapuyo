export interface FuwafuwaConfig {
  brandId: string;
  background: { imageUrl?: string; color: number };
  sampleCharacters: { id: string; imageUrl: string }[];
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
}

export const SUUSUU_CONFIG: FuwafuwaConfig = {
  brandId: "suusuu-waawaa",
  background: { imageUrl: "/assets/ui/village_bg.png", color: 0xb8e5f7 },
  sampleCharacters: [
    { id: "sample-ghost", imageUrl: "/assets/sprites/ghost/idle.png" },
    { id: "sample-tooth", imageUrl: "/assets/sprites/tooth/idle.png" },
    { id: "sample-blob", imageUrl: "/assets/sprites/blob/idle.png" },
    { id: "sample-tanuki", imageUrl: "/assets/sprites/tanuki/idle.png" },
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
};

export const ARTWORK_BUCKET = "artworks";
export const DISPLAY_STATE_ID = "current";
