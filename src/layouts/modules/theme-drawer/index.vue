<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import AppearanceSettings from './modules/appearance/index.vue';
import LayoutSettings from './modules/layout/index.vue';
import GeneralSettings from './modules/general/index.vue';
import ConfigOperation from './modules/config-operation.vue';
import PresetSettings from './modules/preset/index.vue';

defineOptions({
  name: 'ThemeDrawer'
});

const appStore = useAppStore();
const themeStore = useThemeStore();
const activeTab = ref('appearance');
const availableTabs = computed(() => {
  const tabs = ['appearance', 'layout'];

  if (!themeStore.simplifyMode) {
    tabs.push('general', 'preset');
  }

  return tabs;
});

const drawerWidth = computed(() => {
  const width = 400;

  // On mobile devices, use 90% of viewport width with a maximum of 400px
  if (appStore.isMobile) {
    return `min(90vw, ${width}px)`;
  }

  return width;
});

watch(
  availableTabs,
  tabs => {
    if (!tabs.includes(activeTab.value)) {
      activeTab.value = 'appearance';
    }
  },
  { immediate: true }
);
</script>

<template>
  <NDrawer v-model:show="appStore.themeDrawerVisible" display-directive="show" :width="drawerWidth">
    <NDrawerContent :title="$t('theme.themeDrawerTitle')" :native-scrollbar="false" closable>
      <NTabs v-model:value="activeTab" type="segment" size="medium" class="mb-16px">
        <NTab name="appearance" :tab="$t('theme.tabs.appearance')"></NTab>
        <NTab name="layout" :tab="$t('theme.tabs.layout')"></NTab>
        <NTab v-if="!themeStore.simplifyMode" name="general" :tab="$t('theme.tabs.general')"></NTab>
        <NTab v-if="!themeStore.simplifyMode" name="preset" :tab="$t('theme.tabs.preset')"></NTab>
      </NTabs>

      <div class="min-h-400px">
        <KeepAlive>
          <AppearanceSettings v-if="activeTab === 'appearance'" />
          <LayoutSettings v-else-if="activeTab === 'layout'" />
          <GeneralSettings v-else-if="!themeStore.simplifyMode && activeTab === 'general'" />
          <PresetSettings v-else-if="!themeStore.simplifyMode && activeTab === 'preset'" />
        </KeepAlive>
      </div>

      <template #footer>
        <ConfigOperation />
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
:deep(.n-tab) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.n-tab-pane) {
  padding: 0;
}
</style>
