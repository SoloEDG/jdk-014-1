export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ChoiceCondition {
  kind: "choice" | "panel";
  id: string;
}
export interface Choice {
  id: string;
  label: string;
  targetPanelId: string;
  condition?: ChoiceCondition;
}
export interface Panel {
  id: string;
  rect: Rect;
  dialogue: string;
  speaker: string;
  sound: "rain" | "pulse" | "wind";
  duration: number;
  choices?: Choice[];
  continueTo?: string;
}
export interface ComicPage {
  id: string;
  title: string;
  image: string;
  width: number;
  height: number;
  panels: Panel[];
}
export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  pages: ComicPage[];
}
export interface ComicDocument {
  version: 1;
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}
export interface ReadingLocation {
  chapterId: string;
  pageId: string;
  panelId: string;
  zoom: number;
  x: number;
  y: number;
}
export interface PathEntry {
  chapterId: string;
  pageId: string;
  panelId: string;
  viaChoiceId?: string;
}
export interface RouteRecord {
  id: string;
  name: string;
  entries: PathEntry[];
  choiceIds: string[];
  created: number;
}
export interface RouteSnapshot {
  trail: PathEntry[];
  cursor: number;
  records: RouteRecord[];
}
export interface Bookmark {
  id: string;
  label: string;
  location: ReadingLocation;
  trail?: PathEntry[];
  cursor?: number;
  created: number;
}
export type ReadingMode = "page" | "panel";
