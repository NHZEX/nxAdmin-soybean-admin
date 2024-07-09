<script setup lang="ts">
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import { useThemeStore } from '@/store/modules/theme';
import DarkMode from './modules/dark-mode.vue';
import LayoutMode from './modules/layout-mode.vue';
import ThemeColor from './modules/theme-color.vue';
import PageFun from './modules/page-fun.vue';
import ConfigOperation from './modules/config-operation.vue';

defineOptions({
  name: 'ThemeDrawer'
});

const appStore = useAppStore();
const themeStore = useThemeStore();
</script>

<template>
  <NDrawer v-model:show="appStore.themeDrawerVisible" display-directive="show" :width="360">
    <NDrawerContent :title="$t('theme.themeDrawerTitle')" :native-scrollbar="false" closable>
      <DarkMode />
      <LayoutMode />
      <ThemeColor v-if="!themeStore.simplifyMode" />
      <PageFun v-if="!themeStore.simplifyMode" />
      <template #footer>
        <ConfigOperation />
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
