export interface SampleCharacter {
  id: string;
  label: string;
  imageUrl: string;
}

export const SAMPLE_CHARACTERS: SampleCharacter[] = [
  { id: "sample-ghost", imageUrl: "/assets/sprites/ghost/idle.png", label: "わのの" },
  { id: "sample-tooth", imageUrl: "/assets/sprites/tooth/idle.png", label: "わーわー" },
  { id: "sample-blob", imageUrl: "/assets/sprites/blob/idle.png", label: "すーすー" },
  { id: "sample-tanuki", imageUrl: "/assets/sprites/tanuki/idle.png", label: "たぬぺい" },
];
