<script setup lang="ts">
import { ChevronRight, GitBranch, Scan } from "lucide-vue-next";
import type { Choice, ComicDocument, Panel } from "../../../shared/document";
import { findPanel } from "../../../shared/graph";
const props = defineProps<{
  doc: ComicDocument;
  choices: Choice[];
  pageBranch: Panel | null;
}>();
const emit = defineEmits<{
  choose: [id: string];
  focusPanel: [id: string];
}>();
function targetHint(choice: Choice) {
  const ref = findPanel(props.doc, choice.targetPanelId);
  if (!ref) return "";
  const page = ref.chapter.pages.findIndex((p) => p.id === ref.page.id) + 1;
  return `${ref.chapter.title} · 第${page}页`;
}
</script>
<template>
  <section v-if="choices.length" class="choice-bar">
    <div class="choice-heading">
      <span><GitBranch :size="14" /> 调查路线</span>
      <small>选择一条路线继续，故事将在前方汇合</small>
    </div>
    <div class="choice-list">
      <button
        v-for="choice in choices"
        :key="choice.id"
        class="choice-button"
        @click="emit('choose', choice.id)"
      >
        <span>
          <strong>{{ choice.label }}</strong>
          <small>{{ targetHint(choice) }}</small>
        </span>
        <ChevronRight :size="15" />
      </button>
    </div>
  </section>
  <section v-else-if="pageBranch" class="choice-bar page-branch-hint">
    <span><GitBranch :size="14" /> 本页藏有路线分支</span>
    <button @click="emit('focusPanel', pageBranch.id)">
      <Scan :size="13" /> 进入逐格选择
    </button>
  </section>
</template>
