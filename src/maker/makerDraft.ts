import { CTA_DRAFT_CLOSING, PROBLEM_DRAFT_INTRO } from "./makerCopy";
import type { MakerCtaType, MakerProblemId } from "./makerTypes";

export function buildConsultationDraft(problemId: MakerProblemId, ctaType: MakerCtaType): string {
  return [
    "こんにちは。YourTIME.のすわぷよを見て、ご連絡しました。",
    PROBLEM_DRAFT_INTRO[problemId],
    CTA_DRAFT_CLOSING[ctaType],
    "よろしければ教えてください。",
  ].join("\n");
}
