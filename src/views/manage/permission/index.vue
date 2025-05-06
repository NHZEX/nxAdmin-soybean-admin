<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from 'vue';
import {
  fetchPermissionAll,
  fetchReadPermission,
  fetchResetCache,
  fetchSavePermission,
  fetchScanPermission
} from '@/service/api';
import { useAuth } from '@/hooks/business/auth';

const treeRef = useTemplateRef('tree');
const { hasAuth } = useAuth();

type PermissionNode = Api.SystemManage.PermissionNodeEx;
type PermissionNodeWithControl = Omit<PermissionNode, 'children'> & {
  children?: PermissionNodeWithControl[];
  showChildren?: boolean;
  control: {
    loading: boolean;
    open: boolean;
    data: PermissionNode['allow'];
  };
};

const loading = reactive({
  render: false,
  scan: false,
  reset: false
});
const data = ref<PermissionNodeWithControl[]>([]);
const isChange = ref(false);

const auths = computed(() => {
  return {
    permissionScan: hasAuth('admin.permission.scan'),
    permissionEdit: hasAuth('admin.permission.edit'),
    resetCache: hasAuth('admin.resetCache')
  };
});

function recursionTree(d: PermissionNodeWithControl[]) {
  return d.map(el => {
    el.control = {
      loading: false,
      open: false,
      data: []
    };
    if (el.children && el.children.length) {
      el.showChildren = true;
      el.children = recursionTree(el.children);
    }
    return el;
  });
}

async function load() {
  isChange.value = false;
  loading.render = true;
  const { data: d, error } = await fetchPermissionAll();
  loading.render = false;
  if (error) {
    return;
  }
  data.value = recursionTree(d as PermissionNodeWithControl[]);
  await nextTick();
  treeRef.value?.setTreeExpand(data.value, true);
}

async function scan() {
  loading.scan = true;
  await fetchScanPermission();
  loading.scan = false;
  await load();
}

async function saveChange() {
  loading.render = true;
  const rows: Api.SystemManage.PermissionBatchUpdateParams = {};
  for (const row of treeRef.value?.getUpdateRecords() ?? []) {
    rows[row.name as string] = {
      sort: row.sort,
      desc: row.desc
    };
  }
  await fetchSavePermission(rows);
  loading.render = true;
  await load();
}

async function resetCache() {
  loading.reset = true;
  await fetchResetCache();
  loading.reset = false;
  window.$message?.success('重置缓存完成');
}

function editClosed() {
  const rows = treeRef.value?.getUpdateRecords() ?? [];
  isChange.value = rows.length > 0;
}
function permissionView(row: PermissionNodeWithControl) {
  treeRef.value?.toggleRowExpand(row);
}
function toggleRowExpand({ expanded, row }: { expanded: boolean; row: PermissionNodeWithControl }) {
  row.control.open = expanded;
}
async function loadContentMethod({ row }: { row: PermissionNodeWithControl }) {
  row.control.loading = true;
  row.control.open = true;
  row.control.data = [];
  try {
    const { data: result } = await fetchReadPermission(row.name);
    if (result) {
      row.control.data = result.allow;
    }
  } finally {
    row.control.loading = false;
  }
}

onMounted(() => {
  load();
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <div class="mb-10px space-x-2">
      <NButton type="primary" :loading="loading.render" @click="load">刷新</NButton>
      <NButton
        v-if="auths.permissionScan"
        type="warning"
        :loading="loading.scan || loading.render"
        icon="el-icon-s-opportunity"
        @click="scan()"
      >
        扫描权限
      </NButton>
      <NButton
        v-if="auths.permissionEdit"
        type="success"
        :loading="loading.render"
        :disabled="!isChange"
        icon="el-icon-upload"
        @click="saveChange()"
      >
        保存更改
      </NButton>
      <NButton
        v-if="auths.resetCache"
        type="warning"
        :loading="loading.reset"
        icon="el-icon-refresh-right"
        @click="resetCache()"
      >
        重置缓存
      </NButton>
    </div>
    <div class="h-full w-full">
      <VxeGrid
        ref="tree"
        show-overflow
        :row-config="{
          keyField: 'name',
          useKey: true
        }"
        :keep-source="true"
        height="auto"
        :loading="loading.render"
        :columns="[
          { type: 'expand', visible: false, slots: { content: 'expand' } },
          { title: '权限', field: 'title', treeNode: true, width: 350 },
          {
            title: '排序',
            field: 'sort',
            width: 130,
            slots: { default: 'sort' },
            editRender: {
              name: 'input',
              attrs: { type: 'text' }
            }
          },
          {
            title: '注释',
            field: 'desc',
            minWidth: 150,
            slots: { default: 'desc' },
            editRender: {
              name: 'input',
              attrs: { type: 'text' }
            }
          },
          { title: '查看', minWidth: 80, slots: { default: 'action' } }
        ]"
        :data="data"
        :tree-config="{ childrenField: 'children' }"
        :edit-config="{ trigger: 'dblclick', mode: 'row', autoClear: true, showStatus: true }"
        :expand-config="{ accordion: true, lazy: true, loadMethod: loadContentMethod }"
        @edit-closed="editClosed"
        @toggle-row-expand="toggleRowExpand"
      >
        <template #sort="{ row, column }">
          <i class="el-icon-edit" />
          <span style="color: #515a6e">&nbsp;{{ row[column.property] }}</span>
        </template>
        <template #desc="{ row, column }">
          <i class="el-icon-edit" />
          <span style="color: #515a6e">&nbsp;{{ row[column.property] ? row[column.property] : '[无注释]' }}</span>
        </template>
        <template #action="{ row }">
          <NButton type="info" size="small" :loading="row.control.loading" @click="permissionView(row)">
            查看节点
          </NButton>
        </template>
        <template #expand="{ row }">
          <VxeGrid
            :columns="[
              { title: '节点', field: 'name', width: 280 },
              { title: '注释', field: 'desc' }
            ]"
            :data="row.control.data"
            max-height="350px"
          ></VxeGrid>
        </template>
      </VxeGrid>
    </div>
  </div>
</template>

<style scoped></style>
