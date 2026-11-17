<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  X,
  GitBranch,
  GitMerge,
  Trash2,
  Plus,
  AlertTriangle,
  CircleAlert,
  Crosshair,
  CloudUpload,
} from "lucide-vue-next";
import type {
  ChoiceCondition,
  ComicDocument,
} from "../../../shared/document";
import type { RouteIssue } from "../../../shared/graph";
import type { RemovedInfo } from "../model/editor";
import {
  allChoices,
  allPanels,
  findPanel,
  mergeTargetIds,
  panelLabel,
} from "../../../shared/graph";
const props = defineProps<{
  open: boolean;
  draft: ComicDocument | null;
  selected: string;
  dirty: boolean;
  error: string;
  lastRemoved: RemovedInfo | null;
  issues: RouteIssue[];
  warnings: string[];
}>();
const emit = defineEmits<{
  select: [panelId: string];
  addChoice: [panelId: string];
  updateChoice: [
    panelId: string,
    choiceId: string,
    patch: {
      label?: string;
      targetPanelId?: string;
      condition?: ChoiceCondition | null;
    },
  ];
  removeChoice: [panelId: string, choiceId: string];
  setContinue: [panelId: string, targetId: string];
  removePanel: [panelId: string];
  publish: [];
  discard: [];
  close: [];
}>();
const confirmingDelete = ref(false);
watch(
  () => props.selected,
  () => (confirmingDelete.value = false),
);
const groups = computed(() => {
  const d = props.draft;
  if (!d) return [];
  return d.chapters.map((chapter) => ({
    chapter,
    pages: chapter.pages.map((page) => ({
      page,
      panels: page.panels.map((panel) => ({ panel })),
    })),
  }));
});
const panelOptions = computed(
  () => props.draft && allPanels(props.draft).map((r) => r.panel.id),
);
const choiceOptions = computed(() =>
  props.draft
    ? allChoices(props.draft).map(({ panel, choice }) => ({
        id: choice.id,
        label: `「${choice.label || "未命名"}」 @ ${panelLabel(props.draft!, panel.id)}`,
      }))
    : [],
);
const selectedRef = computed(() =>
  props.draft && props.selected ? findPanel(props.draft, props.selected) : null,
);
const merges = computed(() =>
  props.draft ? mergeTargetIds(props.draft) : new Set<string>(),
);
function label(panelId: string) {
  return props.draft ? panelLabel(props.draft, panelId) : "";
}
function conditionKind(choice: { condition?: ChoiceCondition }) {
  return choice.condition?.kind ?? "";
}
function changeConditionKind(
  panelId: string,
  choiceId: string,
  kind: string,
  current?: ChoiceCondition,
) {
  if (!kind) {
    emit("updateChoice", panelId, choiceId, { condition: null });
    return;
  }
  const fallback =
    kind === "choice"
      ? (choiceOptions.value.find((o) => o.id !== choiceId)?.id ?? "")
      : (panelOptions.value?.[0] ?? "");
  emit("updateChoice", panelId, choiceId, {
    condition: {
      kind: kind as ChoiceCondition["kind"],
      id:
        current && current.kind === kind && current.id ? current.id : fallback,
    },
  });
}
function locate(issue: RouteIssue) {
  emit("select", issue.panelId);
}
function confirmRemove() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true;
    return;
  }
  confirmingDelete.value = false;
  emit("removePanel", props.selected);
}
</script>
<template>
  <div v-if="open && draft" class="editor-overlay" @click.self="emit('close')">
    <div class="route-editor" role="dialog" aria-label="分支路线编辑器">
      <header class="editor-header">
        <div>
          <h2><GitBranch :size="16" /> 分支路线编辑</h2>
          <small>{{ dirty ? "草稿未发布 · 读者仍看到上一版本" : "草稿与已发布版本一致" }}</small>
        </div>
        <button aria-label="关闭编辑器" @click="emit('close')">
          <X :size="17" />
        </button>
      </header>
      <div v-if="lastRemoved" class="impact-banner">
        <AlertTriangle :size="14" />
        <span>
          已移除{{ lastRemoved.kind === "panel" ? "分镜" : "章节" }}「{{
            lastRemoved.label
          }}」：{{ lastRemoved.affected }} 处选择 / 汇合引用待修订，修订完成后才能发布。
        </span>
      </div>
      <div class="editor-body">
        <aside class="editor-picker">
          <div v-for="g in groups" :key="g.chapter.id" class="picker-chapter">
            <strong>{{ g.chapter.title }}</strong>
            <div v-for="pg in g.pages" :key="pg.page.id" class="picker-page">
              <small>{{ pg.page.title }}</small>
              <button
                v-for="(p, i) in pg.panels"
                :key="p.panel.id"
                :class="{ selected: p.panel.id === selected }"
                @click="emit('select', p.panel.id)"
              >
                <span class="picker-label"
                  >镜头{{ i + 1 }} ·
                  {{ p.panel.dialogue.slice(0, 10) || "（无对白）" }}</span
                >
                <span class="picker-badges">
                  <GitBranch
                    v-if="p.panel.choices?.length"
                    :size="11"
                    aria-label="含分支"
                  />
                  <GitMerge
                    v-if="merges.has(p.panel.id)"
                    :size="11"
                    aria-label="汇合点"
                  />
                  <i v-if="p.panel.continueTo" class="continue-dot" title="已设汇合去向"></i>
                </span>
              </button>
            </div>
          </div>
        </aside>
        <section v-if="selectedRef" class="editor-main">
          <p class="editor-where">{{ label(selected) }}</p>
          <p class="editor-dialogue">“{{ selectedRef.panel.dialogue }}”</p>
          <div class="editor-section">
            <div class="editor-subheading">
              <span><GitBranch :size="13" /> 调查选项</span>
              <button @click="emit('addChoice', selected)">
                <Plus :size="13" /> 添加选项
              </button>
            </div>
            <p v-if="!selectedRef.panel.choices?.length" class="muted-note">
              没有选项时，读者将按线性顺序或汇合去向继续。
            </p>
            <div
              v-for="choice in selectedRef.panel.choices"
              :key="choice.id"
              class="choice-editor"
            >
              <div class="choice-row">
                <input
                  aria-label="选项名称"
                  placeholder="选项名称，如：调查唱片店后巷"
                  :value="choice.label"
                  @input="
                    emit('updateChoice', selected, choice.id, {
                      label: ($event.target as HTMLInputElement).value,
                    })
                  "
                />
                <button
                  title="删除此选项"
                  @click="emit('removeChoice', selected, choice.id)"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
              <label class="editor-field">
                <small>跳转目标</small>
                <select
                  :value="choice.targetPanelId"
                  @change="
                    emit('updateChoice', selected, choice.id, {
                      targetPanelId: ($event.target as HTMLSelectElement).value,
                    })
                  "
                >
                  <optgroup
                    v-for="g in groups"
                    :key="g.chapter.id"
                    :label="g.chapter.title"
                  >
                    <template v-for="pg in g.pages" :key="pg.page.id">
                      <option
                        v-for="p in pg.panels"
                        :key="p.panel.id"
                        :value="p.panel.id"
                      >
                        {{ label(p.panel.id) }}
                      </option>
                    </template>
                  </optgroup>
                </select>
              </label>
              <div class="condition-row">
                <label class="editor-field">
                  <small>可见条件</small>
                  <select
                    :value="conditionKind(choice)"
                    @change="
                      changeConditionKind(
                        selected,
                        choice.id,
                        ($event.target as HTMLSelectElement).value,
                        choice.condition,
                      )
                    "
                  >
                    <option value="">无条件 · 总是可见</option>
                    <option value="choice" :disabled="choiceOptions.length < 2">
                      已做出某选择
                    </option>
                    <option value="panel">到达过某分镜</option>
                  </select>
                </label>
                <label v-if="choice.condition" class="editor-field">
                  <small>{{
                    choice.condition.kind === "choice" ? "选择" : "分镜"
                  }}</small>
                  <select
                    :value="choice.condition.id"
                    @change="
                      emit('updateChoice', selected, choice.id, {
                        condition: {
                          kind: choice.condition!.kind,
                          id: ($event.target as HTMLSelectElement).value,
                        },
                      })
                    "
                  >
                    <template v-if="choice.condition.kind === 'choice'">
                      <option
                        v-for="o in choiceOptions"
                        :key="o.id"
                        :value="o.id"
                        :disabled="o.id === choice.id"
                      >
                        {{ o.label }}
                      </option>
                    </template>
                    <template v-else>
                      <option
                        v-for="id in panelOptions"
                        :key="id"
                        :value="id"
                      >
                        {{ label(id) }}
                      </option>
                    </template>
                  </select>
                </label>
              </div>
            </div>
          </div>
          <div class="editor-section">
            <div class="editor-subheading">
              <span><GitMerge :size="13" /> 汇合去向</span>
            </div>
            <label class="editor-field">
              <small>读完本格后前往</small>
              <select
                :value="selectedRef.panel.continueTo ?? ''"
                @change="
                  emit(
                    'setContinue',
                    selected,
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option value="">线性继续（默认）</option>
                <optgroup
                  v-for="g in groups"
                  :key="g.chapter.id"
                  :label="g.chapter.title"
                >
                  <template v-for="pg in g.pages" :key="pg.page.id">
                    <option
                      v-for="p in pg.panels"
                      :key="p.panel.id"
                      :value="p.panel.id"
                      :disabled="p.panel.id === selected"
                    >
                      {{ label(p.panel.id) }}
                    </option>
                  </template>
                </optgroup>
              </select>
            </label>
            <p class="muted-note">
              用于支路末尾汇入主线；若本格带有选项，此项为默认去向，选项成为可选支路。
            </p>
          </div>
          <div class="editor-section danger-zone">
            <button
              class="danger-button"
              :class="{ confirming: confirmingDelete }"
              @click="confirmRemove"
            >
              <Trash2 :size="13" />
              {{ confirmingDelete ? "再次点击确认删除" : "删除本分镜" }}
            </button>
            <p class="muted-note">
              删除前会列出所有指向本格的选择与汇合，需逐一修订后才能发布。
            </p>
          </div>
          <p v-if="error" role="alert" class="editor-error">{{ error }}</p>
        </section>
      </div>
      <footer class="editor-footer">
        <div class="issue-list">
          <div v-for="(issue, i) in issues" :key="i" class="issue-row error">
            <CircleAlert :size="13" />
            <span>{{ issue.message }}</span>
            <button @click="locate(issue)"><Crosshair :size="12" /> 定位</button>
          </div>
          <div v-for="(warning, i) in warnings" :key="`w-${i}`" class="issue-row warning">
            <AlertTriangle :size="13" />
            <span>{{ warning }}</span>
          </div>
        </div>
        <div class="editor-actions">
          <span v-if="issues.length" class="issue-count"
            >{{ issues.length }} 处待修订</span
          >
          <button @click="emit('discard')">放弃修改</button>
          <button
            class="publish-button"
            :disabled="!dirty || issues.length > 0"
            :title="issues.length ? '请先修订受影响的选择' : '发布为可读版本'"
            @click="emit('publish')"
          >
            <CloudUpload :size="14" /> 发布可读版本
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
