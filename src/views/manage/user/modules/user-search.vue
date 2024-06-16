<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { SystemUserLegacyStatusLabel, SystemUserTypeLabel } from '@/enum/system-manage';
import { REG_STR_ASCII } from '@/constants/reg';

defineOptions({
  name: 'UserSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.SystemManage.UserSearchParams>('model', { required: true });

type RuleKey = Extract<keyof Api.SystemManage.UserSearchParams, 'username'>;

const rules = computed<Record<RuleKey, App.Global.FormRule | App.Global.FormRule[]>>(() => {
  // const { patternRules } = useFormRules(); // inside computed to make locale reactive

  return {
    username: [
      {
        type: 'string',
        max: 32,
        whitespace: true,
        trigger: 'change'
      },
      {
        pattern: REG_STR_ASCII,
        message: '输入存在不合法内容',
        trigger: 'change'
      }
    ]
  };
});

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <NCard :title="$t('common.search')" :bordered="false" size="small" class="card-wrapper">
    <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userName')" path="username" class="pr-24px">
          <NInput v-model:value="model.username" :placeholder="$t('page.manage.user.form.userName')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:3 m:3" label="用户类型" path="genre" class="pr-24px">
          <NSelect
            v-model:value="model.genre"
            placeholder="请选择用户类型"
            :options="Array.from(SystemUserTypeLabel.entries()).map(([value, label]) => ({ value, label }))"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="24 s:3 m:3" :label="$t('page.manage.user.userStatus')" path="status" class="pr-24px">
          <NSelect
            v-model:value="model.status"
            :placeholder="$t('page.manage.user.form.userStatus')"
            :options="Array.from(SystemUserLegacyStatusLabel.entries()).map(([value, label]) => ({ value, label }))"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="24 m:12" class="pr-24px">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t('common.reset') }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t('common.search') }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
