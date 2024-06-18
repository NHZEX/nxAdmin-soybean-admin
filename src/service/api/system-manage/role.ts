import { request } from '@/service/request';

export function fetchRoleList(params?: Api.SystemManage.RoleSearchParams) {
  return request<Api.SystemManage.RoleList>({
    url: '/v2/admin/roles',
    method: 'get',
    params
  });
}

export function fetchRoleOptions() {
  return request<Api.SystemManage.RoleOption[]>({
    url: '/v2/admin/roles/select',
    method: 'get',
    extractLevel: 2
  });
}

export function fetchRoleInfo(id: CommonType.RecordPrimaryKey) {
  return request<Api.SystemManage.Role>({
    url: `/v2/admin/roles/${id}`,
    method: 'get',
    extractLevel: 2
  });
}

export function fetchSaveRole(id: CommonType.RecordPrimaryKey | null, params: Partial<Api.SystemManage.User>) {
  if (id) {
    return request<Api.SystemManage.Role>({
      url: `/v2/admin/roles/${id}`,
      method: 'put',
      data: params,
      extractLevel: 2
    });
  }
  return request<Api.SystemManage.Role>({
    url: `/v2/admin/roles`,
    method: 'post',
    data: params,
    extractLevel: 2
  });
}

export function fetchDeleteRole(id: CommonType.RecordPrimaryKey) {
  return request({
    url: `/v2/admin/roles/${id}`,
    method: 'delete',
    extractLevel: 2
  });
}
