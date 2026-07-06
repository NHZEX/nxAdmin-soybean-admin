<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import ThemeSchema from './modules/theme-schema.vue';
import ThemeColor from './modules/theme-color.vue';
import ThemeRadius from './modules/theme-radius.vue';

defineOptions({
  name: 'AppearanceSettings'
});

const themeStore = useThemeStore();
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <ThemeSchema />
    <template v-if="!themeStore.simplifyMode">
      <ThemeColor />
      <ThemeRadius />
    </template>
  </div>
</template>

<style scoped></style>
