import { request } from '../request';

/** get role list */
export function fetchGetRoleList(params?: Api.SystemManage.RoleSearchParams) {
  return request<Api.SystemManage.RoleList>({
    url: '/systemManage/getRoleList',
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

/**
 * get all roles
 *
 * these roles are all enabled
 */
export function fetchGetAllRoles() {
  return request<Api.SystemManage.AllRole[]>({
    url: '/systemManage/getAllRoles',
    method: 'get'
  });
}

/** get user list */
export function fetchGetUserList(params?: Api.SystemManage.UserSearchParams) {
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

/** get menu list */
export function fetchGetMenuList() {
  return request<Api.SystemManage.MenuList>({
    url: '/systemManage/getMenuList/v2',
    method: 'get'
  });
}

/** get all pages */
export function fetchGetAllPages() {
  return request<string[]>({
    url: '/systemManage/getAllPages',
    method: 'get'
  });
}

/** get menu tree */
export function fetchGetMenuTree() {
  return request<Api.SystemManage.MenuTree[]>({
    url: '/systemManage/getMenuTree',
    method: 'get'
  });
}
