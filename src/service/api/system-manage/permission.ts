import { request } from '@/service/request';

export function fetchPermissionAll() {
  return request<Api.SystemManage.PermissionTree>({
    url: '/v2/admin/permission/tree',
    method: 'get',
    extractLevel: 2
  });
}
