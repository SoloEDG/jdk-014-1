import { ref, computed, type Ref } from "vue";
import type {
  ComicDocument,
  PathEntry,
  ReadingLocation,
  ReadingMode,
  RouteRecord,
  RouteSnapshot,
} from "../../../shared/document";
import type { ReaderCommand } from "../../../shared/commands";
import { makeId } from "../../../shared/commands";
import { firstLocation, resolveLocation } from "../../../shared/lookup";
import {
  findPanel,
  flagsFrom,
  routeName,
  storyNext,
  visibleChoices,
} from "../../../shared/graph";
import { normalize, advance } from "../lib/navigation";
import { constrainPan } from "../lib/viewport";
const MAX_RECORDS = 12;
function entryOf(at: ReadingLocation, viaChoiceId?: string): PathEntry {
  return {
    chapterId: at.chapterId,
    pageId: at.pageId,
    panelId: at.panelId,
    viaChoiceId,
  };
}
export function useReader(doc: Ref<ComicDocument>, saved?: RouteSnapshot) {
  const location = ref<ReadingLocation>(firstLocation(doc.value)),
    mode = ref<ReadingMode>("page");
  const trail = ref<PathEntry[]>([entryOf(location.value)]),
    cursor = ref(0),
    records = ref<RouteRecord[]>([]);
  if (saved?.trail?.length) {
    trail.value = saved.trail.map((e) => ({ ...e }));
    cursor.value = Math.max(0, Math.min(saved.cursor ?? 0, trail.value.length - 1));
    records.value = (saved.records ?? []).map((r) => ({
      ...r,
      entries: r.entries.map((e) => ({ ...e })),
    }));
    const at = trail.value[cursor.value]!;
    location.value = normalize(doc.value, { ...at, zoom: 1, x: 0, y: 0 });
  }
  const current = computed(() => resolveLocation(doc.value, location.value));
  const flags = computed(() => flagsFrom(trail.value, records.value));
  const choices = computed(() =>
    current.value.panel
      ? visibleChoices(current.value.panel, flags.value)
      : [],
  );
  const nextStep = computed(() =>
    storyNext(doc.value, location.value.panelId, flags.value),
  );
  function syncFromCursor() {
    const at = trail.value[cursor.value];
    if (at)
      location.value = normalize(doc.value, { ...at, zoom: 1, x: 0, y: 0 });
  }
  function archiveTrail(entries: PathEntry[]) {
    const choiceIds = entries
      .map((e) => e.viaChoiceId)
      .filter((id): id is string => !!id);
    if (!choiceIds.length) return;
    const last = entries[entries.length - 1]?.panelId;
    const dupe = records.value.some(
      (r) =>
        r.choiceIds.join() === choiceIds.join() &&
        r.entries[r.entries.length - 1]?.panelId === last,
    );
    if (dupe) return;
    records.value = [
      ...records.value.slice(-(MAX_RECORDS - 1)),
      {
        id: makeId("route"),
        name: routeName(doc.value, choiceIds),
        entries: entries.map((e) => ({ ...e })),
        choiceIds,
        created: Date.now(),
      },
    ];
  }
  function commit(at: ReadingLocation, viaChoiceId?: string) {
    const next = normalize(doc.value, at);
    const top = trail.value[cursor.value];
    if (top && top.panelId === next.panelId) {
      location.value = next;
      return;
    }
    const redo = trail.value[cursor.value + 1];
    if (redo && redo.panelId === next.panelId && redo.viaChoiceId === viaChoiceId) {
      cursor.value++;
      location.value = next;
      return;
    }
    if (cursor.value < trail.value.length - 1) archiveTrail(trail.value);
    trail.value = [
      ...trail.value.slice(0, cursor.value + 1),
      entryOf(next, viaChoiceId),
    ];
    cursor.value++;
    location.value = next;
  }
  function move(delta: number) {
    if (delta < 0) {
      if (cursor.value > 0) {
        cursor.value--;
        syncFromCursor();
      }
      return;
    }
    if (cursor.value < trail.value.length - 1) {
      cursor.value++;
      syncFromCursor();
      return;
    }
    if (mode.value === "page") {
      commit(advance(doc.value, location.value, 1, "page"));
      return;
    }
    const step = nextStep.value;
    if (step.kind === "go") {
      const ref = findPanel(doc.value, step.panelId);
      if (ref)
        commit({
          chapterId: ref.chapter.id,
          pageId: ref.page.id,
          panelId: ref.panel.id,
          zoom: 1,
          x: 0,
          y: 0,
        });
    }
  }
  function choose(id: string) {
    const choice = choices.value.find((c) => c.id === id);
    const ref = choice && findPanel(doc.value, choice.targetPanelId);
    if (!choice || !ref) return;
    mode.value = "panel";
    commit(
      {
        chapterId: ref.chapter.id,
        pageId: ref.page.id,
        panelId: ref.panel.id,
        zoom: 1,
        x: 0,
        y: 0,
      },
      choice.id,
    );
  }
  function switchRoute(id: string) {
    const record = records.value.find((r) => r.id === id);
    if (!record) return;
    archiveTrail(trail.value);
    records.value = records.value.filter((r) => r.id !== id);
    trail.value = record.entries.map((e) => ({ ...e }));
    cursor.value = trail.value.length - 1;
    syncFromCursor();
  }
  function dropRoute(id: string) {
    records.value = records.value.filter((r) => r.id !== id);
  }
  function dispatch(command: ReaderCommand) {
    if (command.type === "move") move(command.delta);
    if (command.type === "choose") choose(command.id);
    if (command.type === "switchRoute") switchRoute(command.id);
    if (command.type === "dropRoute") dropRoute(command.id);
    if (command.type === "cursor") {
      const i = Math.max(0, Math.min(command.index, trail.value.length - 1));
      if (i !== cursor.value) {
        cursor.value = i;
        syncFromCursor();
      }
    }
    if (command.type === "chapter") {
      const c = doc.value.chapters.find((c) => c.id === command.id);
      commit({
        chapterId: c?.id ?? "",
        pageId: c?.pages[0]?.id ?? "",
        panelId: c?.pages[0]?.panels[0]?.id ?? "",
        zoom: 1,
        x: 0,
        y: 0,
      });
    }
    if (command.type === "panel") {
      commit({ ...location.value, panelId: command.id, zoom: 1, x: 0, y: 0 });
    }
    if (command.type === "restore") {
      if (command.trail?.length) {
        const valid = command.trail.filter((e) =>
          findPanel(doc.value, e.panelId),
        );
        if (valid.length) {
          trail.value = valid.map((e) => ({ ...e }));
          cursor.value = Math.max(
            0,
            Math.min(
              command.cursor ?? trail.value.length - 1,
              trail.value.length - 1,
            ),
          );
          syncFromCursor();
        } else commit(command.location);
      } else commit(command.location);
    }
  }
  function reconcile() {
    const keep = (e: PathEntry) => !!findPanel(doc.value, e.panelId);
    const currentPanel = trail.value[cursor.value]?.panelId;
    trail.value = trail.value.filter(keep);
    if (!trail.value.length) {
      location.value = firstLocation(doc.value);
      trail.value = [entryOf(location.value)];
      cursor.value = 0;
    } else {
      const i = trail.value.findIndex((e) => e.panelId === currentPanel);
      cursor.value = Math.max(
        0,
        Math.min(i >= 0 ? i : cursor.value, trail.value.length - 1),
      );
      syncFromCursor();
    }
    records.value = records.value
      .map((r) => ({ ...r, entries: r.entries.filter(keep) }))
      .filter((r) => r.entries.length);
    location.value = normalize(doc.value, location.value);
  }
  function snapshot(): RouteSnapshot {
    return {
      trail: trail.value.map((e) => ({ ...e })),
      cursor: cursor.value,
      records: records.value.map((r) => ({
        ...r,
        entries: r.entries.map((e) => ({ ...e })),
      })),
    };
  }
  function zoom(delta: number) {
    location.value.zoom = Math.max(
      1,
      Math.min(3, Math.round((location.value.zoom + delta) * 10) / 10),
    );
    Object.assign(
      location.value,
      constrainPan(location.value.x, location.value.y, location.value.zoom),
    );
  }
  function pan(x: number, y: number) {
    Object.assign(location.value, constrainPan(x, y, location.value.zoom));
  }
  function setMode(value: ReadingMode) {
    mode.value = value;
  }
  return {
    location,
    mode,
    current,
    trail,
    cursor,
    records,
    flags,
    choices,
    nextStep,
    dispatch,
    reconcile,
    snapshot,
    zoom,
    pan,
    setMode,
  };
}
