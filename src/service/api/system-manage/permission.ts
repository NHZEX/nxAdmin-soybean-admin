import { request } from '@/service/request';

export function fetchPermissionAll() {
  return request<Api.SystemManage.PermissionTree>({
    url: '/v2/admin/permission/tree',
    method: 'get',
    extractLevel: 2
  });
}

export function fetchReadPermission(id: string) {
  return request<Api.SystemManage.PermissionNodeEx>({
    url: `/v2/admin/permission/${id}`,
    method: 'get',
    extractLevel: 2
  });
}

export function fetchSavePermission(rows: Api.SystemManage.PermissionBatchUpdateParams) {
  const key = 'root';
  const result = {
    batch: true,
    list: rows
  };

  return request<null>({
    url: `/v2/admin/permission/${key}`,
    method: 'put',
    data: result,
    extractLevel: 2
  });
}

export function fetchScanPermission() {
  return request<null>({
    url: '/v2/admin/permission/scan',
    method: 'post',
    extractLevel: 2
  });
}
