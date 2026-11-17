import type {
  ComicDocument,
  PathEntry,
  ReadingLocation,
  RouteRecord,
} from "../../../shared/document";
import { estimateRemaining } from "../../../shared/graph";
export function readingMetrics(
  doc: ComicDocument,
  at: ReadingLocation,
  trail: PathEntry[],
  cursor: number,
  records: RouteRecord[],
) {
  const pages = doc.chapters.flatMap((c) => c.pages),
    chapter = doc.chapters.find((c) => c.id === at.chapterId);
  const remaining = estimateRemaining(doc, at.panelId),
    done = cursor + 1,
    total = done + remaining;
  const explored = new Set<string>();
  for (const e of trail) explored.add(e.panelId);
  for (const r of records) for (const e of r.entries) explored.add(e.panelId);
  return {
    percent: Math.round((done / Math.max(1, total)) * 100),
    step: done,
    remaining,
    routes: records.length + 1,
    explored: explored.size,
    pageIndex: (chapter?.pages.findIndex((p) => p.id === at.pageId) ?? 0) + 1,
    pageCount: chapter?.pages.length ?? 0,
    total: pages.length,
  };
}
