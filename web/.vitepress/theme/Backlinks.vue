<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import { colorOf, labelOf } from './categoryStyle.mjs';

const route = useRoute();

function normalize(p) {
  if (!p) return '';
  let out = decodeURIComponent(p);
  out = out.replace(/\.html$/, '');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

const entries = ref([]);
let requestVersion = 0;

watch(() => route.path, async () => {
  const version = ++requestVersion;
  const key = normalize(route.path);
  try {
    const response = await fetch(`/__data/backlinks${encodeURI(key)}.json`);
    const data = response.ok ? await response.json() : [];
    if (version === requestVersion) entries.value = data;
  } catch {
    if (version === requestVersion) entries.value = [];
  }
}, { immediate: true });
</script>

<template>
  <section v-if="entries.length" class="nca-backlinks">
    <h2 class="nca-backlinks__title">反向链接 <span class="nca-backlinks__count">{{ entries.length }}</span></h2>
    <ul class="nca-backlinks__list">
      <li v-for="b in entries" :key="b.path" class="nca-backlinks__item">
        <a :href="b.path" class="nca-backlinks__link">
          <span
            class="nca-backlinks__chip"
            :style="{ borderColor: colorOf(b.category), color: colorOf(b.category) }"
          >{{ labelOf(b.category) }}</span>
          <span class="nca-backlinks__label">{{ b.label }}</span>
        </a>
        <p class="nca-backlinks__snippet">…{{ b.snippet }}…</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.nca-backlinks {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}
.nca-backlinks__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.nca-backlinks__count {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}
.nca-backlinks__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.6rem;
}
.nca-backlinks__item {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.15s, transform 0.15s;
}
.nca-backlinks__item:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}
.nca-backlinks__link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none !important;
  font-weight: 500;
  color: var(--vp-c-text-1) !important;
}
.nca-backlinks__chip {
  font-size: 0.7rem;
  padding: 0.05rem 0.4rem;
  border: 1px solid;
  border-radius: 999px;
  background: transparent;
  flex-shrink: 0;
}
.nca-backlinks__label {
  font-size: 0.95rem;
}
.nca-backlinks__snippet {
  margin: 0.4rem 0 0 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
