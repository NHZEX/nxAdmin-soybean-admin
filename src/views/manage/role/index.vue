<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchDeleteRole, fetchRoleList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate, wrapApiFn } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatUnix } from '@/utils/common';
import RoleModelDialog from '@/views/manage/role/modules/role-model-dialog.vue';
import { toTabTypeByCommonLegacyStatus } from '@/enum/system-manage';
import RoleSearch from './modules/role-search.vue';

const appStore = useAppStore();

const { columns, columnChecks, data, loading, getData, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: wrapApiFn(fetchRoleList) as typeof fetchRoleList,
  apiParams: {
    current: 1,
    size: 10,
    // if you want to use the searchParams in Form, you need to define the following properties, and the value is null
    // the value can not be undefined, otherwise the property in Form will not be reactive
    name: null,
    status: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'id',
      title: 'ID',
      width: 64,
      align: 'center'
    },
    {
      key: 'status',
      title: $t('page.manage.role.roleStatus'),
      align: 'center',
      width: 100,
      render: row => {
        const typeMap = toTabTypeByCommonLegacyStatus(row.status);
        return <NTag type={typeMap}>{row.status_desc}</NTag>;
      }
    },
    {
      key: 'name',
      title: $t('page.manage.role.roleName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'description',
      title: $t('page.manage.role.roleDesc'),
      minWidth: 120
    },
    {
      key: '_dateInfo',
      title: '编辑时间',
      align: 'left',
      width: 220,
      render: row => (
        <ul>
          <li>
            <label>创建：</label>
            {formatUnix(row.create_time)}
          </li>
          <li>
            <label>更新：</label>
            {formatUnix(row.update_time)}
          </li>
        </ul>
      )
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 130,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small">
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
  // closeDrawer
} = useTableOperate(data, getData);

async function handleBatchDelete() {
  // request
  console.log(checkedRowKeys.value);

  onBatchDeleted();
}

async function handleDelete(id: number) {
  const { error } = await fetchDeleteRole(id);
  if (!error) {
    await onDeleted();
  }
}

function edit(id: number) {
  handleEdit(id);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getData({ resetFirstPage: true })" />
    <NCard :title="$t('page.manage.role.title')" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :show-batch-delete="false"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="702"
        :loading="loading"
        bordered
        :striped="false"
        :single-column="false"
        :single-line="false"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <RoleModelDialog
        :id="editingData?.id"
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
