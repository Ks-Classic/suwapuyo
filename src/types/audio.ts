export interface AudioConfig {
  id: string;
  src: string;
  volume: number;
  loop?: boolean;
}

export type SECategory = "move" | "rotate" | "land" | "harddrop" | "pop" | "gameover" | "levelup";
