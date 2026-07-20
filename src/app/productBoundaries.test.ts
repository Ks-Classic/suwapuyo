import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SUWAPUYO_CORE_FILES = [
  "src/app/MvpApp.tsx",
  "src/config/characters.ts",
  "src/game/GameRoute.tsx",
  "src/exercise/ExerciseScreen.tsx",
  "src/onboarding/OnboardingFlow.tsx",
  "src/progress/ProgressScreens.tsx",
  "src/village/VillageScreens.tsx",
] as const;

describe("product dependency boundaries", () => {
  it.each(SUWAPUYO_CORE_FILES)("keeps %s independent from fuwafuwa-land internals", (relativePath) => {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*fuwafuwa-land/);
  });
});
