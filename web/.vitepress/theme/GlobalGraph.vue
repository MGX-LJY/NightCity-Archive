<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vitepress';
import { data as graph } from './graph.data.mjs';
import { colorOf, labelOf, CATEGORY_COLOR } from './categoryStyle.mjs';

const router = useRouter();
const containerRef = ref(null);
const network = shallowRef(null);
const currentData = shallowRef({ nodes: [], edges: [] });

const mode = ref('overview'); // 'overview' | 'ego'
const egoCenter = ref(null);
const egoDepth = ref(1);
const breadcrumb = ref([]);

const ALL_CATEGORIES = Object.keys(CATEGORY_COLOR);
const overviewCategories = ref(new Set(['01_人物']));
const egoCategories = ref(new Set(ALL_CATEGORIES));
const hubSize = ref(30);
const searchQuery = ref('');
const stabilizing = ref(false);

const nodeById = computed(() => new Map(graph.nodes.map((n) => [n.id, n])));

const adjacency = computed(() => {
  const adj = new Map();
  for (const e of graph.edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    if (!adj.has(e.to)) adj.set(e.to, new Set());
    adj.get(e.from).add(e.to);
    adj.get(e.to).add(e.from);
  }
  return adj;
});

const availableCategories = computed(() =>
  ALL_CATEGORIES.filter((c) => graph.nodes.some((n) => n.category === c))
);

const centerNode = computed(() =>
  egoCenter.value ? nodeById.value.get(egoCenter.value) : null
);

function neighborsOf(id) {
  return adjacency.value.get(id) || new Set();
}

function buildOverviewIds() {
  const sorted = [...graph.nodes]
    .filter((n) => overviewCategories.value.has(n.category) && n.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, hubSize.value);
  return new Set(sorted.map((n) => n.id));
}

function buildEgoIds(centerId, depth) {
  const visible = new Set([centerId]);
  let frontier = new Set([centerId]);
  for (let d = 0; d < depth; d++) {
    const next = new Set();
    for (const id of frontier) {
      for (const nb of neighborsOf(id)) {
        if (visible.has(nb)) continue;
        const n = nodeById.value.get(nb);
        if (!n) continue;
        if (egoCategories.value.has(n.category)) {
          visible.add(nb);
          next.add(nb);
        }
      }
    }
    frontier = next;
  }
  return visible;
}

function makeData(visibleIds, centerId) {
  const total = visibleIds.size;
  const showAll = total <= 40;
  const labelSet = showAll
    ? new Set(visibleIds)
    : new Set(
        [...visibleIds]
          .map((id) => nodeById.value.get(id))
          .filter(Boolean)
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .slice(0, 22)
          .map((n) => n.id)
      );

  if (centerId) labelSet.add(centerId);

  const nodes = [...visibleIds].map((id) => {
    const n = nodeById.value.get(id);
    const w = n.weight || 0;
    const isCenter = id === centerId;
    const c = colorOf(n.category);
    const baseSize = isCenter ? 24 : 9 + Math.sqrt(w) * 2.2;
    const showLabel = labelSet.has(id);

    const node = {
      id,
      label: showLabel ? n.label : ' ',
      title: `${n.label} · ${labelOf(n.category)} · 被引用 ${w} 次`,
      color: {
        background: isCenter ? '#0b0e14' : c,
        border: isCenter ? c : c,
        highlight: { background: c, border: '#ffffff' },
      },
      size: baseSize,
      shape: 'dot',
      borderWidth: isCenter ? 3 : 1,
      shadow: isCenter
        ? { enabled: true, color: c, size: 18, x: 0, y: 0 }
        : false,
      path: n.path,
      category: n.category,
      weight: w,
    };

    if (showLabel) {
      node.font = {
        color: '#e5e7eb',
        size: isCenter ? 16 : 12,
        strokeWidth: 3,
        strokeColor: '#0b0e14',
        face: 'inherit',
      };
    } else {
      node.font = { size: 0, color: 'transparent' };
    }

    if (isCenter) {
      node.x = 0;
      node.y = 0;
      node.fixed = { x: true, y: true };
    }

    return node;
  });

  const edges = graph.edges
    .filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
    .map((e) => {
      const isCenterEdge =
        centerId && (e.from === centerId || e.to === centerId);
      return {
        from: e.from,
        to: e.to,
        color: {
          color: isCenterEdge
            ? 'rgba(34, 211, 238, 0.5)'
            : 'rgba(148, 163, 184, 0.18)',
          highlight: '#22d3ee',
        },
        width: isCenterEdge ? 1.4 : 0.6,
        smooth: false,
      };
    });

  return { nodes, edges };
}

async function render() {
  if (!containerRef.value) return;
  await nextTick();
  const { Network } = await import('vis-network/standalone');

  let visibleIds;
  let centerId = null;
  if (mode.value === 'ego' && egoCenter.value) {
    visibleIds = buildEgoIds(egoCenter.value, egoDepth.value);
    centerId = egoCenter.value;
  } else {
    visibleIds = buildOverviewIds();
  }

  const data = makeData(visibleIds, centerId);
  currentData.value = data;

  if (network.value) {
    network.value.destroy();
    network.value = null;
  }

  stabilizing.value = true;

  network.value = new Network(containerRef.value, data, {
    autoResize: true,
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: centerId ? -85 : -55,
        centralGravity: centerId ? 0.02 : 0.005,
        springLength: 110,
        springConstant: 0.06,
        damping: 0.6,
        avoidOverlap: 1,
      },
      stabilization: {
        enabled: true,
        iterations: data.nodes.length > 80 ? 350 : 180,
        updateInterval: 50,
      },
      minVelocity: 0.75,
    },
    interaction: {
      hover: true,
      tooltipDelay: 150,
      hideEdgesOnDrag: data.nodes.length > 150,
      dragNodes: true,
      zoomView: true,
    },
    nodes: { borderWidth: 1, scaling: { label: { enabled: false } } },
  });

  network.value.once('stabilizationIterationsDone', () => {
    if (network.value) {
      network.value.setOptions({ physics: { enabled: false } });
      stabilizing.value = false;
    }
  });

  network.value.on('click', (params) => {
    if (params.nodes.length) handleClick(params.nodes[0]);
  });

  network.value.on('doubleClick', (params) => {
    if (params.nodes.length) {
      const node = currentData.value.nodes.find((n) => n.id === params.nodes[0]);
      if (node?.path) router.go(node.path);
    }
  });
}

function handleClick(id) {
  if (mode.value === 'ego') {
    if (egoCenter.value === id) return;
    breadcrumb.value = [
      ...breadcrumb.value,
      { id: egoCenter.value, label: nodeById.value.get(egoCenter.value).label },
    ];
    egoCenter.value = id;
  } else {
    enterEgo(id);
  }
}

function enterEgo(id) {
  egoCenter.value = id;
  mode.value = 'ego';
  breadcrumb.value = [];
}

function exitEgo() {
  mode.value = 'overview';
  egoCenter.value = null;
  breadcrumb.value = [];
}

function goCrumb(idx) {
  const target = breadcrumb.value[idx];
  if (!target) return;
  egoCenter.value = target.id;
  breadcrumb.value = breadcrumb.value.slice(0, idx);
}

function findAndFocus() {
  const q = searchQuery.value.trim();
  if (!q) return;
  const hit =
    graph.nodes.find((n) => n.label === q) ||
    graph.nodes.find((n) => n.label.includes(q));
  if (!hit) return;
  if (mode.value === 'ego') {
    breadcrumb.value = [
      ...breadcrumb.value,
      { id: egoCenter.value, label: nodeById.value.get(egoCenter.value).label },
    ];
    egoCenter.value = hit.id;
  } else {
    enterEgo(hit.id);
  }
  searchQuery.value = '';
}

function toggleCategory(cat) {
  const ref = mode.value === 'ego' ? egoCategories : overviewCategories;
  const next = new Set(ref.value);
  if (next.has(cat)) next.delete(cat);
  else next.add(cat);
  ref.value = next;
}

function selectOnlyCategory(cat) {
  const ref = mode.value === 'ego' ? egoCategories : overviewCategories;
  ref.value = new Set([cat]);
}

function selectAllCategories() {
  const ref = mode.value === 'ego' ? egoCategories : overviewCategories;
  ref.value = new Set(ALL_CATEGORIES);
}

function fitView() {
  if (network.value) network.value.fit({ animation: { duration: 400 } });
}

watch(
  [mode, egoCenter, egoDepth, hubSize, overviewCategories, egoCategories],
  render,
  { flush: 'post' }
);

onMounted(render);
onBeforeUnmount(() => {
  if (network.value) network.value.destroy();
});
</script>

<template>
  <div class="nca-graph">
    <div class="nca-graph__topbar">
      <div class="nca-graph__modes">
        <button
          class="nca-mode"
          :class="{ 'nca-mode--active': mode === 'overview' }"
          @click="exitEgo"
        >
          🌐 鸟瞰
        </button>
        <button
          class="nca-mode"
          :class="{ 'nca-mode--active': mode === 'ego' }"
          :disabled="!egoCenter"
        >
          🎯 自我图
        </button>
      </div>

      <div v-if="mode === 'ego'" class="nca-graph__crumbs">
        <button class="nca-crumb nca-crumb--root" @click="exitEgo">← 鸟瞰</button>
        <template v-for="(c, i) in breadcrumb" :key="`${c.id}-${i}`">
          <span class="nca-crumb__sep">›</span>
          <button class="nca-crumb" @click="goCrumb(i)">{{ c.label }}</button>
        </template>
        <span class="nca-crumb__sep">›</span>
        <span class="nca-crumb nca-crumb--current">{{ centerNode?.label }}</span>
      </div>
    </div>

    <div class="nca-graph__controls">
      <div class="nca-graph__search">
        <input
          v-model="searchQuery"
          @keydown.enter="findAndFocus"
          :placeholder="mode === 'ego' ? '搜节点 ↵ 切换中心' : '搜节点 ↵ 进入自我图'"
          type="text"
        />
      </div>

      <div class="nca-graph__chips">
        <button
          v-for="cat in availableCategories"
          :key="cat"
          class="nca-chip"
          :class="{ 'nca-chip--active': (mode === 'ego' ? egoCategories : overviewCategories).has(cat) }"
          :style="{
            '--c': colorOf(cat),
            borderColor: (mode === 'ego' ? egoCategories : overviewCategories).has(cat) ? colorOf(cat) : 'var(--vp-c-divider)',
            color: (mode === 'ego' ? egoCategories : overviewCategories).has(cat) ? colorOf(cat) : 'var(--vp-c-text-2)',
          }"
          @click="toggleCategory(cat)"
          @dblclick="selectOnlyCategory(cat)"
          :title="`单击切换 · 双击只看${labelOf(cat)}`"
        >
          {{ labelOf(cat) }}
        </button>
        <button class="nca-chip nca-chip--ghost" @click="selectAllCategories" title="全选">全</button>
      </div>

      <template v-if="mode === 'overview'">
        <label class="nca-graph__slider">
          枢纽数 {{ hubSize }}
          <input type="range" min="10" max="60" step="5" v-model.number="hubSize" />
        </label>
      </template>

      <template v-else>
        <div class="nca-graph__depth">
          <span>深度</span>
          <button
            class="nca-depth"
            :class="{ 'nca-depth--active': egoDepth === 1 }"
            @click="egoDepth = 1"
          >1 跳</button>
          <button
            class="nca-depth"
            :class="{ 'nca-depth--active': egoDepth === 2 }"
            @click="egoDepth = 2"
          >2 跳</button>
        </div>
        <a
          v-if="centerNode?.path"
          :href="centerNode.path"
          class="nca-btn nca-btn--primary"
        >→ 跳详情页</a>
      </template>

      <div class="nca-graph__actions">
        <button class="nca-btn" @click="fitView" title="自适应缩放">⤢ 适应</button>
      </div>
    </div>

    <div class="nca-graph__hint">
      <template v-if="mode === 'overview'">
        显示 <b>Top-{{ hubSize }}</b> 跨类别枢纽 · <b>单击</b>节点 = 钻进它的自我图 · <b>双击</b> = 跳详情页
      </template>
      <template v-else>
        中心: <b style="color: var(--vp-c-brand-1)">{{ centerNode?.label }}</b> ·
        <b>单击</b>邻居 = 切换中心 · <b>双击</b> = 跳详情页
      </template>
      <span v-if="stabilizing" class="nca-graph__stab">布局中…</span>
    </div>

    <div ref="containerRef" class="nca-graph__canvas"></div>

    <div class="nca-graph__stats">
      <span>显示 {{ currentData.nodes.length }} 节点 / {{ currentData.edges.length }} 关联</span>
      <span class="nca-graph__total">全库 {{ graph.nodes.length }} 节点</span>
    </div>
  </div>
</template>

<style scoped>
.nca-graph {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.nca-graph__topbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}
.nca-graph__modes {
  display: flex;
  gap: 0.3rem;
}
.nca-mode {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  border-radius: 4px;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.12s;
}
.nca-mode:hover:not(:disabled) {
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-text-1);
}
.nca-mode--active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1) inset;
}
.nca-mode:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nca-graph__crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.nca-crumb {
  padding: 0.2rem 0.55rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--vp-c-text-2);
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.12s;
}
.nca-crumb:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.nca-crumb--root {
  color: var(--vp-c-brand-1);
}
.nca-crumb--current {
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: default;
}
.nca-crumb__sep {
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}

.nca-graph__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}
.nca-graph__search input {
  width: 240px;
  padding: 0.4rem 0.7rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
}
.nca-graph__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.nca-chip {
  font-size: 0.82rem;
  padding: 0.25rem 0.7rem;
  border: 1px solid;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: all 0.12s;
}
.nca-chip--active {
  background: color-mix(in srgb, var(--c) 14%, transparent);
}
.nca-chip--ghost {
  border-color: var(--vp-c-divider) !important;
  color: var(--vp-c-text-3) !important;
  width: 32px;
  padding: 0.25rem 0;
  text-align: center;
}

.nca-graph__slider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.nca-graph__slider input {
  width: 100px;
}

.nca-graph__depth {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.nca-depth {
  padding: 0.25rem 0.6rem;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.12s;
}
.nca-depth--active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.nca-graph__actions {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}
.nca-btn {
  padding: 0.35rem 0.8rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  text-decoration: none !important;
  cursor: pointer;
  transition: all 0.12s;
  display: inline-flex;
  align-items: center;
}
.nca-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}
.nca-btn--primary {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.nca-graph__hint {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  padding: 0 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.nca-graph__hint b {
  color: var(--vp-c-text-1);
  font-weight: 500;
}
.nca-graph__stab {
  font-size: 0.75rem;
  padding: 0.1rem 0.55rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 999px;
  animation: nca-pulse 1.4s ease-in-out infinite;
}
@keyframes nca-pulse {
  50% { opacity: 0.45; }
}

.nca-graph__canvas {
  width: 100%;
  height: calc(100vh - 360px);
  min-height: 540px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: #0b0e14;
}

.nca-graph__stats {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.nca-graph__total {
  opacity: 0.65;
}
</style>
