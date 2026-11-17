<script setup lang="ts">
import { Bookmark, Plus, X, Check, History, Trash2 } from "lucide-vue-next";
import type { Bookmark as Mark, RouteRecord } from "../../../shared/document";
defineProps<{
  bookmarks: Mark[];
  metrics: {
    percent: number;
    step: number;
    remaining: number;
    routes: number;
    explored: number;
  };
  records: RouteRecord[];
  status: string;
}>();
const emit = defineEmits<{
  add: [];
  restore: [mark: Mark];
  remove: [id: string];
  switchRoute: [id: string];
  dropRoute: [id: string];
}>();
function time(created: number) {
  return new Date(created).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>
<template>
  <section class="progress-panel">
    <div class="section-heading">
      <span><Bookmark :size="14" /> 我的书签</span
      ><button title="添加当前书签" @click="emit('add')">
        <Plus :size="16" />
      </button>
    </div>
    <div v-if="!bookmarks.length" class="empty-bookmarks">
      <Bookmark :size="23" />
      <p>把喜欢的瞬间留在这里</p>
      <button @click="emit('add')">添加当前分镜</button>
    </div>
    <div v-for="mark in bookmarks" :key="mark.id" class="bookmark-row">
      <button @click="emit('restore', mark)">{{ mark.label }}</button
      ><button title="删除书签" @click="emit('remove', mark.id)">
        <X :size="12" />
      </button>
    </div>
    <div class="route-records">
      <div class="section-heading">
        <span><History :size="14" /> 已读路线</span
        ><span class="muted">{{ records.length }} 条</span>
      </div>
      <p v-if="!records.length" class="muted-note">
        在分支点改选后，原来的路线会保存在这里，方便对照。
      </p>
      <div v-for="record in records" :key="record.id" class="route-record">
        <button class="route-record-name" @click="emit('switchRoute', record.id)">
          <strong>{{ record.name }}</strong>
          <small>{{ record.entries.length }} 格 · {{ time(record.created) }}</small>
        </button>
        <button title="删除这条路线" @click="emit('dropRoute', record.id)">
          <Trash2 :size="12" />
        </button>
      </div>
    </div>
    <div class="reading-progress">
      <div>
        <span>当前路线进度</span><b>{{ metrics.percent }}%</b>
      </div>
      <div class="progress-track">
        <i :style="{ width: `${metrics.percent}%` }"></i>
      </div>
      <p class="route-stats">
        本路线第 {{ metrics.step }} 格 · 前方约 {{ metrics.remaining }} 格<br />
        已探索 {{ metrics.routes }} 条路线 · 到达过 {{ metrics.explored }} 个分镜
      </p>
      <p><Check :size="12" /> {{ status }}</p>
    </div>
  </section>
</template>
