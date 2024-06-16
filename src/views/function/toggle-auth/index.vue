<script setup lang="ts">
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';

const authStore = useAuthStore();
const { hasAuth } = useAuth();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :title="$t('route.function_toggle-auth')" :bordered="false" size="small" segmented class="card-wrapper">
      <NDescriptions bordered :column="1">
        <NDescriptionsItem :label="$t('page.manage.user.userRole')">
          <NSpace>
            <NTag v-for="[role] in authStore.permissions.entries()" :key="role">{{ role }}</NTag>
          </NSpace>
        </NDescriptionsItem>
        <NDescriptionsItem ions-item :label="$t('page.function.toggleAuth.toggleAccount')">
          <NSpace>
            <NButton disabled>无法操作</NButton>
          </NSpace>
        </NDescriptionsItem>
      </NDescriptions>
    </NCard>
    <NCard
      :title="$t('page.function.toggleAuth.authHook')"
      :bordered="false"
      size="small"
      segmented
      class="card-wrapper"
    >
      <NSpace>
        <NButton v-if="hasAuth('login')">has login</NButton>
        <NButton v-if="hasAuth('admin')">has admin</NButton>
        <NButton v-if="hasAuth('admin.user')">has admin.user</NButton>
      </NSpace>
    </NCard>
  </NSpace>
</template>

<style scoped></style>
