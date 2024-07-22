<script setup lang="ts">
import HeaderBanner from './modules/header-banner.vue';
</script>

<template>
  <NSpace vertical :size="16">
    <NAlert :title="$t('common.warning')" type="warning" closable>
      {{ $t('page.home.branchDesc') }}
    </NAlert>
    <HeaderBanner />
  </NSpace>
</template>

<style scoped></style>
