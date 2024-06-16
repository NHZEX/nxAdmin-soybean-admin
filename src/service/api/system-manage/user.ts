import { request } from '@/service/request';

/** get user list */
export function fetchUserList(params?: Api.SystemManage.UserSearchParams) {
  return request<Api.SystemManage.UserList>({
    url: '/v2/admin/users',
    method: 'get',
    params
  });
}

export function fetchUserInfo(id: CommonType.RecordPrimaryKey) {
  return request<Api.SystemManage.User>({
    url: `/v2/admin/users/${id}`,
    method: 'get',
    extractLevel: 2
  });
}

export function fetchSaveUser(id: CommonType.RecordPrimaryKey | null, params: Partial<Api.SystemManage.User>) {
  if (id) {
    return request<Api.SystemManage.User>({
      url: `/v2/admin/users/${id}`,
      method: 'put',
      data: params,
      extractLevel: 2
    });
  }
  return request<Api.SystemManage.User>({
    url: `/v2/admin/users`,
    method: 'post',
    data: params,
    extractLevel: 2
  });
}

export function fetchDeleteUser(id: CommonType.RecordPrimaryKey) {
  return request({
    url: `/v2/admin/users/${id}`,
    method: 'delete',
    extractLevel: 2
  });
}
