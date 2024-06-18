<script setup lang="ts">
import { computed, nextTick, ref, toRaw, watch } from 'vue';
import { isPlainObject } from 'lodash-es';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchRoleInfo, fetchSaveRole } from '@/service/api';
import { $t } from '@/locales';
import { CommonLegacyStatusLabel } from '@/enum/system-manage';
import PermissionTreeOptions from '@/components/manage/permission/permission-tree-options.vue';
import { useBoolean } from '~/packages/hooks';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();

type PermissionSet = Api.SystemManage.PermissionSet;

defineOptions({
  name: 'RoleModelDialog'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit object id */
  id?: number | string | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const lazyLoadState = useBoolean(false);
const loading = ref(false);

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const permissionTreeOptionsIns = ref<InstanceType<typeof PermissionTreeOptions>>();

const isCreateOperate = computed(() => props.operateType === 'add');
const isEditOperate = computed(() => props.operateType === 'edit');
const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.manage.user.addUser'),
    edit: $t('page.manage.user.editUser')
  };
  return titles[props.operateType];
});

type Model = Pick<Api.SystemManage.Role, 'name' | 'description' | 'status' | 'ext'>;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: '',
    description: '',
    status: 0
  };
}

type RuleKey = Extract<keyof Model, 'name' | 'description' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  name: defaultRequiredRule,
  description: defaultRequiredRule,
  status: defaultRequiredRule
};

const selectedPermission = computed<PermissionSet>({
  get: () => {
    return model.value.ext?.permission ?? [];
  },
  set: val => {
    if (!isPlainObject(model.value.ext)) {
      model.value.ext = {};
    }
    model.value.ext!.permission = val;
  }
});

async function getPermissionOptions() {}

async function getUserInfo() {
  if (props.operateType !== 'edit') {
    await permissionTreeOptionsIns.value?.reload();
    return;
  }
  if (props?.id === undefined || props.id === null) {
    console.warn('missing id');
    return;
  }

  const { data, error } = await fetchRoleInfo(props.id);

  if (error) {
    console.warn('get user info error', error);
    return;
  }

  Object.assign(model.value, data);
  await nextTick(async () => await permissionTreeOptionsIns.value?.reload());
}

function handleInitModel() {
  model.value = createDefaultModel();
}

function onClose() {
  // 重置加载状态
  loading.value = false;
}

function closeModel() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  loading.value = true;

  const form = structuredClone(toRaw(model.value));

  const { error } = await fetchSaveRole(isEditOperate.value ? props.id! : null, form);
  loading.value = false;
  if (!error) {
    window.$message!.success('更新成功');
    closeModel();
    emit('submitted');
  }
}

watch(visible, () => {
  if (visible.value) {
    lazyLoadState.setTrue();
    handleInitModel();
    restoreValidation();

    loading.value = true;
    nextTick(async () => {
      await Promise.all([getPermissionOptions(), getUserInfo()]).finally(() => {
        loading.value = false;
      });
    });
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="dialog"
    :style="{
      width: '800px'
    }"
    :title="title"
    :show-icon="false"
    :mask-closable="false"
    :on-before-leave="onClose"
  >
    <NSpin :show="loading">
      <NForm ref="formRef" :model="model" :rules="rules">
        <NSplit
          :direction="appStore.isMobile ? 'vertical' : 'horizontal'"
          :size="appStore.isMobile ? '160px' : '260px'"
          min="160px"
          max="300px"
          :disabled="true"
        >
          <template #1>
            <div
              :class="{
                'h-full': !appStore.isMobile,
                'border-r-2': !appStore.isMobile,
                'pr-2': !appStore.isMobile
              }"
            >
              <NFormItem :label="$t('page.manage.role.roleName')" path="name">
                <NInput v-model:value.trim="model.name" :placeholder="$t('page.manage.role.form.roleName')" />
              </NFormItem>
              <NFormItem :label="$t('page.manage.role.roleStatus')" path="status">
                <NRadioGroup v-model:value="model.status">
                  <NRadio
                    v-for="[value, label] in CommonLegacyStatusLabel"
                    :key="value"
                    :value="value"
                    :label="label"
                  />
                </NRadioGroup>
              </NFormItem>
            </div>
          </template>
          <template #2>
            <NFormItem v-if="lazyLoadState.bool" label="权限列表" class="pl-2">
              <PermissionTreeOptions
                ref="permissionTreeOptionsIns"
                v-model:permission="selectedPermission"
                :create-mode="isCreateOperate"
                class="w-100%"
              ></PermissionTreeOptions>
            </NFormItem>
          </template>
        </NSplit>
      </NForm>
    </NSpin>
    <template #action>
      <NSpace :size="16">
        <NButton :disabled="loading" @click="closeModel">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
