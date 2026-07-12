import { describe, expect, it } from "vitest";
import { buildConsultationDraft } from "./makerDraft";

describe("makerDraft", () => {
  it("builds a draft that reflects the selected problem and cta", () => {
    const draft = buildConsultationDraft("efficiency", "talk_after_event");
    expect(draft).toContain("発信や日々の業務にかかる時間や手間を");
    expect(draft).toContain("イベントが終わったあとに少しお話できたら");
  });

  it("produces a different draft for each problem/cta combination", () => {
    const recognition = buildConsultationDraft("recognition", "ask_general");
    const experience = buildConsultationDraft("experience", "see_cases");
    expect(recognition).not.toBe(experience);
  });
});
