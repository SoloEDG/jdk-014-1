<script setup lang="ts">
import { computed } from "vue";
import { GitBranch, GitMerge, MapPinned } from "lucide-vue-next";
import type {
  ComicDocument,
  PathEntry,
} from "../../../shared/document";
import { findChoice, findPanel, mergeTargetIds } from "../../../shared/graph";
const props = defineProps<{
  doc: ComicDocument;
  trail: PathEntry[];
  cursor: number;
}>();
const emit = defineEmits<{ select: [index: number] }>();
const merges = computed(() => mergeTargetIds(props.doc));
interface Row {
  entry: PathEntry;
  index: number;
  label: string;
  via: string;
  branch: boolean;
  merge: boolean;
  state: "past" | "current" | "future";
}
const rows = computed<Row[]>(() =>
  props.trail.map((entry, index) => {
    const ref = findPanel(props.doc, entry.panelId);
    let label = "已删除的分镜",
      branch = false;
    if (ref) {
      const page = ref.chapter.pages.findIndex((p) => p.id === ref.page.id) + 1;
      const shot =
        ref.page.panels.findIndex((p) => p.id === ref.panel.id) + 1;
      label = `${ref.chapter.title} · 第${page}页 · 镜头${shot}`;
      branch = (ref.panel.choices?.length ?? 0) > 0;
    }
    const via = entry.viaChoiceId
      ? (findChoice(props.doc, entry.viaChoiceId)?.choice.label ?? "已删除的选项")
      : "";
    return {
      entry,
      index,
      label,
      via,
      branch,
      merge: merges.value.has(entry.panelId),
      state:
        index === props.cursor
          ? "current"
          : index < props.cursor
            ? "past"
            : "future",
    };
  }),
);
</script>
<template>
  <section class="route-map">
    <div class="section-heading">
      <span><MapPinned :size="14" /> 当前路线</span>
      <span class="muted">{{ cursor + 1 }} / {{ trail.length }} 格</span>
    </div>
    <ol class="route-timeline">
      <li
        v-for="row in rows"
        :key="row.index"
        :class="row.state"
      >
        <p v-if="row.via" class="route-via">⤷ {{ row.via }}</p>
        <button @click="emit('select', row.index)">
          <span class="route-node">
            <GitBranch v-if="row.branch" :size="11" aria-label="分支点" />
            <GitMerge v-else-if="row.merge" :size="11" aria-label="汇合点" />
            <i v-else></i>
          </span>
          <span class="route-label">{{ row.label }}</span>
          <small v-if="row.state === 'future'">未走</small>
        </button>
      </li>
    </ol>
    <p class="route-hint">点击任意一格回到当时的位置，可重新选择路线。</p>
  </section>
</template>
