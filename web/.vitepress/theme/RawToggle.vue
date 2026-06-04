<script setup>
import { ref, onMounted } from 'vue';

// 控制侧边栏「原始资料」整组的显示 / 隐藏，选择记忆在 localStorage
const STORAGE_KEY = 'nca-hide-raw';
const hidden = ref(false);

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('nca-hide-raw', hidden.value);
}

function toggle() {
  hidden.value = !hidden.value;
  try {
    localStorage.setItem(STORAGE_KEY, hidden.value ? '1' : '0');
  } catch (e) {
    /* localStorage 不可用时忽略 */
  }
  apply();
}

onMounted(() => {
  try {
    hidden.value = localStorage.getItem(STORAGE_KEY) === '1';
  } catch (e) {
    /* ignore */
  }
  apply();
});
</script>

<template>
  <button
    type="button"
    class="nca-raw-toggle"
    :class="{ 'is-hidden': hidden }"
    @click="toggle"
    :title="hidden ? '原始资料已隐藏，点击显示' : '原始资料显示中，点击隐藏'"
  >
    {{ hidden ? '📁 原始资料·隐藏' : '📂 原始资料·显示' }}
  </button>
</template>
