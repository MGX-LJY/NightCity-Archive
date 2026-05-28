<script setup>
import { computed, ref, shallowRef, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vitepress';
import { data as graph } from './graph.data.mjs';
import { colorOf } from './categoryStyle.mjs';

const route = useRoute();
const router = useRouter();
const expanded = ref(false);
const containerRef = ref(null);
const network = shallowRef(null);

function normalize(p) {
  if (!p) return '';
  let out = decodeURIComponent(p);
  out = out.replace(/\.html$/, '');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

const currentNode = computed(() => {
  const key = normalize(route.path);
  return graph.nodes.find((n) => n.path === key);
});

const localData = computed(() => {
  const center = currentNode.value;
  if (!center) return null;

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const adj = new Map();
  for (const e of graph.edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    if (!adj.has(e.to)) adj.set(e.to, new Set());
    adj.get(e.from).add(e.to);
    adj.get(e.to).add(e.from);
  }

  const visited = new Map();
  visited.set(center.id, 0);
  const queue = [center.id];
  while (queue.length) {
    const cur = queue.shift();
    const depth = visited.get(cur);
    if (depth >= 2) continue;
    const neighbors = adj.get(cur) || new Set();
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.set(n, depth + 1);
        queue.push(n);
      }
    }
  }

  const MAX = 25;
  const sorted = [...visited.entries()].sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    const wa = byId.get(a[0])?.weight || 0;
    const wb = byId.get(b[0])?.weight || 0;
    return wb - wa;
  });
  const keep = new Set(sorted.slice(0, MAX).map(([id]) => id));

  const nodes = [...keep].map((id) => {
    const n = byId.get(id);
    const isCenter = id === center.id;
    return {
      id,
      label: n.label,
      color: {
        background: isCenter ? colorOf(n.category) : 'transparent',
        border: colorOf(n.category),
        highlight: { background: colorOf(n.category), border: colorOf(n.category) },
      },
      font: { color: isCenter ? '#0b0e14' : colorOf(n.category), size: isCenter ? 18 : 14 },
      shape: isCenter ? 'box' : 'dot',
      size: isCenter ? 22 : 14 + Math.min(10, Math.sqrt(n.weight || 0) * 2),
      borderWidth: isCenter ? 3 : 1.5,
      path: n.path,
    };
  });

  const edges = graph.edges
    .filter((e) => keep.has(e.from) && keep.has(e.to))
    .map((e) => ({
      from: e.from,
      to: e.to,
      arrows: { to: { enabled: true, scaleFactor: 0.4 } },
      color: { color: 'rgba(148, 163, 184, 0.4)', highlight: '#22d3ee' },
      smooth: { type: 'continuous' },
    }));

  return { nodes, edges };
});

async function render() {
  if (!expanded.value || !localData.value || !containerRef.value) return;
  await nextTick();
  const { Network } = await import('vis-network/standalone');
  if (network.value) {
    network.value.destroy();
    network.value = null;
  }
  network.value = new Network(
    containerRef.value,
    { nodes: localData.value.nodes, edges: localData.value.edges },
    {
      autoResize: true,
      height: '420px',
      physics: {
        barnesHut: { gravitationalConstant: -8000, springLength: 110, springConstant: 0.04 },
        stabilization: { iterations: 150 },
      },
      interaction: { hover: true, tooltipDelay: 200 },
    }
  );
  network.value.on('click', (params) => {
    if (params.nodes.length) {
      const node = localData.value.nodes.find((n) => n.id === params.nodes[0]);
      if (node?.path) router.go(node.path);
    }
  });
}

watch([expanded, () => route.path], render, { flush: 'post' });

onBeforeUnmount(() => {
  if (network.value) network.value.destroy();
});
</script>

<template>
  <section v-if="currentNode && localData && localData.nodes.length > 1" class="nca-local-graph">
    <button class="nca-local-graph__toggle" @click="expanded = !expanded">
      <span>{{ expanded ? '收起' : '展开' }}局部关系图</span>
      <span class="nca-local-graph__hint">{{ localData.nodes.length }} 个节点 · 2 跳</span>
    </button>
    <div v-show="expanded" ref="containerRef" class="nca-local-graph__canvas"></div>
  </section>
</template>

<style scoped>
.nca-local-graph {
  margin-top: 1.5rem;
}
.nca-local-graph__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.6rem 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.15s;
}
.nca-local-graph__toggle:hover {
  border-color: var(--vp-c-brand-1);
}
.nca-local-graph__hint {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.nca-local-graph__canvas {
  margin-top: 0.8rem;
  height: 420px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
}
</style>
