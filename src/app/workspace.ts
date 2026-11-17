import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { demoDocument, useLibrary } from "../features/library";
import { useChapters } from "../features/chapters";
import { useReader } from "../features/reader";
import { useAudio } from "../features/audio";
import { useProgress, readSession } from "../features/progress";
import { useRouteEditor } from "../features/routes";
import { findPanel, inboundRefs } from "../shared/graph";
export function useWorkspace() {
  const saved = readSession(),
    doc = ref(saved?.document ?? demoDocument()),
    reader = useReader(doc, saved?.route);
  function reconcileAll() {
    reader.reconcile();
    progress.reconcile();
  }
  const progress = useProgress(
      doc,
      reader.location,
      reader.trail,
      reader.cursor,
      reader.records,
      reader.snapshot,
      saved,
    ),
    library = useLibrary(doc, (id) => {
      reader.dispatch({ type: "chapter", id });
      reconcileAll();
    }),
    chapters = useChapters(doc, reconcileAll),
    routes = useRouteEditor(doc, reconcileAll),
    panel = computed(() => reader.current.value.panel),
    audio = useAudio(panel);
  function requestChapterRemove(id: string) {
    const chapter = doc.value.chapters.find((c) => c.id === id);
    if (!chapter) return;
    const affected = chapter.pages.some((p) =>
      p.panels.some((panel) => {
        const refs = inboundRefs(doc.value, panel.id);
        const outside = (panelId: string) =>
          findPanel(doc.value, panelId)?.chapter.id !== id;
        return (
          refs.choices.some((c) => outside(c.panelId)) ||
          refs.continues.some(outside) ||
          refs.conditions.some((c) => outside(c.panelId))
        );
      }),
    );
    if (!affected) {
      chapters.remove(id);
      return;
    }
    if (!routes.stageChapterDelete(id))
      chapters.error.value = "至少保留一个章节";
  }
  function keydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.closest("input,textarea,button,select"))
      return;
    if (routes.open.value) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      reader.dispatch({ type: "move", delta: e.key === "ArrowRight" ? 1 : -1 });
    }
    if (e.key === " ") {
      e.preventDefault();
      audio.toggle();
    }
    if (e.key === "Escape") reader.setMode("page");
  }
  onMounted(() => window.addEventListener("keydown", keydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", keydown));
  return { doc, reader, progress, library, chapters, routes, requestChapterRemove, audio };
}
