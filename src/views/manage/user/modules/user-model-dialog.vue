<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchRoleOptions, fetchSaveUser, fetchUserInfo } from '@/service/api';
import { $t } from '@/locales';
import { SystemUserLegacyStatusLabel, SystemUserType, SystemUserTypeLabel } from '@/enum/system-manage';

defineOptions({
  name: 'UserOperateDrawer'
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

const loading = ref(false);

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const isCreateOperate = computed(() => props.operateType === 'add');
const isEditOperate = computed(() => props.operateType === 'edit');
const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.manage.user.addUser'),
    edit: $t('page.manage.user.editUser')
  };
  return titles[props.operateType];
});

type Model = Pick<Api.SystemManage.User, 'username' | 'nickname' | 'genre' | 'status' | 'role_ids'> & {
  password?: string;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    username: '',
    nickname: '',
    password: '',
    role_ids: [],
    genre: SystemUserType.OPERATOR,
    status: 0
  };
}

type RuleKey = Extract<keyof Model, 'username' | 'nickname' | 'genre' | 'password' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  genre: defaultRequiredRule,
  username: defaultRequiredRule,
  nickname: defaultRequiredRule,
  password: defaultRequiredRule,
  status: defaultRequiredRule
};

/** the enabled role options */
const roleOptions = ref<Api.SystemManage.RoleOption[]>([]);

async function getRoleOptions() {
  const { error, data } = await fetchRoleOptions();

  if (error) {
    return;
  }

  roleOptions.value = data;
}

async function getUserInfo() {
  if (props.operateType !== 'edit') {
    return;
  }
  if (props?.id === undefined || props.id === null) {
    console.warn('missing id');
    return;
  }

  const { data, error } = await fetchUserInfo(props.id);

  if (error) {
    console.warn('get user info error', error);
    return;
  }

  // 多角色迁移兼容性解决方案
  if (data?.role_id > 0) {
    if (!data?.role_ids.includes(data.role_id)) {
      console.warn('missing role_id');
      data?.role_ids.push(data!.role_id);
    }
  }

  Object.assign(model.value, data);
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
  if (isEditOperate.value) {
    delete form.password;
  }

  const { error } = await fetchSaveUser(isEditOperate.value ? props.id! : null, form);
  loading.value = false;
  if (!error) {
    window.$message!.success('更新成功');
    closeModel();
    emit('submitted');
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();

    loading.value = true;
    Promise.all([getRoleOptions(), getUserInfo()]).finally(() => {
      loading.value = false;
    });
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="dialog"
    width="600px"
    :title="title"
    :show-icon="false"
    :mask-closable="false"
    :on-before-leave="onClose"
  >
    <NSpin :show="loading">
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="用户类型" path="genre">
          <NRadioGroup v-model:value="model.genre" :disabled="isEditOperate">
            <NRadio v-for="[value, label] in SystemUserTypeLabel" :key="value" :value="value" :label="label" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userName')" path="username">
          <NInput
            v-model:value="model.username"
            :placeholder="$t('page.manage.user.form.userName')"
            :readonly="isEditOperate"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.nickName')" path="nickname">
          <NInput v-model:value="model.nickname" :placeholder="$t('page.manage.user.form.nickName')" />
        </NFormItem>
        <template v-if="isCreateOperate">
          <NFormItem label="密码" path="password">
            <NInput v-model:value.trim="model.password" type="password" placeholder="输入创建用户密码" />
          </NFormItem>
        </template>
        <NFormItem :label="$t('page.manage.user.userStatus')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="[value, label] in SystemUserLegacyStatusLabel" :key="value" :value="value" :label="label" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userRole')" path="role_ids">
          <NSelect
            v-model:value="model.role_ids"
            multiple
            :options="roleOptions"
            :placeholder="$t('page.manage.user.form.userRole')"
          />
        </NFormItem>
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
