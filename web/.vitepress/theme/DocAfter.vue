<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';

const LocalGraph = defineAsyncComponent(() => import('./LocalGraph.vue'));
const Backlinks = defineAsyncComponent(() => import('./Backlinks.vue'));

const ready = ref(false);
let idleId;
let timerId;

onMounted(() => {
  const reveal = () => {
    ready.value = true;
  };
  if ('requestIdleCallback' in window) {
    idleId = window.requestIdleCallback(reveal, { timeout: 1800 });
  } else {
    timerId = window.setTimeout(reveal, 300);
  }
});

onBeforeUnmount(() => {
  if (idleId !== undefined && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(idleId);
  }
  if (timerId !== undefined) window.clearTimeout(timerId);
});
</script>

<template>
  <div class="nca-doc-after">
    <template v-if="ready">
      <LocalGraph />
      <Backlinks />
    </template>
  </div>
</template>
