<script setup lang="tsx">
import { computed, onMounted, ref, watch } from 'vue';
import type { TreeOption } from 'naive-ui';
import { usePermissionTree } from '@/hooks/manage/permission-tree';
import style from './permission-tree-options.module.css';

type PermissionSet = Api.SystemManage.PermissionSet;

defineOptions({
  name: 'PermissionTreeOptions'
});

interface Props {
  createMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  createMode: false
});

const permissionSet = defineModel<PermissionSet>('permission', { required: true });
const initialPermissionSet = ref<PermissionSet | null>(null);

const loading = ref(false);

const permissionTreeService = usePermissionTree({
  enableMountedLoader: false
});
watch(permissionSet, value => {
  if (initialPermissionSet.value === null) {
    if (Array.isArray(value)) {
      initialPermissionSet.value = value.sort((a, b) => a.localeCompare(b));
    } else {
      initialPermissionSet.value = null;
    }
  }
});

const initialPermissionKeysSet = computed<{
  leafKeys: Set<string>;
  parentKeys: Set<string>;
  keys: Set<string>;
}>(() => {
  const leafKeys = new Set<string>();
  const parentKeys = new Set<string>();
  const keys = new Set<string>();

  if (Array.isArray(initialPermissionSet.value)) {
    for (const key of initialPermissionSet.value) {
      const node = permissionTreeService.nodes.value.get(key);
      if (!node) {
        continue;
      }
      if ((node.children?.length ?? 0) > 0) {
        parentKeys.add(key);
      } else {
        leafKeys.add(key);
      }
      keys.add(key);
    }
  }

  return {
    leafKeys,
    parentKeys,
    keys
  };
});

const treeData = permissionTreeService.treeData;
const editCheckedKeysSet = ref<string[] | null>(null);
const editIndeterminateKeysSet = ref<string[] | null>(null);

const mixedCheckedKeysSet = computed<string[]>({
  get() {
    if (editCheckedKeysSet.value === null) {
      return Array.from(initialPermissionKeysSet.value.leafKeys.values());
    }
    return editCheckedKeysSet.value;
  },
  set(value) {
    editCheckedKeysSet.value = value;
  }
});
const mixedIndeterminateKeysSet = computed<string[]>({
  get() {
    if (editIndeterminateKeysSet.value === null) {
      return Array.from(initialPermissionKeysSet.value.parentKeys.values());
    }
    return editIndeterminateKeysSet.value;
  },
  set(value) {
    editIndeterminateKeysSet.value = value;
  }
});

const mixedCurrentKeysSet = computed<PermissionSet>(() => {
  return [...mixedCheckedKeysSet.value, ...mixedIndeterminateKeysSet.value].sort((a, b) => a.localeCompare(b));
});

watch(mixedCurrentKeysSet, value => {
  permissionSet.value = value;
});

const defaultExpandedKeys = computed(() => {
  return treeData.value.map(d => d.name);
});

const expandTouchFlag = ref<number>(0);

function reset() {
  expandTouchFlag.value = 1;
  if (props.createMode) {
    editCheckedKeysSet.value = [];
    editIndeterminateKeysSet.value = [];
  } else {
    editCheckedKeysSet.value = null;
    editIndeterminateKeysSet.value = null;
  }
}

async function reload() {
  reset();
  loading.value = true;
  try {
    await permissionTreeService.reload();
  } finally {
    loading.value = false;
  }
}

function matchNodeStatusClass(key: string, checked: boolean): string {
  const indeterminate = mixedIndeterminateKeysSet.value.includes(key);
  const initialChecked = initialPermissionKeysSet.value.keys.has(key);
  if (initialChecked) {
    if (indeterminate) {
      return style.nodeHalfChecked;
    } else if (checked) {
      return style.nodeChecked;
    }
    return style.cancelChecked;
  }
  if (indeterminate || checked) {
    return style.appendChecked;
  }
  return '';
}

const renderLabel = (info: { option: TreeOption; checked: boolean; selected: boolean }) => {
  return (
    <span
      class={{
        [matchNodeStatusClass(info.option.name as string, info.checked)]: true
      }}
    >
      {info.option.name} ({info.option.desc})
    </span>
  );
};

onMounted(() => {});

defineExpose({
  reload
});
</script>

<template>
  <NTree
    v-model:checked-keys="mixedCheckedKeysSet"
    v-model:indeterminate-keys="mixedIndeterminateKeysSet"
    block-line
    :data="treeData"
    key-field="name"
    label-field="desc"
    children-field="children"
    :default-expanded-keys="defaultExpandedKeys"
    expand-on-click
    show-line
    cascade
    checkable
    :selectable="false"
    :render-label="renderLabel"
  />
</template>

<style scoped></style>
