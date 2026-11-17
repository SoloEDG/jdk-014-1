import { ref, computed, type Ref } from "vue";
import type {
  ChoiceCondition,
  ComicDocument,
} from "../../../shared/document";
import { makeId } from "../../../shared/commands";
import {
  findPanel,
  firstPanelId,
  inboundRefs,
  panelLabel,
  validateRoutes,
} from "../../../shared/graph";
export interface RemovedInfo {
  kind: "panel" | "chapter";
  label: string;
  affected: number;
}
export function useRouteEditor(doc: Ref<ComicDocument>, changed: () => void) {
  const open = ref(false),
    draft = ref<ComicDocument | null>(null),
    selected = ref(""),
    dirty = ref(false),
    error = ref(""),
    notice = ref(""),
    lastRemoved = ref<RemovedInfo | null>(null);
  const validation = computed(() =>
    draft.value
      ? validateRoutes(draft.value)
      : { errors: [], warnings: [] as string[] },
  );
  const issues = computed(() => validation.value.errors);
  const warnings = computed(() => validation.value.warnings);
  function begin() {
    draft.value = JSON.parse(JSON.stringify(doc.value)) as ComicDocument;
    selected.value = firstPanelId(draft.value);
    dirty.value = false;
    error.value = "";
    lastRemoved.value = null;
    open.value = true;
  }
  function close() {
    open.value = false;
    draft.value = null;
    error.value = "";
  }
  function select(panelId: string) {
    selected.value = panelId;
    error.value = "";
  }
  function touch() {
    dirty.value = true;
    notice.value = "";
  }
  function addChoice(panelId: string) {
    const ref = draft.value && findPanel(draft.value, panelId);
    if (!ref) return;
    ref.panel.choices = [
      ...(ref.panel.choices ?? []),
      { id: makeId("choice"), label: "", targetPanelId: panelId },
    ];
    touch();
  }
  function updateChoice(
    panelId: string,
    choiceId: string,
    patch: {
      label?: string;
      targetPanelId?: string;
      condition?: ChoiceCondition | null;
    },
  ) {
    const ref = draft.value && findPanel(draft.value, panelId);
    const choice = ref?.panel.choices?.find((c) => c.id === choiceId);
    if (!choice) return;
    if (patch.label !== undefined) choice.label = patch.label;
    if (patch.targetPanelId !== undefined)
      choice.targetPanelId = patch.targetPanelId;
    if (patch.condition !== undefined) {
      if (patch.condition === null) delete choice.condition;
      else choice.condition = { ...patch.condition };
    }
    touch();
  }
  function removeChoice(panelId: string, choiceId: string) {
    const ref = draft.value && findPanel(draft.value, panelId);
    if (!ref?.panel.choices) return;
    ref.panel.choices = ref.panel.choices.filter((c) => c.id !== choiceId);
    touch();
  }
  function setContinue(panelId: string, targetId: string) {
    const ref = draft.value && findPanel(draft.value, panelId);
    if (!ref) return;
    if (targetId) ref.panel.continueTo = targetId;
    else delete ref.panel.continueTo;
    touch();
  }
  function removePanel(panelId: string): boolean {
    const d = draft.value;
    error.value = "";
    if (!d) return false;
    const ref = findPanel(d, panelId);
    if (!ref) {
      error.value = "未找到该分镜";
      return false;
    }
    if (
      d.chapters.length === 1 &&
      ref.chapter.pages.length === 1 &&
      ref.page.panels.length === 1
    ) {
      error.value = "至少保留一个分镜";
      return false;
    }
    const refs = inboundRefs(d, panelId);
    lastRemoved.value = {
      kind: "panel",
      label: panelLabel(d, panelId),
      affected:
        refs.choices.length + refs.continues.length + refs.conditions.length,
    };
    ref.page.panels = ref.page.panels.filter((p) => p.id !== panelId);
    if (!ref.page.panels.length)
      ref.chapter.pages = ref.chapter.pages.filter((p) => p.id !== ref.page.id);
    if (!ref.chapter.pages.length)
      d.chapters = d.chapters.filter((c) => c.id !== ref.chapter.id);
    if (selected.value === panelId) selected.value = firstPanelId(d);
    touch();
    return true;
  }
  function stageChapterDelete(chapterId: string): boolean {
    if (!open.value) begin();
    const d = draft.value;
    if (!d || d.chapters.length < 2) return false;
    const chapter = d.chapters.find((c) => c.id === chapterId);
    if (!chapter) return false;
    const panelIds = chapter.pages.flatMap((p) => p.panels.map((x) => x.id));
    let affected = 0;
    for (const id of panelIds) {
      const refs = inboundRefs(d, id);
      affected +=
        refs.choices.length + refs.continues.length + refs.conditions.length;
    }
    d.chapters = d.chapters.filter((c) => c.id !== chapterId);
    lastRemoved.value = {
      kind: "chapter",
      label: chapter.title,
      affected,
    };
    if (selected.value && !findPanel(d, selected.value))
      selected.value = firstPanelId(d);
    touch();
    return true;
  }
  function publish(): boolean {
    const d = draft.value;
    if (!d || issues.value.length) {
      error.value = "请先修订所有受影响的选择与汇合，再发布";
      return false;
    }
    doc.value = d;
    notice.value = "已发布可读版本";
    close();
    changed();
    return true;
  }
  function discard() {
    close();
    notice.value = "已放弃未发布的修改";
  }
  return {
    open,
    draft,
    selected,
    dirty,
    error,
    notice,
    lastRemoved,
    issues,
    warnings,
    begin,
    close,
    select,
    addChoice,
    updateChoice,
    removeChoice,
    setContinue,
    removePanel,
    stageChapterDelete,
    publish,
    discard,
  };
}
