import type { PathEntry, ReadingLocation } from "./document";
export type ReaderCommand =
  | { type: "chapter"; id: string }
  | { type: "move"; delta: number }
  | { type: "panel"; id: string }
  | { type: "choose"; id: string }
  | { type: "cursor"; index: number }
  | { type: "switchRoute"; id: string }
  | { type: "dropRoute"; id: string }
  | {
      type: "restore";
      location: ReadingLocation;
      trail?: PathEntry[];
      cursor?: number;
    };
export interface Notice {
  text: string;
  tone: "success" | "error";
}
export const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
