<script setup lang="ts">
import { computed } from "vue";
import {
  BookOpen,
  ChevronRight,
  Grid2X2,
  Scan,
  Minus,
  Plus,
  Bookmark,
  Cloud,
  PanelLeftClose,
  GitBranch,
} from "lucide-vue-next";
import { LibraryPanel } from "../features/library";
import { ChapterPanel } from "../features/chapters";
import { ReaderStage, PanelStrip } from "../features/reader";
import { AudioPanel } from "../features/audio";
import { ProgressPanel } from "../features/progress";
import { RouteEditor, RouteMap, ChoiceBar } from "../features/routes";
import { mergeTargetIds, visibleChoices } from "../shared/graph";
import { useWorkspace } from "./workspace";
const {
  doc,
  reader: r,
  progress: p,
  library: l,
  chapters: c,
  routes: ro,
  requestChapterRemove,
  audio: a,
} = useWorkspace();
const current = r.current,
  at = r.location,
  mode = r.mode,
  metrics = p.metrics,
  bookmarks = p.bookmarks,
  status = p.status,
  cue = a.cue;
const chapterIndex = computed(
  () => doc.value.chapters.findIndex((c) => c.id === at.value.chapterId) + 1,
);
const choices = computed(() => r.choices.value);
const pageBranch = computed(() => {
  if (mode.value !== "page" || !current.value.page) return null;
  return (
    current.value.page.panels.find(
      (p) =>
        p.id !== at.value.panelId &&
        visibleChoices(p, r.flags.value).length > 0,
    ) ?? null
  );
});
const merges = computed(() => mergeTargetIds(doc.value));
const nextBlocked = computed(
  () =>
    mode.value === "panel" &&
    r.cursor.value >= r.trail.value.length - 1 &&
    r.nextStep.value.kind === "choose",
);
function focus(id: string) {
  r.dispatch({ type: "panel", id });
  r.setMode("panel");
}
</script>
<template>
  <div class="app-shell">
    <header class="app-header">
      <a class="brand" href="./"
        ><div class="brand-icon"><BookOpen :size="22" /></div>
        <strong>PANEL<span>沉浸漫画</span></strong></a
      >
      <nav>
        <span>我的书架</span><ChevronRight :size="13" /><strong>{{
          doc.title
        }}</strong
        ><span class="preview-tag">正在阅读</span>
      </nav>
      <div class="header-right">
        <Cloud :size="15" /><span>本地已就绪</span>
        <div class="avatar">林</div>
      </div>
    </header>
    <div class="workspace">
      <aside class="left-sidebar">
        <div class="book-cover">
          <img :src="doc.chapters[0]?.pages[0]?.image" alt="雨停之前漫画封面" />
          <div>
            <small>ORIGINAL COMIC</small>
            <h1>{{ doc.title }}</h1>
            <p>{{ doc.author }} 著</p>
          </div>
          <span>全彩 · 沉浸版</span>
        </div>
        <div class="book-details">
          <h2>{{ doc.title }} <span>连载中</span></h2>
          <p>当城市沉睡，故事才刚刚开始。</p>
          <div><span>都市悬疑</span><span>氛围叙事</span></div>
        </div>
        <ChapterPanel
          :chapters="doc.chapters"
          :active="at.chapterId"
          :editing="c.editing.value"
          :draft="c.draft.value"
          :error="c.error.value"
          @select="r.dispatch({ type: 'chapter', id: $event })"
          @rename="c.begin"
          @move="c.move"
          @remove="requestChapterRemove"
          @draft="c.draft.value = $event"
          @save="c.rename"
        />
        <RouteMap
          :doc="doc"
          :trail="r.trail.value"
          :cursor="r.cursor.value"
          @select="r.dispatch({ type: 'cursor', index: $event })"
        />
        <div class="route-edit-entry">
          <button class="subtle-button" @click="ro.begin">
            <GitBranch :size="14" /> 编辑分支路线
          </button>
          <p v-if="ro.notice.value" class="notice" role="status">
            {{ ro.notice.value }}
          </p>
        </div>
        <LibraryPanel
          :busy="l.busy.value"
          :message="l.message.value"
          @import="l.importFiles"
          @reset="l.reset"
        />
        <div class="sidebar-footer">
          <PanelLeftClose :size="14" /> 你的私人漫画放映室 <span>v1.0</span>
        </div>
      </aside>
      <main class="reading-workspace">
        <div class="reader-toolbar">
          <div>
            <span class="chapter-eyebrow"
              >CHAPTER {{ String(chapterIndex).padStart(2, "0") }}</span
            >
            <h2>{{ current.chapter?.title }}</h2>
          </div>
          <div class="reader-tools">
            <div class="mode-switch">
              <button
                :class="{ active: mode === 'page' }"
                @click="r.setMode('page')"
              >
                <Grid2X2 :size="14" /> 整页</button
              ><button
                :class="{ active: mode === 'panel' }"
                @click="r.setMode('panel')"
              >
                <Scan :size="14" /> 逐格
              </button>
            </div>
            <span class="tool-divider"></span
            ><button aria-label="缩小" @click="r.zoom(-0.2)">
              <Minus :size="15" /></button
            ><span class="zoom-value">{{ Math.round(at.zoom * 100) }}%</span
            ><button aria-label="放大" @click="r.zoom(0.2)">
              <Plus :size="15" /></button
            ><button title="收藏当前分镜" @click="p.add">
              <Bookmark :size="16" />
            </button>
          </div>
        </div>
        <ReaderStage
          v-if="current.page && current.panel"
          :page="current.page"
          :panel="current.panel"
          :location="at"
          :mode="mode"
          :merges="merges"
          :next-blocked="nextBlocked"
          @move="r.dispatch({ type: 'move', delta: $event })"
          @pan="r.pan"
          @panel="focus"
        />
        <ChoiceBar
          :doc="doc"
          :choices="choices"
          :page-branch="pageBranch"
          @choose="r.dispatch({ type: 'choose', id: $event })"
          @focus-panel="focus"
        />
        <div class="page-position">
          <span>{{ current.chapter?.subtitle }}</span>
          <div>
            <b>{{ String(metrics.pageIndex).padStart(2, "0") }}</b
            ><span>/ {{ String(metrics.pageCount).padStart(2, "0") }}</span
            ><small>页</small>
          </div>
          <span
            >本路线第 {{ metrics.step }} 格 · 前方约 {{ metrics.remaining }} 格
            <i></i
          ></span>
        </div>
        <PanelStrip
          v-if="current.page"
          :page="current.page"
          :active="at.panelId"
          @select="focus"
        />
      </main>
      <aside class="right-sidebar">
        <AudioPanel
          :enabled="a.enabled.value"
          :volume="a.volume.value"
          :dialogue="a.dialogue.value"
          :cue="cue"
          :error="a.error.value"
          @toggle="a.toggle"
          @volume="a.volume.value = $event"
          @dialogue="a.dialogue.value = !a.dialogue.value"
        /><ProgressPanel
          :bookmarks="bookmarks"
          :metrics="metrics"
          :records="r.records.value"
          :status="status"
          @add="p.add"
          @remove="p.remove"
          @restore="
            r.dispatch({
              type: 'restore',
              location: $event.location,
              trail: $event.trail,
              cursor: $event.cursor,
            })
          "
          @switch-route="r.dispatch({ type: 'switchRoute', id: $event })"
          @drop-route="r.dispatch({ type: 'dropRoute', id: $event })"
        />
        <div class="reading-tip">
          <span>✦ 阅读小贴士</span>
          <p>在分支点选择调查路线，<br />回头改选也不会丢失读过的故事。</p>
          <kbd>←</kbd><kbd>→</kbd> <small>前进 / 回退</small><br /><kbd>Space</kbd>
          <small>播放 / 暂停声景</small>
        </div>
      </aside>
    </div>
    <footer class="app-footer">
      <span><i></i> 所有故事，都有回声。</span
      ><span>PANEL · 为每一格想象而生</span
      ><span>图片导入 · 本地存储 · 无需联网</span>
    </footer>
    <RouteEditor
      :open="ro.open.value"
      :draft="ro.draft.value"
      :selected="ro.selected.value"
      :dirty="ro.dirty.value"
      :error="ro.error.value"
      :last-removed="ro.lastRemoved.value"
      :issues="ro.issues.value"
      :warnings="ro.warnings.value"
      @select="ro.select"
      @add-choice="ro.addChoice"
      @update-choice="ro.updateChoice"
      @remove-choice="ro.removeChoice"
      @set-continue="ro.setContinue"
      @remove-panel="ro.removePanel"
      @publish="ro.publish"
      @discard="ro.discard"
      @close="ro.close"
    />
  </div>
</template>
