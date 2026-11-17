import { ref, watch, computed, type Ref } from "vue";
import type {
  Bookmark,
  ComicDocument,
  PathEntry,
  ReadingLocation,
  RouteRecord,
  RouteSnapshot,
} from "../../../shared/document";
import { makeId } from "../../../shared/commands";
import { routeName } from "../../../shared/graph";
import { writeSession, type SavedSession } from "../lib/storage";
import { readingMetrics } from "../lib/metrics";
export function useProgress(
  doc: Ref<ComicDocument>,
  location: Ref<ReadingLocation>,
  trail: Ref<PathEntry[]>,
  cursor: Ref<number>,
  records: Ref<RouteRecord[]>,
  snapshot: () => RouteSnapshot,
  saved: SavedSession | null,
) {
  const bookmarks = ref<Bookmark[]>(saved?.bookmarks ?? []),
    status = ref("本地自动保存已开启"),
    metrics = computed(() =>
      readingMetrics(
        doc.value,
        location.value,
        trail.value,
        cursor.value,
        records.value,
      ),
    );
  function save() {
    status.value = writeSession({
      document: doc.value,
      location: location.value,
      bookmarks: bookmarks.value,
      route: snapshot(),
    });
  }
  watch([doc, location, bookmarks, trail, cursor, records], save, {
    deep: true,
  });
  function add() {
    const taken = trail.value
      .map((e) => e.viaChoiceId)
      .filter((id): id is string => !!id);
    const route = routeName(doc.value, taken);
    const same = bookmarks.value.find(
      (b) =>
        b.location.panelId === location.value.panelId &&
        (b.trail ?? []).map((e) => e.viaChoiceId ?? "").join() ===
          trail.value.map((e) => e.viaChoiceId ?? "").join(),
    );
    if (same) {
      status.value = "此处分镜在此路线上已收藏";
      return;
    }
    const c = doc.value.chapters.find((c) => c.id === location.value.chapterId);
    bookmarks.value.push({
      id: makeId("bookmark"),
      label: `${c?.title ?? "章节"} · ${route} · 第 ${metrics.value.pageIndex} 页`,
      location: { ...location.value },
      trail: trail.value.map((e) => ({ ...e })),
      cursor: cursor.value,
      created: Date.now(),
    });
  }
  function remove(id: string) {
    bookmarks.value = bookmarks.value.filter((b) => b.id !== id);
  }
  function reconcile() {
    const ids = new Set(
      doc.value.chapters.flatMap((c) => c.pages.map((p) => p.id)),
    );
    bookmarks.value = bookmarks.value.filter((b) => ids.has(b.location.pageId));
  }
  return { bookmarks, status, metrics, add, remove, reconcile, save };
}
