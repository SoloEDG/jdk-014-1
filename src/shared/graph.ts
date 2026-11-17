import type {
  Choice,
  ComicDocument,
  ComicPage,
  Chapter,
  Panel,
  PathEntry,
} from "./document";
export interface PanelRef {
  chapter: Chapter;
  page: ComicPage;
  panel: Panel;
}
export interface RouteFlags {
  choices: Set<string>;
  panels: Set<string>;
}
export function allPanels(doc: ComicDocument): PanelRef[] {
  const out: PanelRef[] = [];
  for (const chapter of doc.chapters)
    for (const page of chapter.pages)
      for (const panel of page.panels) out.push({ chapter, page, panel });
  return out;
}
export function findPanel(doc: ComicDocument, panelId: string): PanelRef | null {
  for (const chapter of doc.chapters)
    for (const page of chapter.pages) {
      const panel = page.panels.find((p) => p.id === panelId);
      if (panel) return { chapter, page, panel };
    }
  return null;
}
export function firstPanelId(doc: ComicDocument): string {
  return doc.chapters[0]?.pages[0]?.panels[0]?.id ?? "";
}
export function panelLabel(doc: ComicDocument, panelId: string): string {
  const ref = findPanel(doc, panelId);
  if (!ref) return "已删除的分镜";
  const pageIndex = ref.chapter.pages.findIndex((p) => p.id === ref.page.id) + 1;
  const panelIndex =
    ref.page.panels.findIndex((p) => p.id === ref.panel.id) + 1;
  const text = ref.panel.dialogue.trim();
  return `${ref.chapter.title} · 第${pageIndex}页 · 镜头${panelIndex}${
    text ? ` · ${text.slice(0, 12)}${text.length > 12 ? "…" : ""}` : ""
  }`;
}
export function findChoice(
  doc: ComicDocument,
  choiceId: string,
): { panel: Panel; choice: Choice } | null {
  for (const { panel } of allPanels(doc)) {
    const choice = panel.choices?.find((c) => c.id === choiceId);
    if (choice) return { panel, choice };
  }
  return null;
}
export function allChoices(doc: ComicDocument): { panel: Panel; choice: Choice }[] {
  const out: { panel: Panel; choice: Choice }[] = [];
  for (const { panel } of allPanels(doc))
    for (const choice of panel.choices ?? []) out.push({ panel, choice });
  return out;
}
export function conditionMet(
  condition: Choice["condition"],
  flags: RouteFlags,
): boolean {
  if (!condition) return true;
  return condition.kind === "choice"
    ? flags.choices.has(condition.id)
    : flags.panels.has(condition.id);
}
export function visibleChoices(panel: Panel, flags: RouteFlags): Choice[] {
  return (panel.choices ?? []).filter((c) => conditionMet(c.condition, flags));
}
export function linearNext(doc: ComicDocument, panelId: string): string | null {
  const refs = allPanels(doc);
  const i = refs.findIndex((r) => r.panel.id === panelId);
  return i >= 0 && i + 1 < refs.length ? refs[i + 1]!.panel.id : null;
}
export type StoryStep =
  | { kind: "go"; panelId: string }
  | { kind: "choose" }
  | { kind: "end" };
export function storyNext(
  doc: ComicDocument,
  panelId: string,
  flags: RouteFlags,
): StoryStep {
  const ref = findPanel(doc, panelId);
  if (!ref) return { kind: "end" };
  const { panel } = ref;
  if (panel.continueTo) {
    if (panel.continueTo === panel.id || !findPanel(doc, panel.continueTo))
      return { kind: "end" };
    return { kind: "go", panelId: panel.continueTo };
  }
  if (visibleChoices(panel, flags).length) return { kind: "choose" };
  const next = linearNext(doc, panelId);
  return next ? { kind: "go", panelId: next } : { kind: "end" };
}
export function estimateRemaining(
  doc: ComicDocument,
  panelId: string,
  cap = 400,
): number {
  const seen = new Set([panelId]);
  let current = panelId,
    steps = 0;
  while (steps < cap) {
    const ref = findPanel(doc, current);
    if (!ref) break;
    const { panel } = ref;
    let next: string | null = null;
    if (panel.continueTo && panel.continueTo !== panel.id)
      next = panel.continueTo;
    else if (panel.choices?.length) next = panel.choices[0]!.targetPanelId;
    else next = linearNext(doc, current);
    if (!next || seen.has(next) || !findPanel(doc, next)) break;
    seen.add(next);
    current = next;
    steps++;
  }
  return steps;
}
export interface InboundRefs {
  choices: { panelId: string; choice: Choice }[];
  continues: string[];
  conditions: { panelId: string; choice: Choice }[];
}
export function inboundRefs(doc: ComicDocument, panelId: string): InboundRefs {
  const refs: InboundRefs = { choices: [], continues: [], conditions: [] };
  for (const { panel } of allPanels(doc)) {
    if (panel.continueTo === panelId) refs.continues.push(panel.id);
    for (const choice of panel.choices ?? []) {
      if (choice.targetPanelId === panelId)
        refs.choices.push({ panelId: panel.id, choice });
      if (choice.condition?.kind === "panel" && choice.condition.id === panelId)
        refs.conditions.push({ panelId: panel.id, choice });
    }
  }
  return refs;
}
export function mergeTargetIds(doc: ComicDocument): Set<string> {
  const count = new Map<string, number>();
  const bump = (id: string) => count.set(id, (count.get(id) ?? 0) + 1);
  for (const { panel } of allPanels(doc)) {
    if (panel.continueTo) bump(panel.continueTo);
    for (const choice of panel.choices ?? []) bump(choice.targetPanelId);
  }
  const merged = new Set<string>();
  for (const [id, n] of count) if (n >= 2) merged.add(id);
  return merged;
}
export interface RouteIssue {
  kind: "choice-target" | "continue-target" | "condition-ref" | "choice-label";
  panelId: string;
  choiceId?: string;
  message: string;
}
export function validateRoutes(doc: ComicDocument): {
  errors: RouteIssue[];
  warnings: string[];
} {
  const errors: RouteIssue[] = [];
  const panelIds = new Set(allPanels(doc).map((r) => r.panel.id));
  const choiceIds = new Set(allChoices(doc).map((c) => c.choice.id));
  for (const { panel } of allPanels(doc)) {
    for (const choice of panel.choices ?? []) {
      if (!choice.label.trim())
        errors.push({
          kind: "choice-label",
          panelId: panel.id,
          choiceId: choice.id,
          message: `「${panelLabel(doc, panel.id)}」的选项缺少名称`,
        });
      if (!panelIds.has(choice.targetPanelId))
        errors.push({
          kind: "choice-target",
          panelId: panel.id,
          choiceId: choice.id,
          message: `选项「${choice.label || "未命名"}」（${panelLabel(
            doc,
            panel.id,
          )}）指向的分镜已被删除`,
        });
      if (choice.condition) {
        const ok =
          choice.condition.kind === "choice"
            ? choiceIds.has(choice.condition.id)
            : panelIds.has(choice.condition.id);
        if (!ok)
          errors.push({
            kind: "condition-ref",
            panelId: panel.id,
            choiceId: choice.id,
            message: `选项「${choice.label || "未命名"}」（${panelLabel(
              doc,
              panel.id,
            )}）的可见条件引用了已删除的${
              choice.condition.kind === "choice" ? "选项" : "分镜"
            }`,
          });
      }
    }
    if (panel.continueTo && !panelIds.has(panel.continueTo))
      errors.push({
        kind: "continue-target",
        panelId: panel.id,
        message: `「${panelLabel(doc, panel.id)}」的汇合目标已被删除`,
      });
  }
  const warnings: string[] = [];
  for (const { panel } of allPanels(doc)) {
    const choices = panel.choices ?? [];
    if (
      choices.length > 0 &&
      !panel.continueTo &&
      choices.every((c) => c.condition)
    )
      warnings.push(
        `「${panelLabel(doc, panel.id)}」的选项全部带有条件且未设默认去向，条件都不满足时读者将无路可走`,
      );
  }
  return { errors, warnings };
}
export function routeName(doc: ComicDocument, choiceIds: string[]): string {
  const names = choiceIds
    .map((id) => findChoice(doc, id)?.choice.label.trim())
    .filter((n): n is string => !!n);
  return names.length ? names.join(" → ") : "主线";
}
export function flagsFrom(
  trail: PathEntry[],
  records: { entries: PathEntry[] }[],
): RouteFlags {
  const choices = new Set<string>(),
    panels = new Set<string>();
  const walk = (entries: PathEntry[]) => {
    for (const e of entries) {
      panels.add(e.panelId);
      if (e.viaChoiceId) choices.add(e.viaChoiceId);
    }
  };
  walk(trail);
  for (const r of records) walk(r.entries);
  return { choices, panels };
}
