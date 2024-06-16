<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchDeleteUser, fetchUserList } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate, wrapApiFn } from '@/hooks/common/table';
import { formatUnix } from '@/utils/common';
import UserModelDialog from './modules/user-model-dialog.vue';
import UserSearch from './modules/user-search.vue';

const appStore = useAppStore();

const { columns, columnChecks, data, getData, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: wrapApiFn(fetchUserList) as typeof fetchUserList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10
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
      align: 'center',
      width: 64
    },
    {
      key: 'genre',
      title: '类型',
      align: 'center',
      width: 94,
      render: row => <span>{row.genre_desc}</span>
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 64,
      render: row => <span>{row.status_desc}</span>
    },
    {
      key: 'username',
      title: '用户名',
      align: 'center',
      minWidth: 100
    },
    {
      key: 'nickname',
      title: '昵称',
      align: 'center',
      resizable: true,
      ellipsis: {
        expandTrigger: 'click',
        lineClamp: 2
      },
      minWidth: 100
    },
    {
      key: 'roles',
      title: '角色',
      align: 'left',
      minWidth: 200,
      resizable: true,
      ellipsis: false,
      render: row => (
        <>
          <div class="flex flex-wrap content-start gap-1">
            {row.role_id > 0 && <NTag type="warning">{row.role_name}</NTag>}
            {(() => {
              if (row.roles?.length) {
                return row.roles?.map(v => <NTag type="info">{v.name}</NTag>);
              }
              return null;
            })()}
          </div>
        </>
      )
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
} = useTableOperate<Api.SystemManage.User>(data, getData);

async function handleBatchDelete() {
  // request
  console.log(checkedRowKeys.value);

  onBatchDeleted();
}

async function handleDelete(id: number) {
  // request
  const { error } = await fetchDeleteUser(id);
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
    <UserSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getData({ resetFirstPage: true })" />
    <NCard :title="$t('page.manage.user.title')" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
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
        :scroll-x="962"
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
      <UserModelDialog
        :id="editingData?.id"
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
